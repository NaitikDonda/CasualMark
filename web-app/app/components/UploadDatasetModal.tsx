"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  X,
  CheckCircle2,
  AlertTriangle,
  Play,
  Table,
  Check,
  RefreshCw,
  Info,
  ShieldCheck,
  ChevronRight,
  ArrowRight
} from "lucide-react";
import { API_BASE_URL } from "../lib/api";
import { useDataset } from "./DatasetProvider";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function UploadDatasetModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
  const { refreshDatasetState, switchDataset } = useDataset();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Column Mapping selections
  const [treatmentCol, setTreatmentCol] = useState<string>("");
  const [outcomeCol, setOutcomeCol] = useState<string>("");
  const [customerIdCol, setCustomerIdCol] = useState<string>("");
  const [treatmentVal, setTreatmentVal] = useState<string>("");
  const [controlVal, setControlVal] = useState<string>("");

  // Analysis Result
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [confirmedAnalysis, setConfirmedAnalysis] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (f: File) => {
    setError(null);
    const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
    if (![".csv", ".xlsx", ".json"].includes(ext)) {
      setError("Only .csv, .xlsx, and .json files are supported.");
      return;
    }
    if (f.size > 25 * 1024 * 1024) {
      setError("File exceeds 25 MB limit.");
      return;
    }
    setFile(f);
  };

  const handleUploadSubmit = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    setUploadProgress(30);

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploadProgress(70);
      const res = await fetch(`${API_BASE_URL}/api/user-datasets/upload`, {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ detail: "Upload failed" }));
        throw new Error(errJson.detail || "Upload failed");
      }

      const data = await res.json();
      setUploadProgress(100);
      setUploadResult(data);

      // Pre-select candidate columns if detected
      if (data.metadata?.candidate_treatments?.length > 0) {
        setTreatmentCol(data.metadata.candidate_treatments[0]);
      } else if (data.metadata?.columns?.length > 0) {
        setTreatmentCol(data.metadata.columns[0]);
      }

      if (data.metadata?.candidate_outcomes?.length > 0) {
        setOutcomeCol(data.metadata.candidate_outcomes[0]);
      } else if (data.metadata?.columns?.length > 1) {
        setOutcomeCol(data.metadata.columns[1]);
      }

      await refreshDatasetState();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  // Inspect unique values of selected treatment column from preview
  const treatmentColumnValues: string[] = uploadResult
    ? Array.from(new Set(uploadResult.preview.map((r: any) => String(r[treatmentCol]))))
    : [];

  useEffect(() => {
    if (treatmentColumnValues.length >= 2) {
      const lower = treatmentColumnValues.map((v: string) => v.toLowerCase());
      if (lower.includes("ad") && lower.includes("psa")) {
        setTreatmentVal(treatmentColumnValues[lower.indexOf("ad")]);
        setControlVal(treatmentColumnValues[lower.indexOf("psa")]);
      } else {
        setTreatmentVal(treatmentColumnValues[0]);
        setControlVal(treatmentColumnValues[1]);
      }
    }
  }, [treatmentCol, uploadResult]);

  if (!isOpen) return null;

  const handleRunAnalysis = async () => {
    if (!uploadResult || !treatmentCol || !outcomeCol) return;
    setAnalyzing(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/user-datasets/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          upload_id: uploadResult.metadata.upload_id,
          treatment_column: treatmentCol,
          outcome_column: outcomeCol,
          customer_id_column: customerIdCol || undefined,
          treatment_val: treatmentVal || undefined,
          control_val: controlVal || undefined
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ detail: "Analysis failed" }));
        throw new Error(errJson.detail || "Analysis failed");
      }

      const data = await res.json();
      setAnalysisResult(data);
      await refreshDatasetState();
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleOpenInDashboard = async () => {
    if (uploadResult?.metadata?.upload_id) {
      await switchDataset(uploadResult.metadata.upload_id);
    }
    onClose();
  };

  const handleReset = () => {
    setFile(null);
    setUploadResult(null);
    setAnalysisResult(null);
    setError(null);
    setConfirmedAnalysis(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-3xl max-h-[92vh] glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 sm:px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-violet-600/10 text-violet-600 dark:text-violet-400 shrink-0">
              <UploadCloud size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                Upload & Validate Dataset
              </h3>
              <p className="text-xs text-slate-500 truncate">
                Updates active dashboard and uplift metrics upon analysis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          {/* STEP 1: Upload or Drop file */}
          {!uploadResult && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-white/10 hover:border-violet-500 rounded-3xl p-10 text-center cursor-pointer transition bg-slate-50/50 dark:bg-white/5 space-y-3"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="w-12 h-12 mx-auto rounded-2xl bg-violet-600/10 text-violet-500 flex items-center justify-center">
                  <UploadCloud size={24} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {file ? file.name : "Drag & drop your marketing dataset here, or click to browse"}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Supports .CSV, .XLSX, and .JSON up to 25 MB
                  </p>
                </div>
              </div>

              {file && (
                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet size={20} className="text-emerald-500" />
                    <div>
                      <p className="font-bold text-xs text-slate-800 dark:text-slate-200">{file.name}</p>
                      <p className="text-[10px] text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <button
                    onClick={handleUploadSubmit}
                    disabled={uploading}
                    className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs transition shadow-md shadow-violet-600/20 cursor-pointer"
                  >
                    {uploading ? "Uploading & Validating…" : "Submit & Inspect"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Inspect Schema, Quality Report, & Configure Analysis */}
          {uploadResult && !analysisResult && (
            <div className="space-y-6">
              {/* Quality Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/5">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Rows</span>
                  <span className="text-xl font-black text-slate-900 dark:text-white mt-1 block">
                    {uploadResult.metadata.total_rows.toLocaleString()}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/5">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Columns</span>
                  <span className="text-xl font-black text-slate-900 dark:text-white mt-1 block">
                    {uploadResult.metadata.total_columns}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/5">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Duplicate Rows</span>
                  <span className="text-xl font-black text-emerald-500 mt-1 block">
                    {uploadResult.metadata.duplicates_count}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/5">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Upload ID</span>
                  <span className="text-sm font-mono text-violet-400 mt-2 block truncate">
                    {uploadResult.metadata.upload_id}
                  </span>
                </div>
              </div>

              {/* Data Preview Table */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Data Preview (First {uploadResult.preview.length} rows)</span>
                  <span className="text-slate-500 text-[10px] font-mono">Verified in Memory</span>
                </div>
                <div className="overflow-x-auto max-h-44">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-white/10 text-slate-400 font-mono text-[10px]">
                        {uploadResult.metadata.columns.map((col: string, idx: number) => (
                          <th key={idx} className="p-2 whitespace-nowrap">
                            {col} ({uploadResult.metadata.dtypes[col]})
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/50 dark:divide-white/5 font-mono text-[11px]">
                      {uploadResult.preview.map((row: any, rIdx: number) => (
                        <tr key={rIdx} className="hover:bg-slate-100/40 dark:hover:bg-white/5">
                          {uploadResult.metadata.columns.map((col: string, cIdx: number) => (
                            <td key={cIdx} className="p-2 whitespace-nowrap text-slate-700 dark:text-slate-300">
                              {String(row[col])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Configure Treatment and Outcome Selection */}
              <div className="p-5 rounded-2xl bg-violet-600/5 border border-violet-500/20 space-y-4">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Play size={16} className="text-violet-500" />
                  Configure Experiment & Uplift Columns
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                      Treatment Column (Required)
                    </label>
                    <select
                      value={treatmentCol}
                      onChange={(e) => setTreatmentCol(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none"
                    >
                      {uploadResult.metadata.columns.map((c: string) => (
                        <option key={c} value={c} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                      Outcome / Conversion Column (Required)
                    </label>
                    <select
                      value={outcomeCol}
                      onChange={(e) => setOutcomeCol(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none"
                    >
                      {uploadResult.metadata.columns.map((c: string) => (
                        <option key={c} value={c} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Explicit Treatment vs Control mapping */}
                {treatmentColumnValues.length >= 2 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        Treatment Group Value:
                      </label>
                      <input
                        type="text"
                        value={treatmentVal}
                        onChange={(e) => setTreatmentVal(e.target.value)}
                        placeholder="e.g. ad, treatment, 1"
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-500">
                        Control Group Value:
                      </label>
                      <input
                        type="text"
                        value={controlVal}
                        onChange={(e) => setControlVal(e.target.value)}
                        placeholder="e.g. psa, control, 0"
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                )}

                {/* Explicit confirmation checkbox */}
                <div className="pt-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="confirmCheck"
                    checked={confirmedAnalysis}
                    onChange={(e) => setConfirmedAnalysis(e.target.checked)}
                    className="accent-violet-600 cursor-pointer"
                  />
                  <label htmlFor="confirmCheck" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    I confirm running exploratory causal analysis on this uploaded dataset.
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 rounded-xl text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    Reset & Upload New
                  </button>
                  <button
                    onClick={handleRunAnalysis}
                    disabled={analyzing || !confirmedAnalysis || !treatmentCol || !outcomeCol}
                    className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white font-bold text-xs transition shadow-md shadow-violet-600/20 cursor-pointer"
                  >
                    {analyzing ? "Running Analysis…" : "Run Confirmed Analysis →"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Analysis Results */}
          {analysisResult && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle2 size={16} /> Analysis Completed Successfully!
                </span>
                <span className="text-[10px] font-mono text-emerald-500/80">
                  {analysisResult.total_evaluated_users?.toLocaleString()} Evaluated Users
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/5">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                    Treatment ({analysisResult.treatment_label})
                  </span>
                  <span className="text-xl font-black text-emerald-500 mt-1 block">
                    {analysisResult.analysis.treatment_rate_pct}%
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {analysisResult.analysis.treatment_conversions?.toLocaleString()} of {analysisResult.analysis.treatment_users?.toLocaleString()}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/5">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                    Control ({analysisResult.control_label})
                  </span>
                  <span className="text-xl font-black text-slate-700 dark:text-slate-300 mt-1 block">
                    {analysisResult.analysis.control_rate_pct}%
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {analysisResult.analysis.control_conversions?.toLocaleString()} of {analysisResult.analysis.control_users?.toLocaleString()}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/5">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Absolute Lift</span>
                  <span className="text-xl font-black text-violet-400 mt-1 block">
                    {analysisResult.analysis.absolute_lift_pp > 0 ? "+" : ""}{analysisResult.analysis.absolute_lift_pp} pp
                  </span>
                  <span className="text-[10px] text-emerald-500 font-semibold">
                    Rel: {analysisResult.analysis.relative_lift_pct > 0 ? "+" : ""}{analysisResult.analysis.relative_lift_pct}%
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/5">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Significance</span>
                  <span className="text-xl font-black text-cyan-400 mt-1 block">
                    Z = {analysisResult.analysis.z_score}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {analysisResult.analysis.statistically_significant ? "p < 0.05" : "p ≥ 0.05"}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 text-slate-200 font-mono text-xs leading-relaxed">
                <span className="text-violet-400 font-bold block mb-1">Statistical Summary:</span>
                {analysisResult.analysis.summary}
              </div>

              {/* Assumptions & Model Note */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <AlertTriangle size={14} /> Methodological Boundary
                </span>
                <p>{analysisResult.model_compatibility_note}</p>
                <p>{analysisResult.causal_assumptions_reminder}</p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 rounded-xl text-xs bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-800 dark:text-slate-200 font-semibold transition"
                >
                  Upload Another Dataset
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleOpenInDashboard}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs transition shadow-lg shadow-violet-600/25 cursor-pointer"
                  >
                    Open in Dashboard <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
