"use client";

import React, { useState } from "react";
import {
  Settings,
  ShieldCheck,
  Server,
  Terminal,
  Cpu,
  Lock,
  RefreshCw,
  CheckCircle2
} from "lucide-react";
import { useTheme } from "../ThemeProvider";

export function SettingsView() {
  const { theme, toggleTheme } = useTheme();
  const [tested, setTested] = useState(false);

  return (
    <div className="space-y-8">
      <div className="p-6 rounded-3xl glass-panel border border-violet-500/20">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Settings size={24} className="text-violet-500" />
          Platform Settings & Security Boundaries
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Inspect configuration status, sandbox protection policies, and local runtime environments.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Security & Sandbox Policies */}
        <div className="p-6 rounded-3xl glass-panel border border-slate-200/60 dark:border-white/10 space-y-4">
          <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-500" /> Notebook Read-Only Sandbox
          </h3>
          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-300 font-medium">OS File Permissions</span>
              <span className="font-mono text-emerald-500 font-bold">chmod 444 (Active)</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-300 font-medium">API Write Policy</span>
              <span className="font-mono text-emerald-500 font-bold">HTTP 403 Forbidden</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-300 font-medium">Path Traversal Guard</span>
              <span className="font-mono text-emerald-500 font-bold">Safe Root Resolution</span>
            </div>
          </div>
        </div>

        {/* Runtime & Connectivity */}
        <div className="p-6 rounded-3xl glass-panel border border-slate-200/60 dark:border-white/10 space-y-4">
          <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Server size={18} className="text-cyan-400" /> Runtime Connections
          </h3>
          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-300 font-medium">FastAPI Backend</span>
              <span className="font-mono text-violet-400 font-bold">http://127.0.0.1:8005</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-300 font-medium">Local LLM Environment</span>
              <span className="font-mono text-slate-400 font-bold">Qwen3 / LoRA (Offline)</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-300 font-medium">Active UI Theme</span>
              <span className="font-bold capitalize">{theme} Mode</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
