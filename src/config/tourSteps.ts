import type { TourStep } from "@/hooks/useTourGuide";

export const orgAdminTourSteps: TourStep[] = [
  {
    target: "nav-overview",
    title: "Dashboard Overview",
    description: "Get a bird's-eye view of your organization — revenue, orders, and key metrics at a glance.",
    placement: "right",
  },
  {
    target: "nav-orders",
    title: "Manage Orders",
    description: "Create, track, and update customer orders through every stage from measuring to delivery.",
    placement: "right",
  },
  {
    target: "nav-customers",
    title: "Your Customers",
    description: "View all your customers, their measurement profiles, and order history in one place.",
    placement: "right",
  },
  {
    target: "nav-communications",
    title: "Communications Hub",
    description: "Send messages via SMS, WhatsApp, or email. View message logs and configure routing rules.",
    placement: "right",
  },
  {
    target: "nav-billing",
    title: "Billing & Subscription",
    description: "Manage your subscription plan, view invoices, and track payment history.",
    placement: "right",
  },
  {
    target: "nav-settings",
    title: "Settings",
    description: "Configure availability, exchange rates, and other organization preferences.",
    placement: "right",
  },
];

export const tailorTourSteps: TourStep[] = [
  {
    target: "nav-overview",
    title: "Your Workspace",
    description: "See all assigned work, deadlines, and tasks at a glance.",
    placement: "right",
  },
  {
    target: "nav-orders",
    title: "Assigned Orders",
    description: "View orders delegated to you. Update status as you work through each garment.",
    placement: "right",
  },
  {
    target: "nav-customers",
    title: "Customer Details",
    description: "Access customer measurements and contact info for the orders you're working on.",
    placement: "right",
  },
];

export const customerTourSteps: TourStep[] = [
  {
    target: "customer-orders-tab",
    title: "Your Orders",
    description: "Track all your orders — see real-time status updates from pending to delivered.",
    placement: "bottom",
  },
  {
    target: "customer-payments-tab",
    title: "Payments",
    description: "View your payment history and outstanding balances for each order.",
    placement: "bottom",
  },
  {
    target: "customer-measurements-tab",
    title: "AI Measurements",
    description: "Book an AI-powered measurement session or view your saved measurement profiles.",
    placement: "bottom",
  },
  {
    target: "customer-wishlist-tab",
    title: "Wishlist & Reviews",
    description: "Save items you love and leave reviews on completed orders.",
    placement: "bottom",
  },
];

export const superAdminTourSteps: TourStep[] = [
  {
    target: "sa-overview",
    title: "Platform Overview",
    description: "Monitor all organizations, user counts, and platform health from this dashboard.",
    placement: "right",
  },
  {
    target: "sa-organizations",
    title: "Manage Organizations",
    description: "View, activate, or deactivate tenant organizations on the platform.",
    placement: "right",
  },
  {
    target: "sa-revenue",
    title: "Platform Revenue",
    description: "Track fees, commissions, and overall platform revenue across all tenants.",
    placement: "right",
  },
  {
    target: "sa-features",
    title: "Feature Flags",
    description: "Toggle platform features on or off for all organizations globally.",
    placement: "right",
  },
  {
    target: "sa-audit",
    title: "Audit Logs",
    description: "Review a complete audit trail of actions across the entire platform.",
    placement: "right",
  },
];
