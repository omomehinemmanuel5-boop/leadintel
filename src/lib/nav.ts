import {
  LayoutDashboard,
  Search,
  Building2,
  Users,
  BarChart3,
  Download,
  Plug,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  section: "core" | "intelligence" | "system";
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
    section: "core",
    description: "Overview across every search job",
  },
  {
    href: "/jobs",
    label: "Search Jobs",
    icon: Search,
    section: "core",
    description: "Launch and inspect enrichment runs",
  },
  {
    href: "/companies",
    label: "Companies",
    icon: Building2,
    section: "core",
    description: "Every company discovered so far",
  },
  {
    href: "/contacts",
    label: "Contacts",
    icon: Users,
    section: "core",
    description: "Leaders found, with consent status",
  },
  {
    href: "/ai-research",
    label: "AI Research",
    icon: Sparkles,
    section: "intelligence",
    description: "Company summaries & lead scoring",
  },
  {
    href: "/analytics",
    label: "Analytics",
    icon: BarChart3,
    section: "intelligence",
    description: "Pipeline health across countries",
  },
  {
    href: "/exports",
    label: "Exports",
    icon: Download,
    section: "system",
    description: "Download consent-safe contact lists",
  },
  {
    href: "/integrations",
    label: "Integrations",
    icon: Plug,
    section: "system",
    description: "Connector status, free vs. planned",
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    section: "system",
    description: "Suppression list & send limits",
  },
];
