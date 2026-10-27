"use client";

import React, { useEffect, useState } from "react";
import {
  BrainCircuit,
  Search,
  BookOpen,
  Sparkles,
  CheckCircle2,
  FileText,
  AlertCircle,
  HelpCircle
} from "lucide-react";
import { fetchApi } from "../../lib/api";

export function RagIntelligenceView() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [answerData, setAnswerData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchApi<any>("/api/rag/status").then(setStatus).catch(console.error);
    fetchApi<any[]>("/api/rag/documents").then(setDocuments).catch(console.error);
  }, []);

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await fetchApi<any>("/api/rag/query", {
        method: "POST",
        body: JSON.stringify({ query })
      });
      setAnswerData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const sampleQueries = [
    "What were the visit and conversion rates for Mens E-Mail in Hillstrom?",
    "What is the profile and feature composition of the Criteo dataset?",
    "Is the causal effect verified for the two-model uplift estimator?",
    "What is the average spend difference between email treatments?"
  ];

  return (
    <div className="space-y-8">
      {/* RAG Header Banner */}
      <div className="p-6 rounded-3xl glass-panel border border-violet-500/20">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 text-violet-500 text-xs font-semibold mb-2">
              <BrainCircuit size={14} /> Source-Grounded Knowledge Engine
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              CausalMark RAG & Evidence Review
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 max-w-2xl">
              Inspect verified marketing evidence, customer segment profiles, and evaluation records with source-level citation integrity. No ungrounded hallucinations.
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-600 dark:text-slate-300">
            <BookOpen size={16} className="text-violet-500" />
            <span>{documents.length} Indexed Evidence Documents</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Query & Chat Panel */}
        <div className="lg:col-span-8 space-y-6">
          <div className="p-6 rounded-3xl glass-panel border border-slate-200/60 dark:border-white/10">
            <form onSubmit={handleQuery} className="space-y-3">
              <div className="relative">
                <Search size={16} className="absolute left-4 top-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ask a question about Hillstrom, Criteo, or evaluation results…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-11 pr-28 py-3 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-sm focus:outline-none focus:border-violet-500"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="absolute right-2 top-2 px-4 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition shadow-md shadow-violet-600/20 cursor-pointer"
                >
                  {loading ? "Searching…" : "Ask RAG"}
                </button>
              </div>

              {/* Sample Queries */}
              <div className="flex flex-wrap gap-2 pt-1">
                {sampleQueries.map((sq, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setQuery(sq)}
                    className="px-2.5 py-1 rounded-lg bg-slate-200/50 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 text-[11px] transition text-left"
                  >
                    {sq}
                  </button>
                ))}
              </div>
            </form>

            {/* Answer & Citations Area */}
            {answerData && (
              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-white/10 space-y-5">
                <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-black/30 border border-slate-200/50 dark:border-white/10">
                  <div className="flex items-center gap-2 mb-2 text-xs font-bold text-violet-500">
                    <Sparkles size={16} /> Verified Synthesized Answer
                  </div>
                  <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {answerData.answer}
                  </p>
                </div>

                {/* Citations List */}
                {answerData.citations?.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Grounded Citations ({answerData.citations.length})
                    </h4>
                    {answerData.citations.map((c: any, cIdx: number) => (
                      <div
                        key={cIdx}
                        className="p-3.5 rounded-xl border border-slate-200/60 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                          <span className="font-bold flex items-center gap-1.5 text-slate-900 dark:text-white">
                            <FileText size={14} className="text-cyan-400" />
                            {c.source} · {c.section}
                          </span>
                          <span className="text-emerald-500 font-semibold text-[11px] flex items-center gap-1">
                            <CheckCircle2 size={12} /> {(c.relevance_score * 100).toFixed(0)}% Match
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 italic font-serif">
                          "{c.passage}"
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Knowledge Base Document Explorer */}
        <div className="lg:col-span-4 p-6 rounded-3xl glass-panel border border-slate-200/60 dark:border-white/10 space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
            Knowledge Base Files ({documents.length})
          </h3>
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {documents.map((doc, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-100/50 dark:bg-white/5 border border-slate-200/40 dark:border-white/5 flex items-center justify-between text-xs"
              >
                <div className="truncate mr-2">
                  <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {doc.filename}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {(doc.size_bytes / 1024).toFixed(1)} KB · {doc.extension}
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-white/10 text-[10px] font-mono text-slate-600 dark:text-slate-400 shrink-0">
                  Ready
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
