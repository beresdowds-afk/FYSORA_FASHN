#!/usr/bin/env node
/**
 * Security scan importer + CI gate.
 *
 * Responsibilities:
 *   1. Read every *.json file in $SCAN_DIR (default ./security-scans).
 *   2. Normalize each scanner's shape to a common Finding:
 *        { id, scanner, severity, title, description, resource, fingerprint }
 *      Handles:
 *        - Wiz JSON exports (connector_security_scan / wiz_issues)
 *        - Supabase database linter
 *        - Generic { findings: [...] } / { issues: [...] } / { results: [...] }
 *   3. Deduplicate similar findings across runs via a stable fingerprint:
 *        sha1(scanner|severity|normalized_title|resource)
 *   4. Compare against $BASELINE_FILE (security-scans/baseline.json).
 *      Fails (exit 1) when there is at least one NEW finding whose severity
 *      is >= $FAIL_ON_SEVERITY (default "high"). Existing findings already
 *      present in the baseline are ignored (so the gate only blocks
 *      regressions, not pre-existing debt).
 *
 * Usage in CI:
 *   node scripts/check-security-findings.mjs
 *
 * Update the baseline after intentional acceptance:
 *   node scripts/check-security-findings.mjs --write-baseline
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";

const SCAN_DIR = resolve(process.env.SCAN_DIR || "./security-scans");
const BASELINE_FILE = resolve(process.env.BASELINE_FILE || join(SCAN_DIR, "baseline.json"));
const FAIL_ON_SEVERITY = (process.env.FAIL_ON_SEVERITY || "high").toLowerCase();
const WRITE_BASELINE = process.argv.includes("--write-baseline");

const SEVERITY_RANK = { info: 0, low: 1, medium: 2, moderate: 2, high: 3, critical: 4 };
const sevRank = (s) => SEVERITY_RANK[(s || "").toLowerCase()] ?? 0;
const FAIL_RANK = sevRank(FAIL_ON_SEVERITY);

function fingerprint(f) {
  const norm = `${f.scanner}|${(f.severity || "").toLowerCase()}|${(f.title || "").toLowerCase().replace(/\s+/g, " ").trim()}|${f.resource || ""}`;
  return createHash("sha1").update(norm).digest("hex");
}

function normalizeWiz(item) {
  const sev = item.severity || item.Severity || item.riskLevel;
  return {
    id: item.id || item.issueId,
    scanner: "wiz",
    severity: String(sev || "info").toLowerCase(),
    title: item.title || item.name || item.ruleName || "Wiz finding",
    description: item.description || item.summary || "",
    resource: item.resource?.name || item.resourceId || item.entity || "",
  };
}

function normalizeSupabaseLinter(item) {
  return {
    id: item.cache_key || item.name,
    scanner: "supabase_linter",
    severity: (item.level || "warn").toLowerCase() === "error" ? "high" : "medium",
    title: item.title || item.name || "Supabase linter",
    description: item.description || item.detail || "",
    resource: item.metadata?.table || item.metadata?.schema || "",
  };
}

function normalizeGeneric(item, scanner = "generic") {
  return {
    id: item.id || item.uid || item.key,
    scanner: item.scanner || item.source || scanner,
    severity: String(item.severity || item.level || "info").toLowerCase(),
    title: item.title || item.name || item.rule || "Finding",
    description: item.description || item.message || "",
    resource: item.resource || item.target || item.location || "",
  };
}

function extractFromFile(path) {
  const raw = JSON.parse(readFileSync(path, "utf8"));
  const fname = path.toLowerCase();
  const arr = Array.isArray(raw) ? raw : raw.findings || raw.issues || raw.results || raw.data || [];

  if (fname.includes("wiz") || raw.scanner === "wiz" || raw.connector === "wiz") {
    return arr.map(normalizeWiz);
  }
  if (fname.includes("supabase") || fname.includes("linter")) {
    return arr.map(normalizeSupabaseLinter);
  }
  // connector_security_scan exports list a generic envelope around vendor findings
  if (fname.includes("connector_security_scan")) {
    return arr.map((it) => {
      if ((it.connector || "").toLowerCase() === "wiz") return normalizeWiz(it.finding || it);
      return normalizeGeneric(it.finding || it, it.connector || "connector_security_scan");
    });
  }
  return arr.map((it) => normalizeGeneric(it));
}

function loadAll() {
  if (!existsSync(SCAN_DIR)) {
    console.log(`[security-gate] No scan dir at ${SCAN_DIR}, nothing to check.`);
    return [];
  }
  const files = readdirSync(SCAN_DIR).filter((f) => f.endsWith(".json") && f !== "baseline.json");
  if (files.length === 0) {
    console.log(`[security-gate] No scan files found in ${SCAN_DIR}.`);
    return [];
  }

  const seen = new Map();
  for (const f of files) {
    const full = join(SCAN_DIR, f);
    let items;
    try { items = extractFromFile(full); }
    catch (e) { console.warn(`[security-gate] Skipped ${f}: ${e.message}`); continue; }
    for (const it of items) {
      const fp = fingerprint(it);
      // dedupe: keep highest severity occurrence
      const prev = seen.get(fp);
      if (!prev || sevRank(it.severity) > sevRank(prev.severity)) {
        seen.set(fp, { ...it, fingerprint: fp });
      }
    }
  }
  return [...seen.values()];
}

function loadBaseline() {
  if (!existsSync(BASELINE_FILE)) return new Set();
  try {
    const data = JSON.parse(readFileSync(BASELINE_FILE, "utf8"));
    return new Set((data.accepted || []).map((f) => f.fingerprint).filter(Boolean));
  } catch { return new Set(); }
}

function writeBaseline(findings) {
  mkdirSync(SCAN_DIR, { recursive: true });
  writeFileSync(BASELINE_FILE, JSON.stringify({
    generated_at: new Date().toISOString(),
    accepted: findings.map((f) => ({ fingerprint: f.fingerprint, scanner: f.scanner, severity: f.severity, title: f.title })),
  }, null, 2));
  console.log(`[security-gate] Wrote baseline with ${findings.length} accepted findings to ${BASELINE_FILE}`);
}

const findings = loadAll();
console.log(`[security-gate] Normalized ${findings.length} unique findings across scanners.`);

if (WRITE_BASELINE) { writeBaseline(findings); process.exit(0); }

const baseline = loadBaseline();
const newBlocking = findings.filter((f) => sevRank(f.severity) >= FAIL_RANK && !baseline.has(f.fingerprint));

if (newBlocking.length > 0) {
  console.error(`\n❌ Security gate FAILED: ${newBlocking.length} new ${FAIL_ON_SEVERITY}+ finding(s) detected.\n`);
  for (const f of newBlocking) {
    console.error(`  [${f.severity.toUpperCase()}] (${f.scanner}) ${f.title}${f.resource ? ` — ${f.resource}` : ""}`);
  }
  console.error(`\nIf intentional, run: node scripts/check-security-findings.mjs --write-baseline`);
  process.exit(1);
}

console.log(`✅ Security gate passed (threshold=${FAIL_ON_SEVERITY}, baseline=${baseline.size}).`);