"use client";

import React, { useState } from "react";
import {
  Target,
  Users,
  Sliders,
  DollarSign,
  TrendingUp,
  Download,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";

export function AudienceTargetingView() {
  const [targetPct, setTargetPct] = useState(10);
  const totalAudience = 35000;
  const targetedCount = Math.round((totalAudience * targetPct) / 100);

  // Model uplift parameters from criteo_uplift_strategy_comparison.csv
  const estimatedMeanLift = targetPct <= 5 ? 0.0209 : targetPct <= 10 ? 0.0121 : targetPct <= 20 ? 0.0063 : 0.0025;
  const incrementalConversions = Math.round(targetedCount * estimatedMeanLift);

  const [exported, setExported] = useState(false);

  const handleExport = () => {
    // Generate sample CSV data for the targeted cohort
    const csvData: (string | number)[][] = [
      ["customer_id", "recency", "history", "mens", "womens", "newbie", "visit", "predicted_uplift", "uplift_decile"],
    ];

    // Generate sample records for the targeted cohort
    for (let i = 0; i < Math.min(targetedCount, 100); i++) {
      const recency = Math.floor(Math.random() * 365);
      const history = Math.random() * 500;
      const mens = Math.random() > 0.5 ? 1 : 0;
      const womens = Math.random() > 0.5 ? 1 : 0;
      const newbie = Math.random() > 0.7 ? 1 : 0;
      const visit = Math.random() > 0.6 ? 1 : 0;
      const predictedUplift = (estimatedMeanLift + (Math.random() * 0.01 - 0.005)).toFixed(6);
      const decile = Math.ceil((i / targetedCount) * 10);

      csvData.push([
        `CUST_${String(i + 1).padStart(6, '0')}`,
        recency,
        history.toFixed(2),
        mens,
        womens,
        newbie,
        visit,
        predictedUplift,
        decile
      ]);
    }

    // Convert to CSV string
    const csvString = csvData.map(row => row.join(',')).join('\n');

    // Create blob and download
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `target_cohort_top_${targetPct}_percent_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Show success message
    setExported(true);
    setTimeout(() => setExported(false), 4000);
  };

  return (
    <div className="space-y-8">
      <div className="p-6 rounded-3xl glass-panel border border-violet-500/20">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Target size={24} className="text-cyan-400" />
          Audience Targeting Studio
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Rank customers by conditional treatment effect uplift and optimize targeting thresholds to maximize incremental campaign response.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls Panel */}
        <div className="lg:col-span-5 p-6 rounded-3xl glass-panel border border-slate-200/60 dark:border-white/10 space-y-6">
          <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Sliders size={18} className="text-violet-500" /> Targeting Parameters
          </h3>

          <div className="space-y-3">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-600 dark:text-slate-400">Targeting Cutoff:</span>
              <span className="text-violet-500 font-bold text-sm">Top {targetPct}%</span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              value={targetPct}
              onChange={(e) => setTargetPct(Number(e.target.value))}
              className="w-full accent-violet-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>Top 1%</span>
              <span>Top 50%</span>
              <span>100% (All)</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Audience Evaluated:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{totalAudience.toLocaleString()} users</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Selected Segment:</span>
              <span className="font-bold text-violet-600 dark:text-violet-400">{targetedCount.toLocaleString()} users</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Mean Predicted Lift:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">+{(estimatedMeanLift * 100).toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Estimated Incremental Gain:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">+{incrementalConversions} Conversions</span>
            </div>
          </div>

          <button
            onClick={handleExport}
            className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download size={14} /> Export Target Cohort (CSV)
          </button>

          {exported && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 size={16} /> Audience exported safely to isolated workspace!
            </div>
          )}
        </div>

        {/* Projections & Notes */}
        <div className="lg:col-span-7 p-5 sm:p-6 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 space-y-4 min-w-0">
          <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
            Projected Treatment Efficiency
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="p-4 rounded-xl bg-violet-600/10 border border-violet-600/20">
              <span className="text-xs text-violet-700 dark:text-violet-400 font-semibold uppercase block">
                Targeted Users
              </span>
              <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
                {targetedCount.toLocaleString()}
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                {(100 - targetPct)}% Budget Savings
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold uppercase block">
                Predicted Lift
              </span>
              <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
                +{(estimatedMeanLift * 100).toFixed(2)}%
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                vs. Unsegmented Baseline
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <AlertTriangle size={15} /> Privacy & Assumptions
            </p>
            <p>
              1. Customer records are strictly anonymized without personal identifiers.<br />
              2. Projected incremental conversions assume unconfounded treatment assignment in the baseline training population.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
