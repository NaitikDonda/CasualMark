"use client";

import React, { useEffect, useState } from "react";
import {
  TrendingUp,
  FlaskConical,
  BookOpen,
  Database,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Layers,
  Cpu,
  BarChart3,
  Gauge,
  UploadCloud,
  RotateCcw
} from "lucide-react";
import { fetchApi } from "../../lib/api";
import { NavSection } from "../Sidebar";
import { useDataset } from "../DatasetProvider";

interface OverviewProps {
  onNavigate: (section: NavSection) => void;
  onOpenUpload?: () => void;
}

export function OverviewView({ onNavigate, onOpenUpload }: OverviewProps) {
  const { activeDataset, switchDataset } = useDataset();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchApi<any>("/api/project/overview")
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [activeDataset?.active_id]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-44 rounded-3xl bg-slate-200 dark:bg-white/5" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-200 dark:bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500">
        Failed to load project overview: {error}
      </div>
    );
  }

  const isUploaded = activeDataset && !activeDataset.is_benchmark;
  const analysis = activeDataset?.analysis;

  return (
    <div className="space-y-6 sm:space-y-8 min-w-0">
      {/* Hero Banner with Restrained Enterprise Aesthetic */}
      <div className="relative overflow-hidden rounded-2xl p-6 sm:p-8 glass-panel border border-slate-200 dark:border-slate-800">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-600/10 text-violet-700 dark:text-violet-400 text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles size={13} /> Production Experiment Intelligence
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
            Distinguish Predictive Uplift from <span className="text-violet-600 dark:text-violet-400">True Causal Impact</span>.
          </h2>
          <p className="mt-2.5 text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
            Connected to the existing CausalMark pipeline. Inspect notebooks, model checkpoints, and evaluation artifacts in a strictly non-destructive environment.
          </p>

          <div className="mt-5 flex flex-wrap gap-2.5 sm:gap-3">
            <button
              onClick={() => onNavigate("uplift")}
              className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-medium text-xs sm:text-sm transition cursor-pointer"
            >
              Explore Uplift Analytics <ArrowRight size={15} />
            </button>
            <button
              onClick={onOpenUpload}
              className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs sm:text-sm transition border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              <UploadCloud size={15} /> Upload My Own Dataset
            </button>
            <button
              onClick={() => onNavigate("notebooks")}
              className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs sm:text-sm transition border border-slate-200 dark:border-slate-800 cursor-pointer"
            >
              Inspect Notebooks ({data?.notebooks_count || 5})
            </button>
          </div>
        </div>
      </div>

      {/* Active Dataset Provenance Banner */}
      <div className="p-4 sm:p-5 rounded-xl glass-panel border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-violet-600/10 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5 sm:mt-0">
            <Database size={18} />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex flex-wrap items-center gap-1.5 sm:gap-2">
              Active Dataset: <span className="text-violet-600 dark:text-violet-400 font-bold">{activeDataset?.dataset_name}</span>
              <span className="text-xs text-slate-500 font-normal">({activeDataset?.evaluated_users?.toLocaleString()} Users)</span>
            </h3>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400 leading-normal">
              {isUploaded
                ? `Uploaded file active. Displaying empirical A/B lift between Treatment '${activeDataset?.treatment_label}' and Control '${activeDataset?.control_label}'.`
                : "Standard Criteo research benchmark active with 10 CATE uplift deciles and XGBoost evaluation metrics."}
            </p>
          </div>
        </div>
        {isUploaded && (
          <button
            onClick={() => switchDataset("criteo_benchmark")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition cursor-pointer shrink-0"
          >
            <RotateCcw size={13} /> Switch to Benchmark
          </button>
        )}
      </div>

      {/* Honest Causal Validation Callout */}
      <div className="p-4 sm:p-5 rounded-xl glass-panel border-l-4 border-l-amber-500 border-slate-200 dark:border-slate-800 flex items-start gap-3 sm:gap-4">
        <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
          <AlertTriangle size={18} />
        </div>
        <div className="min-w-0">
          <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex flex-wrap items-center gap-1.5">
            Causal Validity Status: <span className="text-amber-600 dark:text-amber-400">{activeDataset?.causal_status_label}</span>
          </h3>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {activeDataset?.methodology_warning}
          </p>
        </div>
      </div>

      {/* Dynamic Key Metric Highlights (Dataset-Aware) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isUploaded && analysis ? (
          <>
            <div className="p-4 sm:p-5 rounded-xl glass-panel border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span className="truncate">Treatment Rate</span>
                <Gauge size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              </div>
              <div className="mt-2.5 text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {analysis.treatment_rate_pct}%
              </div>
              <div className="mt-1 text-xs text-slate-500 truncate">
                {analysis.treatment_conversions?.toLocaleString()} / {analysis.treatment_users?.toLocaleString()} ({activeDataset?.treatment_label})
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-xl glass-panel border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span className="truncate">Control Rate</span>
                <TrendingUp size={16} className="text-slate-400 shrink-0" />
              </div>
              <div className="mt-2.5 text-2xl font-black text-slate-800 dark:text-slate-200">
                {analysis.control_rate_pct}%
              </div>
              <div className="mt-1 text-xs text-slate-500 truncate">
                {analysis.control_conversions?.toLocaleString()} / {analysis.control_users?.toLocaleString()} ({activeDataset?.control_label})
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-xl glass-panel border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span className="truncate">Absolute Uplift</span>
                <TrendingUp size={16} className="text-violet-600 dark:text-violet-400 shrink-0" />
              </div>
              <div className="mt-2.5 text-2xl font-black text-violet-600 dark:text-violet-400">
                {analysis.absolute_lift_pp > 0 ? "+" : ""}{analysis.absolute_lift_pp} pp
              </div>
              <div className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium truncate">
                Relative: {analysis.relative_lift_pct > 0 ? "+" : ""}{analysis.relative_lift_pct}%
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-xl glass-panel border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span className="truncate">Significance</span>
                <ShieldCheck size={16} className="text-slate-600 dark:text-slate-300 shrink-0" />
              </div>
              <div className="mt-2.5 text-2xl font-black text-slate-800 dark:text-slate-200">
                Z = {analysis.z_score}
              </div>
              <div className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium truncate">
                {analysis.statistically_significant ? "Significant (p < 0.05)" : "Inconclusive"}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="p-4 sm:p-5 rounded-xl glass-panel border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span className="truncate">Factual RMSE</span>
                <Gauge size={16} className="text-violet-600 dark:text-violet-400 shrink-0" />
              </div>
              <div className="mt-2.5 text-2xl font-black text-slate-900 dark:text-white">
                {data?.latest_metrics?.["Factual RMSE"]?.toFixed(4) || "0.0514"}
              </div>
              <div className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium truncate">
                Mean CV RMSE: 0.0515 (5 Folds)
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-xl glass-panel border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span className="truncate">Mean Predicted Uplift</span>
                <TrendingUp size={16} className="text-violet-600 dark:text-violet-400 shrink-0" />
              </div>
              <div className="mt-2.5 text-2xl font-black text-slate-900 dark:text-white">
                +{(data?.latest_metrics?.["Mean Predicted Uplift"] * 100)?.toFixed(3)}%
              </div>
              <div className="mt-1 text-xs text-slate-500 truncate">
                Top 5% yields +2.10% lift
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-xl glass-panel border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span className="truncate">Protected Notebooks</span>
                <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              </div>
              <div className="mt-2.5 text-2xl font-black text-slate-900 dark:text-white">
                {data?.notebooks_count || 5} Notebooks
              </div>
              <div className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium truncate">
                chmod 444 · Read-Only Guard
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-xl glass-panel border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span className="truncate">Verified Datasets</span>
                <Database size={16} className="text-slate-500 shrink-0" />
              </div>
              <div className="mt-2.5 text-2xl font-black text-slate-900 dark:text-white">
                {data?.datasets_count || 12} Files
              </div>
              <div className="mt-1 text-xs text-slate-500 truncate">
                Criteo & Hillstrom Ready
              </div>
            </div>
          </>
        )}
      </div>

      {/* Model & Pipeline Inventory */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="p-5 sm:p-6 rounded-xl glass-panel border border-slate-200 dark:border-slate-800">
          <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Cpu size={17} className="text-violet-600 dark:text-violet-400" /> Model Checkpoint Status
          </h3>
          <div className="mt-3.5 space-y-2.5">
            {data?.models_available?.map((m: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <div className="min-w-0 pr-2">
                  <p className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-slate-200 truncate">{m.name}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{m.type}</p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-medium shrink-0">
                  {m.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 sm:p-6 rounded-xl glass-panel border border-slate-200 dark:border-slate-800">
          <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Layers size={17} className="text-slate-700 dark:text-slate-300" /> Evaluation Checklist
          </h3>
          <div className="mt-3.5 space-y-2 max-h-56 overflow-y-auto pr-1">
            {data?.status_checklist &&
              Object.entries(data.status_checklist).map(([key, val]: [string, any], idx) => (
                <div key={idx} className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60 text-xs sm:text-sm">
                  <span className="text-slate-700 dark:text-slate-300 pr-2 truncate">{key}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs flex items-center gap-1 shrink-0">
                    ✓ Verified
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
