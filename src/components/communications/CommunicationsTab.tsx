import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, History, UserCog, Inbox, Route, Phone, Wallet, MessageSquare, Megaphone, Activity, Share2 } from "lucide-react";
import NotificationSettingsPanel from "./NotificationSettingsPanel";
import MessageLogViewer from "./MessageLogViewer";
import UserNotificationPreferences from "./UserNotificationPreferences";
import MessageInbox from "./MessageInbox";
import RoutingRulesPanel from "./RoutingRulesPanel";
import CallHistoryPanel from "./CallHistoryPanel";
import VoipBillingPanel from "./VoipBillingPanel";
import WhatChimpPanel from "./WhatChimpPanel";
import TermiiServicesPanel from "./TermiiServicesPanel";
import CommsMonitoringPanel from "./CommsMonitoringPanel";

interface CommunicationsTabProps {
  orgId: string;
  role: string | null;
}

const CommunicationsTab = ({ orgId, role }: CommunicationsTabProps) => {
  const isAdmin = role === "org_admin" || role === "manager" || role === "super_admin";

  return (
    <div>
      <h2 className="font-heading font-bold text-2xl mb-6">Communications Hub</h2>
      <Tabs defaultValue="inbox">
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="inbox" className="gap-2">
            <Inbox size={14} /> Inbox
          </TabsTrigger>
          <TabsTrigger value="whatchimp" className="gap-2">
            <MessageSquare size={14} /> WhatsApp & Social
          </TabsTrigger>
          <TabsTrigger value="termii" className="gap-2">
            <Megaphone size={14} /> Send SMS
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="settings" className="gap-2">
              <Settings size={14} /> Org Settings
            </TabsTrigger>
          )}
          <TabsTrigger value="preferences" className="gap-2">
            <UserCog size={14} /> My Preferences
          </TabsTrigger>
          <TabsTrigger value="calls" className="gap-2">
            <Phone size={14} /> Calls
          </TabsTrigger>
          <TabsTrigger value="voip-billing" className="gap-2">
            <Wallet size={14} /> VoIP Billing
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <History size={14} /> Message Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox">
          <MessageInbox orgId={orgId} />
        </TabsContent>
        <TabsContent value="whatchimp">
          <WhatChimpPanel orgId={orgId} role={role} />
        </TabsContent>
        <TabsContent value="termii">
          <TermiiServicesPanel orgId={orgId} role={role} />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="settings">
            <NotificationSettingsPanel orgId={orgId} isAdmin={isAdmin} />
          </TabsContent>
        )}
        <TabsContent value="preferences">
          <UserNotificationPreferences orgId={orgId} />
        </TabsContent>
        <TabsContent value="calls">
          <CallHistoryPanel orgId={orgId} />
        </TabsContent>
        <TabsContent value="voip-billing">
          <VoipBillingPanel orgId={orgId} role={role} />
        </TabsContent>
        <TabsContent value="logs">
          <MessageLogViewer orgId={orgId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CommunicationsTab;
