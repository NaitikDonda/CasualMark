"use client";

import React, { useEffect, useState } from "react";
import {
  BookOpen,
  ShieldCheck,
  Code2,
  FileCode,
  Search,
  CheckCircle2,
  ExternalLink,
  Lock,
  Eye,
  Info
} from "lucide-react";
import { fetchApi } from "../../lib/api";

export function NotebookInspectorView() {
  const [notebooks, setNotebooks] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notebookDetail, setNotebookDetail] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchApi<any[]>("/api/notebooks")
      .then((res) => {
        setNotebooks(res);
        if (res.length > 0) {
          setSelectedId(res[0].id);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setDetailLoading(true);
    fetchApi<any>(`/api/notebooks/${selectedId}`)
      .then((res) => {
        setNotebookDetail(res);
        setDetailLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setDetailLoading(false);
      });
  }, [selectedId]);

  const filteredNotebooks = notebooks.filter((nb) =>
    nb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    nb.purpose?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Read-Only Safety Banner */}
      <div className="p-5 rounded-2xl glass-panel border border-emerald-500/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
            <Lock size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              Notebook Protection Active: <span className="text-emerald-500">Read-Only Enforced</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Operating system permissions are set to chmod 444. API write endpoints reject all modifications. Inspection runs strictly in-memory without altering notebook cells or execution state.
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-semibold">
          <ShieldCheck size={14} /> OS Mode: 0444
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Notebook List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search notebooks…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="space-y-2 max-h-[750px] overflow-y-auto pr-1">
            {filteredNotebooks.map((nb) => {
              const active = selectedId === nb.id;
              return (
                <div
                  key={nb.id}
                  onClick={() => setSelectedId(nb.id)}
                  className={`p-4 rounded-2xl cursor-pointer transition border text-left ${
                    active
                      ? "bg-violet-600/10 border-violet-500/50 shadow-md"
                      : "glass-panel-subtle hover:bg-slate-100 dark:hover:bg-white/5 border-slate-200/50 dark:border-white/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-xs text-slate-900 dark:text-white break-all">
                      {nb.name}
                    </span>
                    <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                      {nb.permissions}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 line-clamp-1">{nb.purpose}</p>
                  <div className="mt-2.5 flex items-center gap-3 text-[10px] text-slate-400">
                    <span>{nb.total_cells} cells</span>
                    <span>•</span>
                    <span>{nb.total_outputs} outputs</span>
                    <span>•</span>
                    <span className="text-emerald-500 font-medium">Read-Only</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Notebook Viewer Panel */}
        <div className="lg:col-span-8 glass-panel rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 min-w-0">
          {detailLoading ? (
            <div className="h-96 flex items-center justify-center text-slate-500 text-sm animate-pulse">
              Parsing read-only notebook cells and outputs…
            </div>
          ) : notebookDetail ? (
            <div className="space-y-5 min-w-0">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 sm:pb-4 border-b border-slate-200 dark:border-slate-800 gap-2">
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 truncate">
                    <FileCode size={18} className="text-violet-600 dark:text-violet-400 shrink-0" />
                    {notebookDetail.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    Path: {notebookDetail.relative_path}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1 border border-emerald-500/20">
                    <ShieldCheck size={14} /> Immutable Guard
                  </span>
                </div>
              </div>

              {/* Cells Viewer */}
              <div className="space-y-3.5 max-h-[650px] overflow-y-auto pr-1">
                {notebookDetail.cells?.map((cell: any, index: number) => (
                  <div
                    key={index}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900/60"
                  >
                    {/* Cell Meta Bar */}
                    <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800/60 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 font-mono border-b border-slate-200 dark:border-slate-800">
                      <span>
                        [{cell.execution_count ? cell.execution_count : " "}] {cell.cell_type.toUpperCase()}
                      </span>
                      <span className="text-[10px]">Read-only cell #{index + 1}</span>
                    </div>

                    {/* Cell Content */}
                    <div className="p-3 font-mono text-xs text-slate-900 dark:text-slate-200 whitespace-pre-wrap overflow-x-auto leading-relaxed">
                      {cell.source || <span className="text-slate-400 italic">Empty cell</span>}
                    </div>

                    {/* Cell Outputs */}
                    {cell.outputs && cell.outputs.length > 0 && (
                      <div className="border-t border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-black/30 space-y-2">
                        <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">
                          Outputs ({cell.outputs.length})
                        </div>
                        {cell.outputs.map((out: any, oIdx: number) => (
                          <div key={oIdx} className="text-xs font-mono">
                            {out.image ? (
                              <img
                                src={out.image}
                                alt="Notebook Output Chart"
                                className="max-w-full rounded-lg border border-slate-200 dark:border-slate-700 mt-2"
                              />
                            ) : (
                              <pre className="p-2.5 rounded-lg bg-slate-950 text-emerald-400 text-[11px] overflow-x-auto border border-slate-800">
                                {out.text}
                              </pre>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-slate-500 text-xs">
              Select a notebook from the left to inspect its cells and outputs.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
