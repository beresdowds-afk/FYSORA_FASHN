import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ContractManagementPanel from "./ContractManagementPanel";
import OrderDelegationPanel from "./OrderDelegationPanel";
import CustomerOptOutPanel from "./CustomerOptOutPanel";
import EmbedConfigPanel from "../embed/EmbedConfigPanel";
import { FileText, UserX, Share2, Globe } from "lucide-react";
import type { AppRole } from "@/hooks/useOrganization";

const ContractsTab = ({ orgId, role }: { orgId: string; role: AppRole | null }) => {
  return (
    <div>
      <h2 className="font-heading font-bold text-2xl mb-6">Contracts & Integration</h2>
      <Tabs defaultValue="contracts" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="contracts" className="flex items-center gap-1.5 text-xs">
            <FileText size={14} /> Contracts
          </TabsTrigger>
          <TabsTrigger value="delegations" className="flex items-center gap-1.5 text-xs">
            <Share2 size={14} /> Delegations
          </TabsTrigger>
          <TabsTrigger value="opt-outs" className="flex items-center gap-1.5 text-xs">
            <UserX size={14} /> Opt-Outs
          </TabsTrigger>
          <TabsTrigger value="embed" className="flex items-center gap-1.5 text-xs">
            <Globe size={14} /> Widget
          </TabsTrigger>
        </TabsList>
        <TabsContent value="contracts"><ContractManagementPanel orgId={orgId} role={role} /></TabsContent>
        <TabsContent value="delegations"><OrderDelegationPanel orgId={orgId} /></TabsContent>
        <TabsContent value="opt-outs"><CustomerOptOutPanel orgId={orgId} /></TabsContent>
        <TabsContent value="embed"><EmbedConfigPanel orgId={orgId} /></TabsContent>
      </Tabs>
    </div>
  );
};

export default ContractsTab;
