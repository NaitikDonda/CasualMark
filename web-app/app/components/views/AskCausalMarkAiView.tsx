"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  BrainCircuit,
  Send,
  Plus,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  FileText,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  HelpCircle,
  BookOpen,
  Cpu
} from "lucide-react";
import { fetchApi } from "../../lib/api";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  citations?: any[];
  model?: string;
  timestamp: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
}

export function AskCausalMarkAiView() {
  const [sessions, setSessions] = useState<ChatSession[]>([
    {
      id: "default",
      title: "Criteo Uplift Analysis",
      messages: [
        {
          id: "m0",
          sender: "ai",
          text: "Hello! I am **CausalMark AI**, your local marketing experiment intelligence assistant. I am connected directly to your project's notebooks, model checkpoints, and evaluation artifacts.\n\nAsk me anything about your experiment results, Criteo uplift models, cross-validation metrics, or causal validity status.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]
    }
  ]);
  const [currentSessionId, setCurrentSessionId] = useState("default");
  const [inputQuery, setInputQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedCitationId, setExpandedCitationId] = useState<string | null>(null);
  const [modelInfo, setModelInfo] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchApi<any>("/api/ai/models")
      .then(setModelInfo)
      .catch(console.error);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sessions, currentSessionId, loading]);

  const activeSession = sessions.find((s) => s.id === currentSessionId) || sessions[0];

  const suggestedQuestions = [
    "Explain my latest Criteo evaluation results.",
    "Which notebook generates the final uplift predictions?",
    "Why is causal-effect verification currently false?",
    "Compare my model's saved evaluation metrics.",
    "Explain the top uplift deciles.",
    "Which artifacts are missing from my project?"
  ];

  const handleSend = async (queryText?: string) => {
    const textToSend = (queryText || inputQuery).trim();
    if (!textToSend || loading) return;

    const userMsg: Message = {
      id: `usr_${Date.now()}`,
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Update session title if first user message
    const isFirstUserMsg = activeSession.messages.filter((m) => m.sender === "user").length === 0;
    const newTitle = isFirstUserMsg ? textToSend.slice(0, 26) + "…" : activeSession.title;

    setSessions((prev) =>
      prev.map((s) =>
        s.id === currentSessionId
          ? { ...s, title: newTitle, messages: [...s.messages, userMsg] }
          : s
      )
    );
    setInputQuery("");
    setLoading(true);

    try {
      const res = await fetchApi<any>("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({ query: textToSend })
      });

      const aiMsg: Message = {
        id: `ai_${Date.now()}`,
        sender: "ai",
        text: res.answer,
        citations: res.citations,
        model: res.model,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === currentSessionId
            ? { ...s, messages: [...s.messages, aiMsg] }
            : s
        )
      );
    } catch (err: any) {
      const errorMsg: Message = {
        id: `err_${Date.now()}`,
        sender: "ai",
        text: `⚠️ **Unable to retrieve response**: ${err.message || "Backend connection issue."}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setSessions((prev) =>
        prev.map((s) =>
          s.id === currentSessionId
            ? { ...s, messages: [...s.messages, errorMsg] }
            : s
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    const newId = `session_${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      title: "New Conversation",
      messages: [
        {
          id: `m_${Date.now()}`,
          sender: "ai",
          text: "Started a fresh conversation. What would you like to investigate across your CausalMark experiments?",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]
    };
    setSessions([newSession, ...sessions]);
    setCurrentSessionId(newId);
  };

  const handleClearHistory = () => {
    if (confirm("Clear all conversations?")) {
      handleNewChat();
      setSessions((prev) => prev.slice(0, 1));
    }
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 sm:gap-5 min-w-0 min-h-[calc(100vh-140px)]">
      {/* Chat History Sidebar */}
      <div className="w-full lg:w-64 glass-panel rounded-2xl p-4 border border-slate-200 dark:border-slate-800 flex flex-col justify-between shrink-0">
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-800">
            <span className="font-bold text-xs tracking-wider uppercase text-slate-500">
              Conversations
            </span>
            <button
              onClick={handleNewChat}
              className="p-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition cursor-pointer"
              title="New Chat"
            >
              <Plus size={15} />
            </button>
          </div>

          {/* Session list */}
          <div className="space-y-1 max-h-[160px] lg:max-h-[380px] overflow-y-auto pr-1">
            {sessions.map((s) => {
              const active = s.id === currentSessionId;
              return (
                <div
                  key={s.id}
                  onClick={() => setCurrentSessionId(s.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer truncate transition ${
                    active
                      ? "bg-violet-600 text-white"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  }`}
                >
                  {s.title}
                </div>
              );
            })}
          </div>
        </div>

        {/* Model status & Clear History */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
            <Cpu size={12} className="text-violet-600 dark:text-violet-400 shrink-0" />
            <span className="truncate">
              {modelInfo?.preferred_model ? `LLM: ${modelInfo.preferred_model}` : "Evidence Synthesis Engine"}
            </span>
          </div>
          <button
            onClick={handleClearHistory}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
          >
            <Trash2 size={13} /> Clear All Chats
          </button>
        </div>
      </div>

      {/* Main Conversation Window */}
      <div className="flex-1 glass-panel rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 flex flex-col justify-between overflow-hidden min-w-0">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center text-white shrink-0">
              <Sparkles size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                Ask CausalMark AI
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-mono border border-emerald-500/20 shrink-0">
                  Source-Grounded
                </span>
              </h3>
              <p className="text-xs text-slate-500 truncate">
                Direct evidence retrieval from Criteo benchmarks, Hillstrom evidence, and protected notebooks.
              </p>
            </div>
          </div>
          <button
            onClick={handleNewChat}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition cursor-pointer shrink-0"
          >
            <Plus size={14} /> New Chat
          </button>
        </div>

        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto my-3 sm:my-4 pr-1 sm:pr-2 space-y-4 max-h-[500px]">
          {activeSession.messages.map((msg) => {
            const isUser = msg.sender === "user";
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? "items-end" : "items-start"} min-w-0`}
              >
                <div
                  className={`max-w-[90%] sm:max-w-[85%] rounded-2xl p-3.5 sm:p-4 text-xs leading-relaxed ${
                    isUser
                      ? "bg-violet-600 text-white rounded-br-none"
                      : "bg-slate-100 dark:bg-slate-800/70 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700/60 rounded-bl-none"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {/* Citations Preview Container */}
                  {!isUser && msg.citations && msg.citations.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                        Verified Sources ({msg.citations.length})
                      </span>
                      <div className="space-y-1.5">
                        {msg.citations.map((c: any, cIdx: number) => {
                          const citeKey = `${msg.id}_cite_${cIdx}`;
                          const isExpanded = expandedCitationId === citeKey;
                          return (
                            <div
                              key={cIdx}
                              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 text-[11px] overflow-hidden"
                            >
                              <div
                                onClick={() =>
                                  setExpandedCitationId(isExpanded ? null : citeKey)
                                }
                                className="p-2 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                              >
                                <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 truncate pr-2">
                                  <FileText size={12} className="text-violet-600 dark:text-violet-400 shrink-0" />
                                  {c.source} · {c.label}
                                </span>
                                {isExpanded ? <ChevronUp size={13} className="shrink-0" /> : <ChevronDown size={13} className="shrink-0" />}
                              </div>
                              {isExpanded && (
                                <div className="p-2.5 bg-slate-50 dark:bg-black/30 border-t border-slate-200 dark:border-slate-700 text-[10px] font-mono text-emerald-700 dark:text-emerald-400 whitespace-pre-wrap overflow-x-auto">
                                  {c.excerpt}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Message Bottom Action Bar */}
                  <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    <span>{msg.timestamp} {msg.model ? `· ${msg.model}` : ""}</span>
                    {!isUser && (
                      <button
                        onClick={() => copyToClipboard(msg.id, msg.text)}
                        className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
                        title="Copy response"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check size={11} className="text-emerald-600 dark:text-emerald-400" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy size={11} /> Copy
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-100 dark:bg-slate-800 max-w-[60%] sm:max-w-[40%] text-xs text-slate-600 dark:text-slate-400 font-medium">
              <RefreshCw size={13} className="animate-spin text-violet-600" />
              Retrieving evidence & generating answer…
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompts if starting */}
        {activeSession.messages.length <= 1 && (
          <div className="mb-3 space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Suggested Questions
            </span>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(q)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition text-left cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="relative pt-2 min-w-0">
          <textarea
            rows={2}
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask CausalMark AI about your models, deciles, or evaluation results… (Enter to send)"
            className="w-full pl-3.5 pr-12 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-xs focus:outline-none focus:border-violet-500 resize-none text-slate-900 dark:text-white"
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !inputQuery.trim()}
            className="absolute right-2.5 top-4 p-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white transition cursor-pointer"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
