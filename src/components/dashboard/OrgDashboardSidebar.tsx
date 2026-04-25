import {
  BarChart3, Package, UserCheck, Video, Sparkles, Star, Truck,
  FileText, Users, CreditCard, Receipt, Wallet, Globe, Settings, Search
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export type OrgTabId =
  | "overview" | "orders" | "customers" | "bookings" | "premium"
  | "featured" | "logistics" | "contracts" | "members" | "billing"
  | "invoicing" | "invoice_manager" | "wallet" | "website" | "settings"
  | "sentinel_seo";

const navGroups = [
  {
    label: "Main",
    items: [
      { id: "overview" as const, icon: BarChart3, label: "Overview" },
      { id: "orders" as const, icon: Package, label: "Orders" },
      { id: "customers" as const, icon: UserCheck, label: "Customers" },
    ],
  },
  {
    label: "Features",
    items: [
      { id: "bookings" as const, icon: Video, label: "AI Measurements" },
      { id: "premium" as const, icon: Sparkles, label: "Premium" },
      { id: "featured" as const, icon: Star, label: "Featured Products" },
      { id: "logistics" as const, icon: Truck, label: "Logistics" },
      { id: "contracts" as const, icon: FileText, label: "Contracts" },
    ],
  },
  {
    label: "Finance & Team",
    items: [
      { id: "members" as const, icon: Users, label: "Team Members" },
      { id: "billing" as const, icon: CreditCard, label: "FSA Subscription" },
      { id: "invoicing" as const, icon: Receipt, label: "Billing & Invoicing" },
      { id: "invoice_manager" as const, icon: FileText, label: "Invoice Manager" },
      { id: "wallet" as const, icon: Wallet, label: "Wallet" },
    ],
  },
  {
    label: "Other",
    items: [
      { id: "website" as const, icon: Globe, label: "Website" },
      { id: "sentinel_seo" as const, icon: Search, label: "SEO & Sentinel" },
      { id: "settings" as const, icon: Settings, label: "Settings" },
    ],
  },
];

interface OrgDashboardSidebarProps {
  activeTab: OrgTabId;
  onTabChange: (tab: OrgTabId) => void;
}

export default function OrgDashboardSidebar({ activeTab, onTabChange }: OrgDashboardSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={activeTab === item.id}
                      onClick={() => onTabChange(item.id)}
                      tooltip={item.label}
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.label}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
