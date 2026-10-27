"use client";

import React, { useEffect, useState } from "react";
import {
  FileText,
  Download,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Calendar
} from "lucide-react";
import { fetchApi } from "../../lib/api";

export function ReportsView() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [reportType, setReportType] = useState("executive");
  const [genSuccess, setGenSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchApi<any[]>("/api/reports")
      .then((res) => {
        setReports(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleGenerateReport = async () => {
    setGenerating(true);
    setGenSuccess(null);
    try {
      const res = await fetchApi<any>("/api/reports/generate", {
        method: "POST",
        body: JSON.stringify({
          report_type: reportType,
          title: `CausalMark ${reportType.toUpperCase()} Report`
        })
      });
      setGenSuccess(res.message);
      // Refresh list
      const updated = await fetchApi<any[]>("/api/reports");
      setReports(updated);
    } catch (err: any) {
      alert("Failed to generate report: " + err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="p-6 rounded-3xl glass-panel border border-violet-500/20">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <FileText size={24} className="text-violet-500" />
          Verified Evaluation Reports & Audit Center
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Export deterministic analytics summaries and generate structured audit reports in an isolated safe workspace without altering notebooks.
        </p>
      </div>

      {/* Report Generator Controls */}
      <div className="p-6 rounded-3xl glass-panel border border-slate-200/60 dark:border-white/10 space-y-4">
        <h3 className="font-bold text-base text-slate-900 dark:text-white">
          Generate Safe Evaluation Report
        </h3>
        <p className="text-xs text-slate-500">
          Generated reports are saved strictly to <code className="font-mono">results/generated_reports/</code> with timestamps and provenance metadata.
        </p>

        <div className="flex flex-wrap items-center gap-4">
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-200"
          >
            <option value="executive">Executive Summary (CausalMark Master)</option>
            <option value="uplift_targeting">Uplift & CATE Policy Audit</option>
            <option value="model_performance">Model Factual Accuracy & CV Audit</option>
            <option value="project_readiness">Production Submission Readiness</option>
          </select>

          <button
            onClick={handleGenerateReport}
            disabled={generating}
            className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs transition shadow-md shadow-violet-600/20 flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle size={15} />
            {generating ? "Generating in isolated workspace…" : "Generate Report"}
          </button>
        </div>

        {genSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 size={16} /> {genSuccess}
          </div>
        )}
      </div>

      {/* Existing Reports List */}
      <div className="p-6 rounded-3xl glass-panel border border-slate-200/60 dark:border-white/10">
        <h3 className="font-bold text-base text-slate-900 dark:text-white mb-4">
          Existing Reports & Final Deliverables ({reports.length})
        </h3>

        <div className="space-y-3">
          {reports.map((rep, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-slate-100/50 dark:bg-white/5 border border-slate-200/40 dark:border-white/5 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-500">
                  <FileText size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    {rep.name}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {rep.path} · {(rep.size_bytes / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full bg-slate-200 dark:bg-white/10 text-xs font-medium text-slate-600 dark:text-slate-300">
                {rep.type}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
