import { useEffect, useState } from "react";
import { startRegistration, startAuthentication } from "@simplewebauthn/browser";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { KeyRound, Trash2, ShieldCheck, Loader2 } from "lucide-react";

interface Passkey {
  id: string;
  credential_id: string;
  nickname: string | null;
  device_type: string | null;
  backed_up: boolean;
  last_used_at: string | null;
  created_at: string;
}

export function PasskeysPanel() {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("webauthn_credentials")
      .select("id, credential_id, nickname, device_type, backed_up, last_used_at, created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setPasskeys((data as Passkey[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const enroll = async () => {
    setEnrolling(true);
    try {
      const { data: begin, error: e1 } = await supabase.functions.invoke("passkey-register", {
        body: { action: "begin" },
      });
      if (e1 || !begin?.options) throw new Error(e1?.message ?? "Failed to start enrollment");
      const attResp = await startRegistration(begin.options);
      const { error: e2 } = await supabase.functions.invoke("passkey-register", {
        body: { action: "finish", response: attResp, nickname: nickname || null },
      });
      if (e2) throw new Error(e2.message);
      toast.success("Passkey enrolled on this device");
      setNickname("");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEnrolling(false);
    }
  };

  const testAuth = async () => {
    try {
      const { data: begin, error: e1 } = await supabase.functions.invoke("passkey-authenticate", {
        body: { action: "begin" },
      });
      if (e1 || !begin?.options) throw new Error(e1?.message ?? "No passkeys available");
      const asResp = await startAuthentication(begin.options);
      const { data: fin, error: e2 } = await supabase.functions.invoke("passkey-authenticate", {
        body: { action: "finish", response: asResp },
      });
      if (e2 || !fin?.verified) throw new Error(e2?.message ?? "Verification failed");
      toast.success("Passkey verified ✓");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("webauthn_credentials").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Passkey removed");
      await load();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" /> Passkeys
        </CardTitle>
        <CardDescription>
          Add a passkey on each of your devices to sign in with Face ID, Touch ID, Windows Hello,
          or a security key. Passkeys are an additional layer on top of your username &amp; password.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Device nickname (e.g. iPhone, MacBook)"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={40}
          />
          <Button onClick={enroll} disabled={enrolling}>
            {enrolling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <KeyRound className="h-4 w-4 mr-2" />}
            Enroll this device
          </Button>
        </div>

        <div className="border rounded-md divide-y">
          {loading && <div className="p-3 text-sm text-muted-foreground">Loading…</div>}
          {!loading && passkeys.length === 0 && (
            <div className="p-3 text-sm text-muted-foreground">No passkeys enrolled yet.</div>
          )}
          {passkeys.map((pk) => (
            <div key={pk.id} className="p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium truncate">{pk.nickname || "Unnamed passkey"}</div>
                <div className="text-xs text-muted-foreground">
                  {pk.device_type ?? "device"}
                  {pk.backed_up ? " · synced" : " · this device only"}
                  {pk.last_used_at ? ` · last used ${new Date(pk.last_used_at).toLocaleDateString()}` : " · never used"}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => remove(pk.id)} aria-label="Remove passkey">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {passkeys.length > 0 && (
          <Button variant="outline" onClick={testAuth}>Test passkey sign-in</Button>
        )}
      </CardContent>
    </Card>
  );
}

export default PasskeysPanel;