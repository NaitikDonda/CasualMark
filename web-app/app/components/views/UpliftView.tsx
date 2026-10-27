"use client";

import React, { useEffect, useState } from "react";
import {
  TrendingUp,
  BarChart2,
  Users,
  Target,
  AlertCircle,
  HelpCircle,
  Download,
  Info,
  Database,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  RotateCcw
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { fetchApi } from "../../lib/api";
import { useDataset } from "../DatasetProvider";
import { useTheme } from "../ThemeProvider";

export function UpliftView() {
  const { theme } = useTheme();
  const { activeDataset, switchDataset } = useDataset();
  const [deciles, setDeciles] = useState<any[]>([]);
  const [strategies, setStrategies] = useState<any[]>([]);
  const [observedDeciles, setObservedDeciles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFraction, setSelectedFraction] = useState<number>(0.1);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchApi<any[]>("/api/uplift/deciles"),
      fetchApi<any[]>("/api/uplift/strategies"),
      fetchApi<any[]>("/api/uplift/observed_deciles")
    ])
      .then(([decRes, stratRes, obsRes]) => {
        setDeciles(decRes);
        setStrategies(stratRes);
        setObservedDeciles(obsRes);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [activeDataset?.active_id]);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 animate-pulse space-y-3">
        <div className="w-8 h-8 mx-auto border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-medium">Loading dataset analytics & metrics…</p>
      </div>
    );
  }

  // Format Criteo chart data
  const chartData = deciles.map((d) => ({
    decile: `D${d.uplift_decile}`,
    meanLiftPct: Number((d.mean_predicted_uplift * 100).toFixed(3)),
    minLiftPct: Number((d.minimum_uplift * 100).toFixed(3)),
    maxLiftPct: Number((d.maximum_uplift * 100).toFixed(3)),
    customers: d.customers
  }));

  const activeStrategy = strategies.find((s) => s.target_fraction === selectedFraction) || strategies[1] || {};

  const isUploadedDataset = activeDataset && !activeDataset.is_benchmark;
  const analysis = activeDataset?.analysis;

  return (
    <div className="space-y-8">
      {/* Active Dataset Identity & Provenance Banner */}
      <div className="p-6 rounded-3xl glass-panel border border-violet-500/20">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 text-violet-500 text-xs font-semibold mb-2">
              <Database size={13} />
              Active Dataset: <span className="font-bold underline">{activeDataset?.dataset_name}</span>
              <span className="text-slate-400">({activeDataset?.evaluated_users?.toLocaleString()} Evaluated Users)</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              {isUploadedDataset ? "A/B Experiment & Group Causal Uplift" : "Two-Model Conditional Average Treatment Effect (CATE)"}
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 max-w-2xl">
              {isUploadedDataset
                ? `Computed strictly from uploaded file '${activeDataset?.filename}'. Comparing Treatment '${activeDataset?.treatment_label}' against Control '${activeDataset?.control_label}' on outcome '${activeDataset?.outcome_column}'.`
                : "Criteo Uplift Benchmark evaluating 35,000 customers with XGBoost two-model CATE deciles and cumulative targeting efficiency."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isUploadedDataset && (
              <button
                onClick={() => switchDataset("criteo_benchmark")}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-200/60 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-xs font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer"
              >
                <RotateCcw size={14} /> Switch to Criteo Benchmark
              </button>
            )}
          </div>
        </div>
      </div>

      {/* CASE A: User Uploaded Dataset Active -> Render Real A/B Metrics */}
      {isUploadedDataset && analysis && (
        <div className="space-y-6">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl glass-panel border border-slate-200/60 dark:border-white/10">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
                Treatment Rate ({activeDataset?.treatment_label})
              </span>
              <span className="text-2xl font-black text-emerald-500 mt-2 block">
                {analysis.treatment_rate_pct}%
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">
                {analysis.treatment_conversions?.toLocaleString()} of {analysis.treatment_users?.toLocaleString()} users
              </span>
            </div>

            <div className="p-5 rounded-2xl glass-panel border border-slate-200/60 dark:border-white/10">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
                Control Rate ({activeDataset?.control_label})
              </span>
              <span className="text-2xl font-black text-slate-700 dark:text-slate-300 mt-2 block">
                {analysis.control_rate_pct}%
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">
                {analysis.control_conversions?.toLocaleString()} of {analysis.control_users?.toLocaleString()} users
              </span>
            </div>

            <div className="p-5 rounded-2xl glass-panel border border-slate-200/60 dark:border-white/10">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
                Absolute Uplift
              </span>
              <span className="text-2xl font-black text-violet-400 mt-2 block">
                {analysis.absolute_lift_pp > 0 ? "+" : ""}{analysis.absolute_lift_pp} pp
              </span>
              <span className="text-[11px] text-emerald-500 font-semibold mt-1 block">
                Relative Lift: {analysis.relative_lift_pct > 0 ? "+" : ""}{analysis.relative_lift_pct}%
              </span>
            </div>

            <div className="p-5 rounded-2xl glass-panel border border-slate-200/60 dark:border-white/10">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
                Statistical Significance
              </span>
              <span className="text-2xl font-black text-cyan-400 mt-2 block">
                Z = {analysis.z_score}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block font-mono">
                p-value: {analysis.p_value.toExponential ? analysis.p_value.toExponential(4) : analysis.p_value}
              </span>
            </div>
          </div>

          {/* Group Comparison Bar Chart */}
          <div className="p-6 rounded-3xl glass-panel border border-slate-200/60 dark:border-white/10">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <BarChart2 size={18} className="text-violet-500" />
              Observed Conversion Comparison ({activeDataset?.dataset_name})
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Conversion rate comparison between Treatment ({activeDataset?.treatment_label}) and Control ({activeDataset?.control_label}) cohorts.
            </p>

              <div className="h-64 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { group: `Control (${activeDataset?.control_label})`, rate: analysis.control_rate_pct, count: analysis.control_users },
                      { group: `Treatment (${activeDataset?.treatment_label})`, rate: analysis.treatment_rate_pct, count: analysis.treatment_users }
                    ]}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#283244" : "#e2e8f0"} />
                    <XAxis dataKey="group" tick={{ fill: theme === "dark" ? "#a0aec0" : "#536176", fontSize: 11 }} />
                    <YAxis tick={{ fill: theme === "dark" ? "#a0aec0" : "#536176", fontSize: 11 }} unit="%" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: theme === "dark" ? "#121722" : "#ffffff",
                        borderColor: theme === "dark" ? "#283244" : "#dce3ec",
                        borderRadius: "10px",
                        color: theme === "dark" ? "#f1f5f9" : "#172033",
                        fontSize: "12px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
                      }}
                      itemStyle={{ color: theme === "dark" ? "#f1f5f9" : "#172033" }}
                      formatter={(val: any) => [`${val}%`, "Conversion Rate"]}
                    />
                    <Bar dataKey="rate" fill="#7047d6" radius={[6, 6, 0, 0]} maxBarSize={60} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Detailed Statistical Summary and Honest Causal Warning */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div className="p-4 sm:p-5 rounded-xl glass-panel border border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                  Confidence Interval & Significance
                </h4>
                <div className="p-3.5 rounded-lg bg-slate-100 dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 font-mono text-xs leading-relaxed border border-slate-200 dark:border-slate-800">
                  95% Confidence Interval for Absolute Lift:
                  <br />
                  <span className="text-slate-900 dark:text-white font-bold">
                    [{analysis.confidence_interval?.ci_lower_pp} pp, {analysis.confidence_interval?.ci_upper_pp} pp]
                  </span>
                  <br />
                  Interval includes zero: {analysis.confidence_interval?.interval_includes_zero ? "Yes (Inconclusive)" : "No (Statistically Significant)"}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {analysis.summary}
                </p>
              </div>

              <div className="p-4 sm:p-5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 space-y-2">
                <span className="font-bold flex items-center gap-1.5">
                  <AlertCircle size={15} /> Methodological Boundary & Uplift Model Notice
                </span>
                <p>
                  This uploaded dataset does not contain individual-level CATE predictions because it has not been processed through the pre-trained Criteo XGBoost uplift pipeline (requires dense features f0–f11).
                </p>
                <p>
                  <strong>Honest Causal Reporting:</strong> To prevent data contamination, Criteo decile curves are NOT substituted for this dataset. Observed A/B lift assumes proper randomized assignment without unobserved confounding.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* CASE B: Benchmark Criteo Active -> Render 10 Deciles & Policy Comparison */}
        {!isUploadedDataset && (
          <div className="space-y-6 sm:space-y-8 min-w-0">
            {/* Decile Uplift Distribution Chart */}
            <div className="p-5 sm:p-6 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <BarChart2 size={17} className="text-violet-600 dark:text-violet-400" />
                    Predicted Uplift by Decile (D10 = Highest Predicted Lift)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Top deciles represent the highest predicted sensitivity to marketing treatment.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <span className="w-2.5 h-2.5 rounded bg-violet-600 inline-block" /> Mean Uplift (%)
                </div>
              </div>

              <div className="h-64 sm:h-72 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#283244" : "#e2e8f0"} />
                    <XAxis dataKey="decile" tick={{ fill: theme === "dark" ? "#a0aec0" : "#536176", fontSize: 11 }} />
                    <YAxis tick={{ fill: theme === "dark" ? "#a0aec0" : "#536176", fontSize: 11 }} unit="%" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: theme === "dark" ? "#121722" : "#ffffff",
                        borderColor: theme === "dark" ? "#283244" : "#dce3ec",
                        borderRadius: "10px",
                        color: theme === "dark" ? "#f1f5f9" : "#172033",
                        fontSize: "12px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
                      }}
                      itemStyle={{ color: theme === "dark" ? "#f1f5f9" : "#172033" }}
                      formatter={(val: any) => [`${val}%`, "Mean Predicted Lift"]}
                    />
                    <Bar dataKey="meanLiftPct" fill="#7047d6" radius={[4, 4, 0, 0]} maxBarSize={45} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          {/* Interactive Targeting Strategy Calculator */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl glass-panel border border-slate-200/60 dark:border-white/10 lg:col-span-1 space-y-5">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Target size={18} className="text-cyan-400" /> Targeting Coverage Selector
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Select what top fraction of the audience to target based on rank-ordered predicted uplift.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span>Target Top:</span>
                  <span className="text-violet-500 font-bold">{(selectedFraction * 100).toFixed(0)}% of Population</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[0.05, 0.1, 0.2, 0.3, 0.5, 1.0].map((frac) => (
                    <button
                      key={frac}
                      onClick={() => setSelectedFraction(frac)}
                      className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                        selectedFraction === frac
                          ? "bg-violet-600 text-white shadow-md shadow-violet-600/20"
                          : "bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      Top {(frac * 100).toFixed(0)}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Strategy Impact Card */}
              <div className="p-4 rounded-xl bg-violet-600/10 border border-violet-600/20 space-y-3">
                <div>
                  <span className="text-[11px] font-semibold text-violet-700 dark:text-violet-400 uppercase tracking-wider">
                    Targeted Audience
                  </span>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">
                    {activeStrategy.customers_targeted?.toLocaleString() || "—"} Customers
                  </p>
                </div>
                <div className="pt-2 border-t border-violet-600/10 flex justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Mean Lift</span>
                    <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                      +{(activeStrategy.mean_predicted_uplift * 100)?.toFixed(3)}%
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block">Incremental Conversions</span>
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                      +{activeStrategy.sum_predicted_uplift?.toFixed(1) || "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Strategy Comparison Table */}
            <div className="p-5 sm:p-6 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 lg:col-span-2 min-w-0">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white mb-3">
                Targeting Policy Comparison (<span className="font-mono text-xs text-slate-500">criteo_uplift_strategy_comparison.csv</span>)
              </h3>
              <div className="table-responsive-container">
                <table className="w-full text-left text-xs min-w-[500px]">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                      <th className="pb-2.5">Strategy</th>
                      <th className="pb-2.5">Target Coverage</th>
                      <th className="pb-2.5">Customers</th>
                      <th className="pb-2.5">Mean Uplift</th>
                      <th className="pb-2.5">Incremental Sum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                    {strategies.map((st, i) => (
                      <tr
                        key={i}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition ${
                          selectedFraction === st.target_fraction ? "bg-violet-600/10 font-bold" : ""
                        }`}
                      >
                        <td className="py-2.5 font-sans font-medium text-slate-900 dark:text-white">{st.strategy}</td>
                        <td className="py-2.5 text-slate-600 dark:text-slate-400">{(st.target_fraction * 100).toFixed(0)}%</td>
                        <td className="py-2.5 text-slate-700 dark:text-slate-300">{st.customers_targeted.toLocaleString()}</td>
                        <td className="py-2.5 text-emerald-600 dark:text-emerald-400 font-semibold">+{(st.mean_predicted_uplift * 100).toFixed(3)}%</td>
                        <td className="py-2.5 text-violet-700 dark:text-violet-400 font-semibold">+{st.sum_predicted_uplift.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
