import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import {
  Building2,
  Users,
  Scissors,
  Palette,
  Search,
  Ban,
  Trash2,
  RotateCcw,
  Archive,
  Clock,
} from "lucide-react";

interface AccountEntry {
  id: string;
  name: string;
  email?: string;
  role?: string;
  org_name?: string;
  is_active: boolean;
  is_deactivated?: boolean;
  created_at: string;
}

interface ArchiveEntry {
  id: string;
  account_type: string;
  account_name: string;
  account_email: string;
  action: string;
  reason: string | null;
  archived_at: string;
  expires_at: string;
}

const AccountManagementPanel = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState("organizations");
  const [search, setSearch] = useState("");
  const [orgs, setOrgs] = useState<AccountEntry[]>([]);
  const [users, setUsers] = useState<AccountEntry[]>([]);
  const [archives, setArchives] = useState<ArchiveEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<"deactivate" | "delete" | "reactivate">("deactivate");
  const [dialogTarget, setDialogTarget] = useState<AccountEntry | null>(null);
  const [dialogTargetType, setDialogTargetType] = useState<"organization" | "customer" | "tailor" | "designer">("organization");
  const [reason, setReason] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchOrgs = async () => {
    const { data } = await supabase
      .from("organizations")
      .select("id, name, slug, is_active, created_at")
      .order("created_at", { ascending: false });
    setOrgs(
      (data || []).map((o: any) => ({
        id: o.id,
        name: o.name,
        is_active: o.is_active,
        created_at: o.created_at,
      }))
    );
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("org_members")
      .select("id, user_id, role, organizations(name), profiles:user_id(display_name, is_deactivated)")
      .order("joined_at", { ascending: false })
      .limit(100);

    setUsers(
      (data || []).map((m: any) => ({
        id: m.user_id,
        name: m.profiles?.display_name || "Unknown",
        role: m.role,
        org_name: m.organizations?.name || "—",
        is_active: !m.profiles?.is_deactivated,
        is_deactivated: m.profiles?.is_deactivated || false,
        created_at: "",
      }))
    );
  };

  const fetchArchives = async () => {
    const { data } = await supabase
      .from("account_archives")
      .select("*")
      .order("archived_at", { ascending: false })
      .limit(100);
    setArchives((data as ArchiveEntry[]) || []);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchOrgs(), fetchUsers(), fetchArchives()]);
      setLoading(false);
    };
    load();
  }, []);

  const openDialog = (
    action: "deactivate" | "delete" | "reactivate",
    target: AccountEntry,
    type: "organization" | "customer" | "tailor" | "designer"
  ) => {
    setDialogAction(action);
    setDialogTarget(target);
    setDialogTargetType(type);
    setReason("");
    setDialogOpen(true);
  };

  const executeAction = async () => {
    if (!dialogTarget || !user) return;
    setProcessing(true);

    try {
      if (dialogAction === "reactivate") {
        if (dialogTargetType === "organization") {
          await supabase.from("organizations").update({ is_active: true }).eq("id", dialogTarget.id);
        } else {
          await supabase.from("profiles").update({ is_deactivated: false, deactivated_at: null }).eq("id", dialogTarget.id);
        }
        toast({ title: "Account reactivated", description: `${dialogTarget.name} has been reactivated.` });
      } else {
        // Archive transaction data before deactivation/deletion
        let archivedData: any = {};

        if (dialogTargetType === "organization") {
          const [orders, payments] = await Promise.all([
            supabase.from("orders").select("id, total_amount, currency, status, created_at").eq("org_id", dialogTarget.id).limit(500),
            supabase.from("payments").select("id, amount, currency, status, created_at").eq("org_id", dialogTarget.id).limit(500),
          ]);
          archivedData = { orders: orders.data, payments: payments.data };

          await supabase.from("organizations").update({ is_active: false }).eq("id", dialogTarget.id);
        } else {
          const { data: memberOrgs } = await supabase
            .from("org_members")
            .select("org_id")
            .eq("user_id", dialogTarget.id);
          const orgIds = (memberOrgs || []).map((m: any) => m.org_id);

          if (orgIds.length > 0) {
            const { data: orders } = await supabase
              .from("orders")
              .select("id, total_amount, currency, status, created_at")
              .eq("customer_id", dialogTarget.id)
              .limit(500);
            archivedData = { orders, org_memberships: memberOrgs };
          }

          await supabase.from("profiles").update({ is_deactivated: true, deactivated_at: new Date().toISOString() }).eq("id", dialogTarget.id);

          if (dialogAction === "delete") {
            await supabase.from("org_members").delete().eq("user_id", dialogTarget.id);
          }
        }

        // Insert archive record
        await supabase.from("account_archives").insert({
          account_type: dialogTargetType,
          account_id: dialogTarget.id,
          account_name: dialogTarget.name,
          account_email: dialogTarget.email || "",
          action: dialogAction === "delete" ? "deleted" : "deactivated",
          reason,
          archived_data: archivedData,
          archived_by: user.id,
        });

        toast({
          title: dialogAction === "delete" ? "Account deleted" : "Account deactivated",
          description: `${dialogTarget.name} has been ${dialogAction === "delete" ? "deleted" : "deactivated"}. Transaction data archived for 365 days.`,
        });
      }

      await Promise.all([fetchOrgs(), fetchUsers(), fetchArchives()]);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
      setDialogOpen(false);
    }
  };

  const filteredOrgs = orgs.filter((o) => o.name.toLowerCase().includes(search.toLowerCase()));
  const tailors = users.filter((u) => u.role === "tailor");
  const designers = users.filter((u) => u.role === "designer");
  const customers = users.filter((u) => u.role === "customer" || u.role === "org_admin");
  const filteredTailors = tailors.filter((u) => u.name.toLowerCase().includes(search.toLowerCase()));
  const filteredDesigners = designers.filter((u) => u.name.toLowerCase().includes(search.toLowerCase()));
  const filteredCustomers = customers.filter((u) => u.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl">Account Management</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Deactivate or delete accounts. Transaction data is archived for 365 days.
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search accounts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="organizations" className="gap-1.5">
            <Building2 size={14} /> Organizations
          </TabsTrigger>
          <TabsTrigger value="tailors" className="gap-1.5">
            <Scissors size={14} /> Tailors
          </TabsTrigger>
          <TabsTrigger value="designers" className="gap-1.5">
            <Palette size={14} /> Designers
          </TabsTrigger>
          <TabsTrigger value="customers" className="gap-1.5">
            <Users size={14} /> Customers
          </TabsTrigger>
          <TabsTrigger value="archives" className="gap-1.5">
            <Archive size={14} /> Archives
          </TabsTrigger>
        </TabsList>

        {/* Organizations */}
        <TabsContent value="organizations">
          <AccountTable
            entries={filteredOrgs}
            type="organization"
            onAction={openDialog}
          />
        </TabsContent>

        {/* Tailors */}
        <TabsContent value="tailors">
          <AccountTable
            entries={filteredTailors}
            type="tailor"
            onAction={openDialog}
            showOrg
          />
        </TabsContent>

        {/* Designers */}
        <TabsContent value="designers">
          <AccountTable
            entries={filteredDesigners}
            type="designer"
            onAction={openDialog}
            showOrg
          />
        </TabsContent>

        {/* Customers */}
        <TabsContent value="customers">
          <AccountTable
            entries={filteredCustomers}
            type="customer"
            onAction={openDialog}
            showOrg
          />
        </TabsContent>

        {/* Archives */}
        <TabsContent value="archives">
          {archives.length === 0 ? (
            <div className="rounded-xl bg-card border border-border p-12 text-center">
              <Archive size={40} className="text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No archived accounts yet.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Account</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Type</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Action</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Reason</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Archived</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Expires</th>
                    </tr>
                  </thead>
                  <tbody>
                    {archives.map((a) => (
                      <tr key={a.id} className="border-t border-border">
                        <td className="px-4 py-3 text-sm font-medium">{a.account_name}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-[10px]">{a.account_type}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={a.action === "deleted" ? "destructive" : "secondary"} className="text-[10px]">
                            {a.action}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] truncate">{a.reason || "—"}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(a.archived_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground flex items-center gap-1">
                          <Clock size={12} /> {new Date(a.expires_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog */}
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dialogAction === "reactivate"
                ? "Reactivate Account"
                : dialogAction === "delete"
                ? "Delete Account"
                : "Deactivate Account"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dialogAction === "reactivate" ? (
                <>Are you sure you want to reactivate <strong>{dialogTarget?.name}</strong>?</>
              ) : dialogAction === "delete" ? (
                <>
                  This will permanently remove <strong>{dialogTarget?.name}</strong>'s access. 
                  Transaction data will be archived for 365 days before permanent deletion.
                </>
              ) : (
                <>
                  This will deactivate <strong>{dialogTarget?.name}</strong>'s account. 
                  They will lose access but transaction data remains archived for 365 days.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {dialogAction !== "reactivate" && (
            <Textarea
              placeholder="Reason for this action (optional)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-2"
            />
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeAction}
              disabled={processing}
              className={dialogAction === "delete" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {processing ? "Processing..." : dialogAction === "reactivate" ? "Reactivate" : dialogAction === "delete" ? "Delete" : "Deactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

/* ─── Reusable Account Table ─── */
const AccountTable = ({
  entries,
  type,
  onAction,
  showOrg,
}: {
  entries: AccountEntry[];
  type: "organization" | "customer" | "tailor" | "designer";
  onAction: (action: "deactivate" | "delete" | "reactivate", target: AccountEntry, type: "organization" | "customer" | "tailor" | "designer") => void;
  showOrg?: boolean;
}) => {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl bg-card border border-border p-12 text-center">
        <Users size={40} className="text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">No {type}s found.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Name</th>
              {showOrg && <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Organization</th>}
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
              <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => {
              const active = entry.is_active && !entry.is_deactivated;
              return (
                <tr key={`${entry.id}-${i}`} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-3 text-sm font-medium">{entry.name}</td>
                  {showOrg && <td className="px-4 py-3 text-sm text-muted-foreground">{entry.org_name || "—"}</td>}
                  <td className="px-4 py-3">
                    <Badge variant={active ? "secondary" : "outline"} className="text-[10px]">
                      {active ? "Active" : "Deactivated"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {active ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-amber-600 hover:text-amber-700 text-xs h-7"
                            onClick={() => onAction("deactivate", entry, type)}
                          >
                            <Ban size={12} className="mr-1" /> Deactivate
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive text-xs h-7"
                            onClick={() => onAction("delete", entry, type)}
                          >
                            <Trash2 size={12} className="mr-1" /> Delete
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-secondary hover:text-secondary text-xs h-7"
                          onClick={() => onAction("reactivate", entry, type)}
                        >
                          <RotateCcw size={12} className="mr-1" /> Reactivate
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AccountManagementPanel;
