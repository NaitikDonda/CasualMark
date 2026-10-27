"use client";

import React, { useState } from "react";
import { Search, X, BookOpen, Database, TrendingUp, FlaskConical, FileText, Settings, ShieldCheck } from "lucide-react";
import { NavSection } from "./Sidebar";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (section: NavSection) => void;
}

const ITEMS: { title: string; category: string; section: NavSection; icon: any }[] = [
  { title: "Project Overview & Health", category: "Navigation", section: "overview", icon: ShieldCheck },
  { title: "Uplift Deciles & CATE Curves", category: "Uplift", section: "uplift", icon: TrendingUp },
  { title: "Inspect Protected Notebooks (01-05)", category: "Notebooks", section: "notebooks", icon: BookOpen },
  { title: "Experiment Hypothesis Analyzer", category: "Analysis", section: "experiments", icon: FlaskConical },
  { title: "RAG Evidence & Citations", category: "Intelligence", section: "rag", icon: BookOpen },
  { title: "Dataset & Instruction Previews", category: "Data", section: "data", icon: Database },
  { title: "Model Performance & 5-Fold CV", category: "Models", section: "model", icon: TrendingUp },
  { title: "Evaluation Artifact Completeness", category: "Audit", section: "evaluation", icon: FileText },
  { title: "Audience Targeting Studio", category: "Targeting", section: "targeting", icon: TrendingUp },
  { title: "Generate Safe Evaluation Report", category: "Reports", section: "reports", icon: FileText },
  { title: "Platform Security & Boundaries", category: "Settings", section: "settings", icon: Settings },
];

export function CommandPalette({ isOpen, onClose, onSelect }: CommandPaletteProps) {
  const [query, setQuery] = useState("");

  if (!isOpen) return null;

  const filtered = ITEMS.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-xl glass-panel rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-200 dark:border-white/10 gap-3">
          <Search size={18} className="text-slate-400" />
          <input
            autoFocus
            type="text"
            placeholder="Type a command, artifact, or workspace section…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
          />
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length > 0 ? (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  onClick={() => {
                    onSelect(item.section);
                    onClose();
                  }}
                  className="flex items-center justify-between p-3 rounded-2xl hover:bg-violet-600/10 dark:hover:bg-white/5 cursor-pointer text-xs group transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 group-hover:text-violet-500 transition">
                      <Icon size={16} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{item.title}</p>
                      <p className="text-[10px] text-slate-400">{item.category}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Jump →</span>
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center text-xs text-slate-500">
              No matching sections or commands found.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-slate-100/50 dark:bg-white/5 border-t border-slate-200 dark:border-white/10 flex justify-between items-center text-[10px] text-slate-400 font-mono">
          <span>Navigate with mouse or click</span>
          <span>ESC to close</span>
        </div>
      </div>
    </div>
  );
}
