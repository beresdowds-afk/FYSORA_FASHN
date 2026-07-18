# FASHN AI — companion client (`src/lib/fashn.server.ts`)

Real endpoints (base `https://api.fashn.ai/v1`):

| Method    | HTTP   | Path                    |
| --------- | ------ | ----------------------- |
| `run`     | POST   | `/run`                  |
| `status`  | GET    | `/status/{prediction_id}` |
| `cancel`  | POST   | `/cancel/{prediction_id}` |
| `credits` | GET    | `/credits`              |

All authenticated with `Authorization: Bearer ${FASHN_API_KEY}` and
`Content-Type: application/json` (on POST).

---

## `src/lib/fashn.server.ts`

```ts
// SERVER ONLY — never import from client code.
// Reads FASHN_API_KEY and FASHN_BASE_URL from env.

const DEFAULT_BASE_URL = "https://api.fashn.ai/v1";

export type FashnStatus =
  | "starting"
  | "in_queue"
  | "processing"
  | "completed"
  | "failed"
  | "canceled";

export interface FashnRunInput {
  model_image: string;
  garment_image: string;
  category?: "auto" | "tops" | "bottoms" | "one-pieces";
  mode?: "performance" | "balanced" | "quality";
  model_name?: string; // e.g. "tryon-v1.6", "product-to-model"
  nsfw_filter?: boolean;
  cover_feet?: boolean;
  adjust_hands?: boolean;
  restore_background?: boolean;
  restore_clothes?: boolean;
  flat_lay?: boolean;
  long_top?: boolean;
  seed?: number;
  num_samples?: number;
  output_format?: "png" | "jpeg";
}

export interface FashnRunResponse {
  id: string;
  status: FashnStatus;
}

export interface FashnStatusResponse {
  id: string;
  status: FashnStatus;
  output?: string[] | null;
  error?: { name?: string; message?: string } | string | null;
}

export interface FashnCreditsResponse {
  credits: { total: number; subscription?: number; on_demand?: number };
}

export class FashnError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly method: string,
    public readonly url: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "FashnError";
  }
}

interface ClientOptions {
  apiKey?: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  logger?: (event: LogEvent) => void;
}

interface LogEvent {
  ts: string;
  method: string;
  url: string;
  status?: number;
  duration_ms: number;
  ok: boolean;
  error?: string;
}

function defaultLogger(e: LogEvent) {
  // Structured JSON line — friendly to log aggregators.
  // eslint-disable-next-line no-console
  console[e.ok ? "info" : "error"](JSON.stringify({ scope: "fashn", ...e }));
}

export function createFashnClient(opts: ClientOptions = {}) {
  const apiKey = opts.apiKey ?? process.env.FASHN_API_KEY;
  const baseUrl = (opts.baseUrl ?? process.env.FASHN_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, "");
  const doFetch = opts.fetchImpl ?? fetch;
  const log = opts.logger ?? defaultLogger;

  if (!apiKey) throw new Error("FASHN_API_KEY is not configured");

  async function request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    const url = `${baseUrl}${path}`;
    const started = Date.now();
    try {
      const res = await doFetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      const duration_ms = Date.now() - started;
      const text = await res.text();
      const parsed = text ? safeJson(text) : null;
      log({ ts: new Date().toISOString(), method, url, status: res.status, duration_ms, ok: res.ok });
      if (!res.ok) {
        throw new FashnError(
          `FASHN ${method} ${path} failed (${res.status})`,
          res.status,
          method,
          url,
          parsed ?? text,
        );
      }
      return parsed as T;
    } catch (err) {
      if (err instanceof FashnError) throw err;
      const duration_ms = Date.now() - started;
      const message = err instanceof Error ? err.message : String(err);
      log({ ts: new Date().toISOString(), method, url, duration_ms, ok: false, error: message });
      throw new FashnError(`FASHN ${method} ${path} network error: ${message}`, 0, method, url);
    }
  }

  return {
    baseUrl,
    run: (input: FashnRunInput) => request<FashnRunResponse>("POST", "/run", input),
    status: (predictionId: string) =>
      request<FashnStatusResponse>("GET", `/status/${encodeURIComponent(predictionId)}`),
    cancel: (predictionId: string) =>
      request<{ id: string; status: FashnStatus }>(
        "POST",
        `/cancel/${encodeURIComponent(predictionId)}`,
      ),
    credits: () => request<FashnCreditsResponse>("GET", "/credits"),

    /**
     * Poll `status` until terminal or timeout. Exponential backoff, capped.
     */
    async waitForCompletion(
      predictionId: string,
      { timeoutMs = 120_000, initialDelayMs = 1_500, maxDelayMs = 10_000 } = {},
    ): Promise<FashnStatusResponse> {
      const deadline = Date.now() + timeoutMs;
      let delay = initialDelayMs;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const s = await this.status(predictionId);
        if (s.status === "completed" || s.status === "failed" || s.status === "canceled") return s;
        if (Date.now() + delay > deadline) {
          throw new FashnError(
            `FASHN prediction ${predictionId} timed out after ${timeoutMs}ms`,
            408,
            "GET",
            `${baseUrl}/status/${predictionId}`,
          );
        }
        await new Promise((r) => setTimeout(r, delay));
        delay = Math.min(maxDelayMs, Math.round(delay * 1.7));
      }
    },
  };
}

function safeJson(text: string): unknown {
  try { return JSON.parse(text); } catch { return text; }
}

export type FashnClient = ReturnType<typeof createFashnClient>;
```

---

## `src/lib/fashn.server.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createFashnClient, FashnError } from "./fashn.server";

function mockFetch(response: Partial<Response> & { body?: unknown; status?: number; ok?: boolean }) {
  const status = response.status ?? 200;
  return vi.fn(async (input: RequestInfo, init?: RequestInit) => {
    (mockFetch as any).lastCall = { url: String(input), init };
    return {
      ok: response.ok ?? status < 400,
      status,
      text: async () => (response.body ? JSON.stringify(response.body) : ""),
    } as Response;
  });
}

describe("FASHN client", () => {
  beforeEach(() => { process.env.FASHN_API_KEY = "test-key"; });

  it("run() → POST /run with bearer + JSON body", async () => {
    const f = mockFetch({ body: { id: "abc", status: "starting" } });
    const c = createFashnClient({ fetchImpl: f as any, logger: () => {} });
    const r = await c.run({ model_image: "m", garment_image: "g" });
    const call = (f as any).lastCall;
    expect(call.url).toBe("https://api.fashn.ai/v1/run");
    expect(call.init.method).toBe("POST");
    expect(call.init.headers.Authorization).toBe("Bearer test-key");
    expect(call.init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(call.init.body).model_image).toBe("m");
    expect(r.id).toBe("abc");
  });

  it("status() → GET /status/{id}", async () => {
    const f = mockFetch({ body: { id: "abc", status: "completed", output: ["u"] } });
    const c = createFashnClient({ fetchImpl: f as any, logger: () => {} });
    await c.status("abc");
    expect((f as any).lastCall.url).toBe("https://api.fashn.ai/v1/status/abc");
    expect((f as any).lastCall.init.method).toBe("GET");
  });

  it("cancel() → POST /cancel/{id}", async () => {
    const f = mockFetch({ body: { id: "abc", status: "canceled" } });
    const c = createFashnClient({ fetchImpl: f as any, logger: () => {} });
    await c.cancel("abc");
    expect((f as any).lastCall.url).toBe("https://api.fashn.ai/v1/cancel/abc");
    expect((f as any).lastCall.init.method).toBe("POST");
  });

  it("credits() → GET /credits", async () => {
    const f = mockFetch({ body: { credits: { total: 42 } } });
    const c = createFashnClient({ fetchImpl: f as any, logger: () => {} });
    const r = await c.credits();
    expect((f as any).lastCall.url).toBe("https://api.fashn.ai/v1/credits");
    expect(r.credits.total).toBe(42);
  });

  it("honours FASHN_BASE_URL override", async () => {
    const f = mockFetch({ body: { credits: { total: 0 } } });
    const c = createFashnClient({ baseUrl: "https://staging.fashn.ai/v2", fetchImpl: f as any, logger: () => {} });
    await c.credits();
    expect((f as any).lastCall.url).toBe("https://staging.fashn.ai/v2/credits");
  });

  it("throws FashnError with status on non-2xx", async () => {
    const f = mockFetch({ status: 402, body: { error: "insufficient credits" } });
    const c = createFashnClient({ fetchImpl: f as any, logger: () => {} });
    await expect(c.run({ model_image: "m", garment_image: "g" })).rejects.toBeInstanceOf(FashnError);
  });
});
```

---

## Env vars to add in the companion project

```
FASHN_API_KEY=fa-...           # required
FASHN_BASE_URL=https://api.fashn.ai/v1   # optional override (staging, proxy, etc.)
```

Delete every hardcoded `https://api.fashn.ai/...` string from
`src/lib/fashn.server.ts` and call `createFashnClient()` instead. All callers
get typed responses, structured JSON logs (`scope: "fashn"`), a `FashnError`
with status + body on failure, and `waitForCompletion()` for polling with
exponential backoff and hard timeout.