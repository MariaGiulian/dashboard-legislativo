"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Tag,
  Vote,
  Github,
  ExternalLink,
  Scale,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/",
    icon: LayoutDashboard,
    label: "Dashboard",
    description: "Visão geral e notificações",
  },
  {
    href: "/proposicoes",
    icon: BookOpen,
    label: "Proposições",
    description: "PLs encontrados",
  },
  {
    href: "/votacoes",
    icon: Vote,
    label: "Votações",
    description: "Próximas votações",
  },
  {
    href: "/temas",
    icon: Tag,
    label: "Meus Temas",
    description: "Palavras-chave monitoradas",
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 w-64 flex flex-col bg-slate-900 border-r border-slate-800">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
        <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
          <Scale className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h1 className="font-semibold text-slate-100 text-sm leading-tight">
            Legisla Monitor
          </h1>
          <p className="text-xs text-slate-500">Monitor legislativo</p>
        </div>
      </div>

      {/* Navegação principal */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group",
                isActive
                  ? "bg-blue-600/15 text-blue-400 border border-blue-500/20"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
              )}
            >
              <item.icon
                className={cn(
                  "w-4 h-4 flex-shrink-0",
                  isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"
                )}
              />
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight">{item.label}</p>
                <p className="text-xs text-slate-500 truncate">{item.description}</p>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Fontes de dados */}
      <div className="px-4 py-3 border-t border-slate-800">
        <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">
          Fontes de dados
        </p>
        <div className="space-y-1">
          <a
            href="https://dadosabertos.camara.leg.br/swagger/api.html"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-slate-500 hover:text-federal transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-federal flex-shrink-0" />
            <span className="truncate">Câmara Federal (API)</span>
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
          </a>
          <a
            href="https://www.camarapoa.rs.gov.br"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-slate-500 hover:text-poa transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-poa flex-shrink-0" />
            <span className="truncate">Câmara POA (scraping)</span>
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
          </a>
        </div>
      </div>

      {/* GitHub link */}
      <div className="px-4 pb-4">
        <a
          href="https://github.com/seu-usuario/legisla-monitor"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs text-slate-600 hover:text-slate-400 transition-colors"
        >
          <Github className="w-3.5 h-3.5" />
          <span>Ver no GitHub</span>
        </a>
      </div>
    </aside>
  );
}
