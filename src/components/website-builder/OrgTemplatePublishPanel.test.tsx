import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

// ── Test fixtures ─────────────────────────────────────────────
const baseDesign = {
  heroStyle: "fullscreen", navStyle: "minimal", gridColumns: 3, cardStyle: "rounded",
  fontHeadingDefault: "Inter", fontBodyDefault: "Inter", headingWeight: "600",
  headingCase: "none", headingSpacing: "0em", bgBase: "#000", bgSurface: "#111",
  textPrimary: "#fff", textSecondary: "#aaa", borderOpacity: "0.1",
  sectionPadding: "py-24", containerMaxWidth: "max-w-7xl", hoverEffect: "lift",
  animationStyle: "smooth", imageAspect: "auto",
  showSustainabilityBadge: false, showCulturalStory: true,
  editorialDescriptions: false, useSerifAccents: false,
};
const baseCopy = { heroTagline: "x", ctaPrimary: "x", ctaSecondary: "x", catalogueIntro: "x", aboutIntro: "x", sustainabilityNote: "x" };
const TEMPLATE_A: any = { id: "a", name: "Template A", description: "", category: "minimal", design: { ...baseDesign }, copy: baseCopy };
const TEMPLATE_B: any = { id: "b", name: "Template B", description: "", category: "minimal", design: { ...baseDesign, showCulturalStory: false }, copy: baseCopy };

// ── Mutable mock state ────────────────────────────────────────
let siteState: any = null;
const recordedUpdates: any[] = [];
const recordedEvents: any[] = [];

function resetState(initial: any) {
  siteState = initial;
  recordedUpdates.length = 0;
  recordedEvents.length = 0;
}

// ── Mocks ─────────────────────────────────────────────────────
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));
vi.mock("@/hooks/useCustomWebsiteTemplates", () => ({
  useCustomWebsiteTemplates: () => ({ rows: [] }),
  rowToTemplate: (r: any) => r,
}));
vi.mock("@/config/websiteTemplates", () => ({
  getTemplateList: () => [TEMPLATE_A, TEMPLATE_B],
}));
vi.mock("./WebsiteTemplatePicker", () => ({
  default: ({ onSelect }: any) => (
    <div>
      <button onClick={() => onSelect?.("a")}>pick-a</button>
      <button onClick={() => onSelect?.("b")}>pick-b</button>
    </div>
  ),
}));

vi.mock("@/integrations/supabase/client", () => {
  const fromImpl = (table: string) => {
    if (table === "org_websites") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: siteState, error: null }),
          }),
        }),
        update: (patch: any) => {
          recordedUpdates.push(patch);
          if (siteState) Object.assign(siteState, patch);
          return { eq: () => Promise.resolve({ data: null, error: null }) };
        },
        insert: (data: any) => ({
          select: () => ({
            single: () => {
              siteState = { id: "site-1", published_template_version: 0, ...data };
              return Promise.resolve({ data: siteState, error: null });
            },
          }),
        }),
      };
    }
    if (table === "org_website_template_events") {
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        }),
        insert: (data: any) => {
          recordedEvents.push(data);
          return Promise.resolve({ data: null, error: null });
        },
      };
    }
    return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) };
  };
  return { supabase: { from: fromImpl } };
});

// Import AFTER mocks
import OrgTemplatePublishPanel, { diffTemplates } from "./OrgTemplatePublishPanel";

const renderPanel = () =>
  render(<OrgTemplatePublishPanel org={{ id: "org-1", name: "Acme" }} />);

beforeEach(() => {
  resetState(null);
});

// ── Pure helper ───────────────────────────────────────────────
describe("diffTemplates", () => {
  it("returns initial-publish message when no previous template", () => {
    const out = diffTemplates(null, TEMPLATE_A);
    expect(out).toHaveLength(1);
    expect(out[0].label).toMatch(/Initial template/);
    expect(out[0].severity).toBe("info");
  });

  it("returns no consequences when picking the same template", () => {
    expect(diffTemplates(TEMPLATE_A, TEMPLATE_A)).toEqual([]);
  });

  it("flags removal of cultural story as a breaking change", () => {
    const out = diffTemplates(TEMPLATE_A, TEMPLATE_B);
    expect(out.some(c => c.severity === "breaking" && /Cultural story/.test(c.label))).toBe(true);
  });
});

// ── Component flows ───────────────────────────────────────────
describe("OrgTemplatePublishPanel", () => {
  it("publishes a fresh template and stamps version 1", async () => {
    resetState(null); // no site row yet → component must create one
    renderPanel();
    await screen.findByText(/Template Publishing/i);

    fireEvent.click(screen.getByText("pick-a"));
    fireEvent.click(screen.getByRole("button", { name: /Publish template/i }));

    // Fresh publish → only "info" consequence, no consent dialog required
    await waitFor(() => {
      expect(recordedUpdates.length).toBeGreaterThan(0);
    });
    const publishUpdate = recordedUpdates.find(u => u.is_published === true);
    expect(publishUpdate).toBeTruthy();
    expect(publishUpdate.published_template_id).toBe("a");
    expect(publishUpdate.published_template_version).toBe(1);
    expect(publishUpdate.last_published_at).toBeTruthy();
    expect(recordedEvents.some(e => e.action === "publish")).toBe(true);
  });

  it("increments published_template_version on each publish", async () => {
    resetState({
      id: "site-1",
      org_id: "org-1",
      published_template_id: "a",
      published_template_version: 3,
      is_published: true,
      selected_template_id: "a",
    });
    renderPanel();
    await screen.findByText(/Template Publishing/i);

    // Re-publishing the same template skips the consent dialog
    fireEvent.click(screen.getByText("pick-a"));
    fireEvent.click(screen.getByRole("button", { name: /Publish template/i }));

    await waitFor(() => expect(recordedUpdates.some(u => u.is_published === true)).toBe(true));
    const pub = recordedUpdates.find(u => u.is_published === true);
    expect(pub.published_template_version).toBe(4);
  });

  it("requires acknowledgement before publishing a breaking template change", async () => {
    resetState({
      id: "site-1",
      org_id: "org-1",
      published_template_id: "a",
      published_template_version: 2,
      is_published: true,
      selected_template_id: "a",
    });
    renderPanel();
    await screen.findByText(/Template Publishing/i);

    fireEvent.click(screen.getByText("pick-b")); // A → B has breaking change
    fireEvent.click(screen.getByRole("button", { name: /Publish template/i }));

    // Consequences dialog should appear with disabled confirm button
    const confirmBtn = await screen.findByRole("button", { name: /^Publish now$/i });
    expect(confirmBtn).toBeDisabled();
    expect(recordedUpdates.some(u => u.is_published === true)).toBe(false);

    // Acknowledge → confirm becomes enabled → publish runs and stamps version 3
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    await waitFor(() => expect(confirmBtn).not.toBeDisabled());
    fireEvent.click(confirmBtn);

    await waitFor(() => expect(recordedUpdates.some(u => u.is_published === true && u.published_template_id === "b")).toBe(true));
    const pub = recordedUpdates.find(u => u.published_template_id === "b");
    expect(pub.published_template_version).toBe(3);
  });

  it("unpublishes a live site without changing the published template", async () => {
    resetState({
      id: "site-1",
      org_id: "org-1",
      published_template_id: "a",
      published_template_version: 5,
      is_published: true,
      selected_template_id: "a",
    });
    renderPanel();
    await screen.findByText(/Template Publishing/i);

    fireEvent.click(screen.getByRole("button", { name: /Unpublish live site/i }));

    await waitFor(() => expect(recordedUpdates.some(u => u.is_published === false)).toBe(true));
    const unpub = recordedUpdates.find(u => u.is_published === false);
    expect(unpub.last_unpublished_at).toBeTruthy();
    expect(unpub).not.toHaveProperty("published_template_id"); // template untouched
    expect(recordedEvents.some(e => e.action === "unpublish")).toBe(true);
  });
});