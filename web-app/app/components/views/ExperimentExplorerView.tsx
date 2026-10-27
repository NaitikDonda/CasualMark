"use client";

import React, { useEffect, useState } from "react";
import {
  FlaskConical,
  Play,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Percent,
  Sparkles,
  BarChart3
} from "lucide-react";
import { fetchApi } from "../../lib/api";

export function ExperimentExplorerView() {
  const [experiments, setExperiments] = useState<any[]>([]);
  const [selectedExp, setSelectedExp] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Live calculator inputs
  const [treatmentConversions, setTreatmentConversions] = useState(900);
  const [treatmentUsers, setTreatmentUsers] = useState(10000);
  const [controlConversions, setControlConversions] = useState(700);
  const [controlUsers, setControlUsers] = useState(10000);
  const [alpha, setAlpha] = useState(0.05);

  const [calcResult, setCalcResult] = useState<any | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);

  useEffect(() => {
    fetchApi<any[]>("/api/experiments")
      .then((res) => {
        setExperiments(res);
        if (res.length > 0) {
          setSelectedExp(res[0]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleRunAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    setCalcError(null);
    setCalcLoading(true);
    try {
      const res = await fetchApi<any>("/api/analyze", {
        method: "POST",
        body: JSON.stringify({
          experiment_id: "EXP_LIVE",
          treatment_conversions: Number(treatmentConversions),
          treatment_users: Number(treatmentUsers),
          control_conversions: Number(controlConversions),
          control_users: Number(controlUsers),
          alpha: Number(alpha)
        })
      });
      setCalcResult(res);
    } catch (err: any) {
      setCalcError(err.message);
    } finally {
      setCalcLoading(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 min-w-0">
      {/* Overview Banner */}
      <div className="p-5 sm:p-6 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <FlaskConical size={22} className="text-violet-600 dark:text-violet-400 shrink-0" />
          Frequentist & Causal Experiment Analysis
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
          Evaluate randomized A/B experiments using verified statistical significance tests, lift confidence intervals, and two-sample proportion hypotheses.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Saved Experiments from experiment_data.csv */}
        <div className="lg:col-span-5 space-y-3 min-w-0">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">
            Verified Project Experiments ({experiments.length})
          </h3>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {experiments.map((exp) => {
              const active = selectedExp?.experiment_id === exp.experiment_id;
              const conv = exp.analysis?.conversion_analysis;
              const sig = exp.analysis?.significance_analysis;

              return (
                <div
                  key={exp.experiment_id}
                  onClick={() => setSelectedExp(exp)}
                  className={`p-3.5 sm:p-4 rounded-xl cursor-pointer border transition text-left ${
                    active
                      ? "bg-violet-600/10 border-violet-600/40 shadow-xs"
                      : "bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                      {exp.experiment_id}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                        sig?.statistically_significant
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20"
                      }`}
                    >
                      {sig?.statistically_significant ? "Significant" : "Inconclusive"}
                    </span>
                  </div>

                  <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs">
                    <div className="min-w-0">
                      <span className="text-slate-500 block text-[10px] truncate">Treatment Rate</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                        {conv?.treatment_rate_pct}% ({exp.treatment_conversions}/{exp.treatment_users})
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-slate-500 block text-[10px] truncate">Control Rate</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                        {conv?.control_rate_pct}% ({exp.control_conversions}/{exp.control_users})
                      </span>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Absolute Lift:</span>
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                      +{conv?.absolute_lift_pp} pp
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Experiment Analyzer & Hypothesis Test */}
        <div className="lg:col-span-7 space-y-5 min-w-0">
          <div className="p-5 sm:p-6 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white mb-1">
              Interactive Experiment Hypothesis Analyzer
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-normal">
              Enter treatment and control cohort counts to compute two-sample Z-scores, p-values, and 95% lift confidence intervals.
            </p>

            <form onSubmit={handleRunAnalysis} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Treatment Conversions
                  </label>
                  <input
                    type="number"
                    value={treatmentConversions}
                    onChange={(e) => setTreatmentConversions(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Treatment Group Size (N)
                  </label>
                  <input
                    type="number"
                    value={treatmentUsers}
                    onChange={(e) => setTreatmentUsers(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Control Conversions
                  </label>
                  <input
                    type="number"
                    value={controlConversions}
                    onChange={(e) => setControlConversions(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Control Group Size (N)
                  </label>
                  <input
                    type="number"
                    value={controlUsers}
                    onChange={(e) => setControlUsers(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={calcLoading}
                className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play size={14} /> {calcLoading ? "Computing Statistics…" : "Run Verified Analysis"}
              </button>
            </form>

            {calcError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
                {calcError}
              </div>
            )}

            {/* Analysis Output */}
            {calcResult && (
              <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Absolute Lift</span>
                    <span className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400">
                      +{calcResult.conversion_analysis.absolute_lift_pp} pp
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Relative Lift</span>
                    <span className="text-sm sm:text-base font-black text-violet-600 dark:text-violet-400">
                      +{calcResult.conversion_analysis.relative_lift_pct}%
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 block">P-Value</span>
                    <span className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-200">
                      {calcResult.significance_analysis.p_value.toFixed(5)}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Significance</span>
                    <span
                      className={`text-xs font-bold ${
                        calcResult.significance_analysis.statistically_significant
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {calcResult.significance_analysis.statistically_significant
                        ? "Significant"
                        : "Inconclusive"}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-mono leading-relaxed">
                  <span className="text-violet-600 dark:text-violet-400 font-bold block mb-1">Deterministic Summary:</span>
                  {calcResult.summary}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
