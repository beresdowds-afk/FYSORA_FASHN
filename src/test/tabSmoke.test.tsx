import { render, waitFor } from "@testing-library/react";
import { vi, it, expect } from "vitest";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
const qc = new QueryClient();
const Wrap = ({ children }: any) => <QueryClientProvider client={qc}><MemoryRouter>{children}</MemoryRouter></QueryClientProvider>;

const chain: any = new Proxy(function () {} as any, {
  get: (_t, p) => {
    if (p === "then") return undefined;
    return () => chain;
  },
  apply: () => chain,
});
const result = { data: [], error: null };
const makeQuery = () => {
  const q: any = {};
  const methods = ["select","eq","in","order","limit","neq","gte","lte","or","not","is","contains","filter","range"];
  methods.forEach(m => q[m] = () => q);
  q.single = async () => ({ data: null, error: null });
  q.maybeSingle = async () => ({ data: null, error: null });
  q.then = (res: any) => Promise.resolve(result).then(res);
  q.insert = () => q; q.update = () => q; q.upsert = () => q; q.delete = () => q;
  return q;
};
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => makeQuery(),
    channel: () => { const ch: any = { on: () => ch, subscribe: () => ch, unsubscribe: () => {} }; return ch; },
    removeChannel: () => {},
    auth: { getSession: async () => ({ data: { session: null } }), getUser: async () => ({ data: { user: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }) },
    functions: { invoke: async () => ({ data: null, error: null }) },
    storage: { from: () => ({ upload: async () => ({ data: null, error: null }), getPublicUrl: () => ({ data: { publicUrl: "" } }) }) },
    rpc: async () => ({ data: null, error: null }),
  },
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1" }, session: null, loading: false }),
  AuthProvider: ({ children }: any) => children,
}));

it("OrdersTab renders", async () => {
  const { default: OrdersTab } = await import("@/components/orders/OrdersTab");
  const { container } = render(<Wrap><OrdersTab orgId="o1" currency="NGN" role={"org_admin" as any} orgName="X" /></Wrap>);
  await waitFor(() => expect(container.textContent).toBeTruthy());
  console.log("ORDERS_OUT:", container.textContent?.slice(0, 200));
});

it("WebsiteBuilderTab renders", async () => {
  const { default: Tab } = await import("@/components/website-builder/WebsiteBuilderTab");
  const { container } = render(<Wrap><Tab org={{ id: "o1", name: "X", slug: "x", currency: "NGN" } as any} role={"org_admin" as any} /></Wrap>);
  await waitFor(() => expect(container.textContent).toContain("Website Builder"), { timeout: 4000 });
  console.log("WB_OUT:", container.textContent?.slice(0, 200));
});
