import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  color?: "blue" | "emerald" | "amber" | "purple" | "slate";
  trend?: { value: number; label: string };
}

const colorMap = {
  blue:    { icon: "text-blue-400",    bg: "bg-blue-500/15",    border: "border-blue-500/20" },
  emerald: { icon: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/20" },
  amber:   { icon: "text-amber-400",   bg: "bg-amber-500/15",   border: "border-amber-500/20" },
  purple:  { icon: "text-purple-400",  bg: "bg-purple-500/15",  border: "border-purple-500/20" },
  slate:   { icon: "text-slate-400",   bg: "bg-slate-700/50",   border: "border-slate-600/30" },
};

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "blue",
  trend,
}: StatsCardProps) {
  const colors = colorMap[color];

  return (
    <div className="card flex items-start gap-4">
      {/* Ícone */}
      <div
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
          colors.bg,
          "border",
          colors.border
        )}
      >
        <Icon className={cn("w-5 h-5", colors.icon)} />
      </div>

      {/* Conteúdo */}
      <div className="min-w-0">
        <p className="text-sm text-slate-500 leading-tight">{title}</p>
        <p className="text-2xl font-bold text-slate-100 mt-0.5 leading-none">
          {value}
        </p>
        {subtitle && (
          <p className="text-xs text-slate-600 mt-1">{subtitle}</p>
        )}
        {trend && (
          <p
            className={cn(
              "text-xs mt-1 font-medium",
              trend.value > 0 ? "text-emerald-400" : "text-slate-500"
            )}
          >
            {trend.value > 0 && "+"}
            {trend.value} {trend.label}
          </p>
        )}
      </div>
    </div>
  );
}
