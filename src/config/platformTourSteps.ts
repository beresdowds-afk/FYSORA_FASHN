export interface PlatformTourStep {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  narration: string;
  icon: string; // lucide icon name
  visual: "catalogue" | "fashion-houses" | "measurements" | "try-on" | "orders" | "communications" | "welcome" | "subscribe";
  highlights?: string[];
}

export const platformTourSteps: PlatformTourStep[] = [
  {
    id: "welcome",
    title: "Welcome to FYSORA FASHN (Fashion Stitches Africa)",
    subtitle: "Your gateway to African fashion",
    description:
      "FYSORA FASHN (Fashion Stitches Africa) connects you with the finest fashion houses, tailors, and designers across Africa. Let us show you around!",
    narration:
      "Welcome to FYSORA FASHN (Fashion Stitches Africa)! We're thrilled to have you here. This platform connects you with the finest fashion houses, talented tailors, and creative designers across Africa. Let me take you on a quick tour of everything we have to offer.",
    icon: "Sparkles",
    visual: "welcome",
    highlights: ["Global Marketplace", "Verified Fashion Houses", "Premium Services"],
  },
  {
    id: "catalogue",
    title: "Platform Catalogue",
    subtitle: "Explore thousands of designs",
    description:
      "Browse a curated collection of garments, fabrics, and designs from fashion houses across the continent. Search by category, style, or fashion house.",
    narration:
      "Our Platform Catalogue is a curated marketplace featuring thousands of designs from fashion houses across Africa. You can search by category, browse by fashion house, or filter by style. Each product shows pricing, availability, and the fashion house behind it.",
    icon: "ShoppingBag",
    visual: "catalogue",
    highlights: ["Search & Filter", "Fashion House Attribution", "Real-time Pricing"],
  },
  {
    id: "fashion-houses",
    title: "Browse Fashion Houses",
    subtitle: "Discover verified organizations",
    description:
      "Explore registered fashion houses by region and specialty. View their catalogues, read reviews, and connect directly.",
    narration:
      "Discover verified fashion houses from across Africa. Each organization has a dedicated profile showcasing their specialties, catalogue, reviews from customers, and contact information. You can browse by region, product category, or simply search by name.",
    icon: "Building2",
    visual: "fashion-houses",
    highlights: ["Verified Profiles", "Regional Search", "Customer Reviews"],
  },
  {
    id: "measurements",
    title: "AI-Powered Measurements",
    subtitle: "Precision meets convenience",
    description:
      "Book an AI-powered measurement session for accurate body measurements from the comfort of your home. Our technology ensures a perfect fit every time.",
    narration:
      "With our AI-powered measurement system, you can get accurate body measurements from the comfort of your home. Simply book a session, and our advanced technology captures your measurements with precision, ensuring a perfect fit every time you order.",
    icon: "Ruler",
    visual: "measurements",
    highlights: ["AI Body Scanning", "Save Multiple Profiles", "Perfect Fit Guarantee"],
  },
  {
    id: "try-on",
    title: "Virtual Try-On",
    subtitle: "See before you buy",
    description:
      "Visualize how garments look on you before placing an order. Our virtual try-on technology brings the fitting room to your screen.",
    narration:
      "Our virtual try-on feature lets you visualize how garments will look on you before placing an order. Upload your photo, select a design from any fashion house, and see a realistic preview. It's like having a fitting room right on your screen!",
    icon: "Sparkles",
    visual: "try-on",
    highlights: ["Realistic Previews", "Any Catalogue Item", "Share with Friends"],
  },
  {
    id: "orders",
    title: "Order Tracking",
    subtitle: "Stay informed every step",
    description:
      "Place orders with any fashion house and track progress in real-time — from measuring through production to delivery at your doorstep.",
    narration:
      "Once you place an order with any fashion house, you can track its progress in real-time. From initial measurements through fabric selection, production, and delivery — you'll always know exactly where your order stands. You'll also receive notifications at every milestone.",
    icon: "Package",
    visual: "orders",
    highlights: ["Real-time Status", "Milestone Notifications", "Delivery Tracking"],
  },
  {
    id: "communications",
    title: "Direct Communications",
    subtitle: "Stay connected",
    description:
      "Message fashion houses directly via SMS, WhatsApp, or in-app chat. Schedule video consultations for personalized service.",
    narration:
      "Stay connected with your fashion houses through our integrated communications hub. Send messages via SMS, WhatsApp, or in-app chat. You can even schedule video consultations for personalized design discussions and fittings.",
    icon: "MessageSquare",
    visual: "communications",
    highlights: ["Multi-channel Messaging", "Video Consultations", "Smart Notifications"],
  },
  {
    id: "subscribe",
    title: "Unlock Full Access",
    subtitle: "Go Premium",
    description:
      "Subscribe to the Premium plan to unlock all features — AI measurements, virtual try-on, priority support, and unrestricted catalogue access.",
    narration:
      "Ready to unlock everything? The Premium plan gives you full unrestricted access to all platform features — AI measurements, virtual try-on, video consultations, priority tracking, and much more. Subscribe today and experience the best of African fashion!",
    icon: "Crown",
    visual: "subscribe",
    highlights: ["Premium Plan", "All Features Unlocked", "Identity Verified Access"],
  },
];
