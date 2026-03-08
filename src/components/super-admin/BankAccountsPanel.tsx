import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import {
  Building2, CheckCircle2, Clock, Banknote, Search, Loader2,
  CreditCard, Users, TrendingUp
} from "lucide-react";

interface VirtualAccount {
  id: string;
  user_id: string;
  account_type: string;
  customer_code: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  is_active: boolean;
  purpose: string;
  created_at: string;
}

interface DVATransaction {
  id: string;
  user_id: string;
  paystack_reference: string;
  amount: number;
  currency: string;
  purpose: string;
  status: string;
  sender_name: string | null;
  sender_bank: string | null;
  credited_wallet: boolean;
  credited_at: string | null;
  created_at: string;
}

const BankAccountsPanel = () => {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<VirtualAccount[]>([]);
  const [transactions, setTransactions] = useState<DVATransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("accounts");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchAccounts = useCallback(async () => {
    const { data } = await supabase
      .from("paystack_virtual_accounts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setAccounts((data as unknown as VirtualAccount[]) || []);
  }, []);

  const fetchTransactions = useCallback(async () => {
    let query = supabase
      .from("paystack_dva_transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (statusFilter !== "all") query = query.eq("status", statusFilter);

    const { data } = await query;
    setTransactions((data as unknown as DVATransaction[]) || []);
  }, [statusFilter]);

  useEffect(() => {
    Promise.all([fetchAccounts(), fetchTransactions()]).then(() => setLoading(false));
  }, [fetchAccounts, fetchTransactions]);

  // Realtime for new transactions
  useEffect(() => {
    const channel = supabase
      .channel("admin-dva-transactions")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "paystack_dva_transactions" },
        (payload) => {
          setTransactions(prev => [payload.new as DVATransaction, ...prev]);
          toast({ title: "New DVA payment received", description: `₦${Number(payload.new.amount).toLocaleString()}` });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const filteredAccounts = accounts.filter(a => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return a.account_number.includes(q) || a.account_name.toLowerCase().includes(q) || a.customer_code.toLowerCase().includes(q);
  });

  const filteredTransactions = transactions.filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return t.paystack_reference.toLowerCase().includes(q) || t.sender_name?.toLowerCase().includes(q) || String(t.amount).includes(q);
  });

  const totalVolume = transactions.reduce((s, t) => s + Number(t.amount), 0);
  const totalCredited = transactions.filter(t => t.credited_wallet).length;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl">Paystack DVA Management</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Monitor dynamic virtual accounts and auto-reconciled payments.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users size={16} className="text-primary" />
          </div>
          <p className="font-heading font-bold text-xl">{accounts.length}</p>
          <p className="text-xs text-muted-foreground">Virtual Accounts</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard size={16} className="text-secondary" />
          </div>
          <p className="font-heading font-bold text-xl">{transactions.length}</p>
          <p className="text-xs text-muted-foreground">Total Transactions</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} className="text-chart-4" />
          </div>
          <p className="font-heading font-bold text-xl">₦{totalVolume.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Total Volume</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 size={16} className="text-primary" />
          </div>
          <p className="font-heading font-bold text-xl">{totalCredited}</p>
          <p className="text-xs text-muted-foreground">Auto-Credited</p>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="accounts">
            <Building2 size={14} className="mr-1" /> Virtual Accounts
          </TabsTrigger>
          <TabsTrigger value="transactions">
            <Banknote size={14} className="mr-1" /> Transactions
          </TabsTrigger>
        </TabsList>

        {/* Virtual Accounts Tab */}
        <TabsContent value="accounts" className="space-y-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by account number, name, or customer code..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts.map(acc => (
                  <TableRow key={acc.id}>
                    <TableCell>
                      <p className="font-mono text-sm">{acc.account_number}</p>
                      <p className="text-xs text-muted-foreground">{acc.account_name}</p>
                    </TableCell>
                    <TableCell className="text-sm">{acc.bank_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize text-xs">{acc.account_type}</Badge>
                    </TableCell>
                    <TableCell className="text-sm capitalize">{acc.purpose}</TableCell>
                    <TableCell>
                      <Badge variant={acc.is_active ? "default" : "secondary"} className="text-xs">
                        {acc.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(acc.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredAccounts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No virtual accounts found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by reference, sender name, or amount..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); }}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Sender</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Credited</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map(tx => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(tx.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{tx.paystack_reference}</TableCell>
                    <TableCell>
                      <p className="text-sm">{tx.sender_name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{tx.sender_bank || ""}</p>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ₦{Number(tx.amount).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={tx.status === "success" ? "default" : "destructive"} className="text-xs capitalize">
                        {tx.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {tx.credited_wallet ? (
                        <div className="flex items-center gap-1 text-primary text-xs">
                          <CheckCircle2 size={12} />
                          {Math.floor(Number(tx.amount) / 100)} tokens
                        </div>
                      ) : (
                        <Clock size={12} className="text-muted-foreground" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredTransactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No transactions found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default BankAccountsPanel;
