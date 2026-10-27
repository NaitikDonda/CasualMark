"use client";

import React from "react";
import {
  LayoutDashboard,
  FlaskConical,
  TrendingUp,
  Target,
  Gauge,
  BrainCircuit,
  BookOpen,
  Database,
  CheckCircle2,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck
} from "lucide-react";

export type NavSection =
  | "overview"
  | "experiments"
  | "uplift"
  | "targeting"
  | "model"
  | "rag"
  | "notebooks"
  | "data"
  | "evaluation"
  | "reports"
  | "settings";

interface SidebarProps {
  currentSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

const NAV_ITEMS: { id: NavSection; label: string; icon: any }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "experiments", label: "Experiment Explorer", icon: FlaskConical },
  { id: "uplift", label: "Uplift Analytics", icon: TrendingUp },
  { id: "targeting", label: "Audience Targeting", icon: Target },
  { id: "model", label: "Model Performance", icon: Gauge },
  { id: "rag", label: "RAG Intelligence", icon: BrainCircuit },
  { id: "notebooks", label: "Notebook Inspector", icon: BookOpen },
  { id: "data", label: "Data Explorer", icon: Database },
  { id: "evaluation", label: "Evaluation Center", icon: CheckCircle2 },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "settings", label: "Settings", icon: Settings },
];

export function Sidebar({
  currentSection,
  onSelectSection,
  collapsed,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile
}: SidebarProps) {
  const handleItemClick = (id: NavSection) => {
    onSelectSection(id);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-xs transition-opacity duration-200"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-screen z-40 transition-all duration-300 glass-panel border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between ${
          /* On mobile: slide in/out based on mobileOpen. On lg: visible with collapsed/expanded width */
          mobileOpen ? "translate-x-0 w-64 shadow-2xl" : "-translate-x-full lg:translate-x-0"
        } ${collapsed ? "lg:w-20" : "lg:w-64"}`}
      >
        <div>
          {/* Brand Header */}
          <div className="flex items-center justify-between px-5 h-16 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center font-bold text-white shadow-sm shrink-0">
                CM
              </div>
              {(!collapsed || mobileOpen) && (
                <div className="min-w-0">
                  <span className="font-bold tracking-tight text-base text-slate-900 dark:text-white truncate block">
                    Causal<span className="text-violet-600 dark:text-violet-400">Mark</span>
                  </span>
                  <span className="block text-[10px] tracking-wider uppercase font-semibold text-slate-500 dark:text-slate-400 truncate">
                    Experiment AI
                  </span>
                </div>
              )}
            </div>
            {/* Desktop collapse toggle */}
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition cursor-pointer"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
            {/* Mobile close button */}
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition cursor-pointer"
              title="Close navigation"
            >
              <ChevronLeft size={18} />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1 mt-2 overflow-y-auto max-h-[calc(100vh-140px)]">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = currentSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-xs transition-colors cursor-pointer group ${
                    active
                      ? "bg-violet-600 text-white font-semibold"
                      : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  }`}
                  title={collapsed && !mobileOpen ? item.label : undefined}
                >
                  <Icon
                    size={17}
                    className={`shrink-0 ${
                      active ? "text-white" : "text-slate-500 dark:text-slate-400 group-hover:text-violet-600 dark:group-hover:text-violet-400"
                    }`}
                  />
                  {(!collapsed || mobileOpen) && <span className="truncate text-left">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Safety Badge */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <div className={`flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium ${collapsed && !mobileOpen ? "justify-center" : ""}`}>
            <ShieldCheck size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
            {(!collapsed || mobileOpen) && (
              <div className="leading-tight min-w-0">
                <p className="font-semibold text-emerald-800 dark:text-emerald-300 truncate">Notebook Protection</p>
                <p className="text-[10px] text-emerald-700 dark:text-emerald-400 truncate">Strict Read-Only Mode</p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
