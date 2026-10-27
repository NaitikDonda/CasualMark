"use client";

import React from "react";
import { Sun, Moon, Search, Database, ChevronDown, Check, Sparkles, Menu } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { useDataset } from "./DatasetProvider";

interface HeaderProps {
  collapsed: boolean;
  onOpenCommand: () => void;
  title: string;
  onOpenMobileMenu?: () => void;
}

export function Header({ collapsed, onOpenCommand, title, onOpenMobileMenu }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { activeDataset, userDatasets, switchDataset, loading } = useDataset();

  return (
    <header
      className={`fixed top-0 right-0 h-16 z-20 glass-panel border-b border-slate-200 dark:border-slate-800 transition-all duration-300 flex items-center justify-between px-4 sm:px-6 ${
        collapsed ? "left-0 lg:left-20" : "left-0 lg:left-64"
      }`}
    >
      {/* Title & Active Dataset Selector */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        {/* Mobile Hamburger Menu Toggle */}
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>

        <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 capitalize truncate">
          {title}
        </h1>

        {/* Global Dataset Selector Pill */}
        <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs">
          <div className="flex items-center gap-1 text-slate-500 font-medium">
            <Database size={13} className="text-violet-600 dark:text-violet-400 shrink-0" />
            <span className="text-[11px] uppercase tracking-wider font-semibold">Dataset:</span>
          </div>
          <select
            value={activeDataset?.active_id || "criteo_benchmark"}
            onChange={(e) => switchDataset(e.target.value)}
            disabled={loading}
            className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer max-w-[180px] sm:max-w-[240px] truncate"
          >
            <option value="criteo_benchmark" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
              Criteo Benchmark (35k)
            </option>
            {userDatasets.map((ud) => (
              <option key={ud.upload_id} value={ud.upload_id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                {ud.filename} ({ud.total_rows.toLocaleString()})
              </option>
            ))}
          </select>
          {activeDataset && !activeDataset.is_benchmark && (
            <span className="px-1.5 py-0.5 rounded-md bg-violet-600/10 text-violet-700 dark:text-violet-400 text-[10px] font-bold shrink-0">
              Active
            </span>
          )}
        </div>
      </div>

      {/* Global Actions */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Search / Command palette trigger */}
        <button
          onClick={onOpenCommand}
          className="flex items-center gap-2 sm:gap-3 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:border-violet-500 text-xs font-medium transition cursor-pointer"
        >
          <Search size={14} className="shrink-0" />
          <span className="hidden md:inline text-xs">Search artifacts, models…</span>
          <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px] font-mono">
            ⌘K
          </span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400 transition cursor-pointer"
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </div>
    </header>
  );
}
