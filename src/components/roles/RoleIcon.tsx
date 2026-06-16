import {
  GraduationCap,
  Home,
  Code,
  Server,
  Users,
  GitMerge,
  Target,
  Building2,
  Rocket,
  Crown,
  TrendingUp,
  Layers,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  GraduationCap,
  Home,
  Code,
  Server,
  Users,
  GitMerge,
  Target,
  Building2,
  Rocket,
  Crown,
  TrendingUp,
};

export function RoleIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Layers;
  return <Icon className={className} />;
}
