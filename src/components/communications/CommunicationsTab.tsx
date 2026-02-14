import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, History } from "lucide-react";
import NotificationSettingsPanel from "./NotificationSettingsPanel";
import MessageLogViewer from "./MessageLogViewer";

interface CommunicationsTabProps {
  orgId: string;
  role: string | null;
}

const CommunicationsTab = ({ orgId, role }: CommunicationsTabProps) => {
  const isAdmin = role === "org_admin" || role === "super_admin";

  return (
    <div>
      <h2 className="font-heading font-bold text-2xl mb-6">Communications Hub</h2>
      <Tabs defaultValue="settings">
        <TabsList className="mb-6">
          <TabsTrigger value="settings" className="gap-2">
            <Settings size={14} /> Settings
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <History size={14} /> Message Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <NotificationSettingsPanel orgId={orgId} isAdmin={isAdmin} />
        </TabsContent>
        <TabsContent value="logs">
          <MessageLogViewer orgId={orgId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CommunicationsTab;
