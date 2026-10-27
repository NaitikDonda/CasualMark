"use client";

import React, { useEffect, useState } from "react";
import {
  Database,
  Search,
  FileSpreadsheet,
  FileCode,
  FileText,
  Table,
  Eye,
  Info,
  UploadCloud,
  Trash2
} from "lucide-react";
import { fetchApi } from "../../lib/api";

interface DataExplorerProps {
  onOpenUpload?: () => void;
  uploadRefreshTrigger?: number;
}

export function DataExplorerView({ onOpenUpload, uploadRefreshTrigger }: DataExplorerProps) {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [selectedDs, setSelectedDs] = useState<any | null>(null);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const limit = 30;

  useEffect(() => {
    fetchApi<any[]>("/api/datasets")
      .then((res) => {
        setDatasets(res);
        if (res.length > 0) {
          setSelectedDs(res[0]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!selectedDs) return;
    setPreviewLoading(true);
    fetchApi<any>(
      `/api/datasets/preview?category=${selectedDs.category}&filename=${selectedDs.name}&limit=${limit}&offset=${page * limit}`
    )
      .then((res) => {
        setPreviewData(res);
        setPreviewLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setPreviewLoading(false);
      });
  }, [selectedDs, page]);

  const filtered = datasets.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-3xl glass-panel border border-violet-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Database size={24} className="text-violet-500" />
            Safe Dataset & Artifact Browser
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Inspect marketing instruction sets, benchmark splits, Criteo samples, and user-uploaded datasets.
          </p>
        </div>
        <button
          onClick={onOpenUpload}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs transition shadow-lg shadow-violet-600/25 cursor-pointer shrink-0"
        >
          <UploadCloud size={16} /> Upload Dataset
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Dataset list */}
        <div className="lg:col-span-4 space-y-3">
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search datasets…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
            {filtered.map((ds) => {
              const active = selectedDs?.id === ds.id;
              return (
                <div
                  key={ds.id}
                  onClick={() => {
                    setSelectedDs(ds);
                    setPage(0);
                  }}
                  className={`p-3.5 rounded-2xl cursor-pointer border transition text-left ${
                    active
                      ? "bg-violet-600/10 border-violet-500/50 shadow-md"
                      : "glass-panel-subtle hover:bg-slate-100 dark:hover:bg-white/5 border-slate-200/50 dark:border-white/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {ds.name}
                    </p>
                    <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-mono bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                      {ds.extension}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{ds.category}</span>
                    <span>{(ds.size_bytes / 1024).toFixed(1)} KB</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Data Preview */}
        <div className="lg:col-span-8 glass-panel rounded-3xl p-6 border border-slate-200/60 dark:border-white/10">
          {previewLoading ? (
            <div className="h-96 flex items-center justify-center text-slate-500 text-sm animate-pulse">
              Loading dataset preview…
            </div>
          ) : previewData ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    {previewData.filename}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Category: {previewData.category}
                    {previewData.total_rows ? ` · ${previewData.total_rows.toLocaleString()} Rows × ${previewData.total_columns} Columns` : ""}
                  </p>
                </div>
                {previewData.total_rows && (
                  <div className="flex items-center gap-2">
                    <button
                      disabled={page === 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      className="px-2.5 py-1 rounded-lg bg-slate-200/50 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-xs disabled:opacity-40"
                    >
                      Prev
                    </button>
                    <span className="text-xs font-mono text-slate-500">
                      Page {page + 1} of {Math.ceil(previewData.total_rows / limit)}
                    </span>
                    <button
                      disabled={(page + 1) * limit >= previewData.total_rows}
                      onClick={() => setPage((p) => p + 1)}
                      className="px-2.5 py-1 rounded-lg bg-slate-200/50 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-xs disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>

              {/* Render Table if CSV */}
              {previewData.columns && previewData.preview && (
                <div className="table-responsive-container max-h-[550px] border border-slate-200 dark:border-slate-800 rounded-xl overflow-y-auto">
                  <table className="w-full text-left text-xs min-w-[500px]">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold">
                      <tr>
                        {previewData.columns.map((col: string, idx: number) => (
                          <th key={idx} className="p-2.5 whitespace-nowrap font-mono text-[11px]">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
                      {previewData.preview.map((row: any, rIdx: number) => (
                        <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          {previewData.columns.map((col: string, cIdx: number) => (
                            <td key={cIdx} className="p-2.5 whitespace-nowrap text-slate-800 dark:text-slate-200">
                              {String(row[col])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Render JSON or JSONL */}
              {previewData.is_json && (
                <pre className="p-4 rounded-xl bg-slate-950 text-emerald-400 font-mono text-xs max-h-[550px] overflow-auto border border-slate-800">
                  {JSON.stringify(previewData.data, null, 2)}
                </pre>
              )}

              {previewData.is_jsonl && (
                <div className="space-y-2 max-h-[550px] overflow-auto">
                  {previewData.preview.map((item: any, i: number) => (
                    <pre key={i} className="p-3 rounded-xl bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto">
                      {JSON.stringify(item, null, 2)}
                    </pre>
                  ))}
                </div>
              )}

              {/* Render Text */}
              {previewData.is_text && (
                <pre className="p-4 rounded-2xl bg-slate-900 text-slate-200 font-mono text-xs max-h-[550px] overflow-auto whitespace-pre-wrap">
                  {previewData.content}
                </pre>
              )}
            </div>
          ) : (
            <div className="text-center py-20 text-slate-500">
              Select a dataset from the left to preview.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
