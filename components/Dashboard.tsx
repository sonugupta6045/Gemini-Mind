"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { JournalEntry, Message, ReflectionMode } from "@/lib/types";
import {
  subscribeUserJournals,
  saveJournalEntry,
  deleteJournalEntry,
} from "@/lib/firestore-service";
import {
  Sparkles,
  Plus,
  Trash2,
  Send,
  LogOut,
  Clock,
  Tag,
  Lightbulb,
  CheckCircle,
  FileText,
  MessageSquare,
  ChevronRight,
  RefreshCw,
  Search,
  BookOpen,
  ArrowUpRight,
  Shield,
  Layers,
  AlertCircle,
  CornerDownLeft,
  X
} from "lucide-react";

export function Dashboard() {
  const { user, logout } = useAuth();
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [loadingJournals, setLoadingJournals] = useState(true);
  const [activeEntry, setActiveEntry] = useState<JournalEntry | null>(null);
  const [inputText, setInputText] = useState("");
  const [mode, setMode] = useState<ReflectionMode>("reflection");
  const [isSending, setIsSending] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Subscribe to user's private Firestore journals in real-time
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeUserJournals(
      user.uid,
      (entries) => {
        setJournals(entries);
        setLoadingJournals(false);
        // If no active entry is selected, default to the most recent or create first
        setActiveEntry((curr) => {
          if (curr) {
            const updated = entries.find((e) => e.id === curr.id);
            return updated || curr;
          }
          if (entries.length > 0) {
            return entries[0];
          }
          return null;
        });
      },
      (err) => {
        console.error("Subscription error:", err);
        setErrorMessage("Firestore sync error. Check security rules and network connection.");
        setLoadingJournals(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Scroll chat into view on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeEntry?.messages, isSending]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  };

  // Create a brand new journal session
  const handleCreateNewJournal = async () => {
    if (!user) return;
    const now = Date.now();
    const newId = `journal_${now}_${Math.random().toString(36).substring(2, 7)}`;
    const newEntry: JournalEntry = {
      id: newId,
      userId: user.uid,
      title: "New Reflection Session",
      messages: [],
      createdAt: now,
      updatedAt: now,
      tags: ["Draft"],
    };

    setActiveEntry(newEntry);
    setSaveStatus("saving");
    try {
      await saveJournalEntry(user.uid, newEntry);
      setSaveStatus("saved");
    } catch (err: any) {
      console.error("Save error:", err);
      setSaveStatus("error");
      setErrorMessage("Could not initialize new journal on Firestore.");
    }
  };

  // Delete a journal session
  const handleDeleteEntry = async (entryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    if (confirm("Are you sure you want to permanently delete this journal entry?")) {
      try {
        await deleteJournalEntry(user.uid, entryId);
        if (activeEntry?.id === entryId) {
          const remaining = journals.filter((j) => j.id !== entryId);
          setActiveEntry(remaining.length > 0 ? remaining[0] : null);
        }
      } catch (err: any) {
        console.error("Delete error:", err);
        setErrorMessage("Failed to delete journal entry.");
      }
    }
  };

  // Send message to Gemini and update Firestore
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !user || isSending) return;

    const currentText = inputText.trim();
    setInputText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    let targetEntry = activeEntry;
    const now = Date.now();

    // If no active entry exists, generate one
    if (!targetEntry) {
      const newId = `journal_${now}_${Math.random().toString(36).substring(2, 7)}`;
      targetEntry = {
        id: newId,
        userId: user.uid,
        title: currentText.slice(0, 40) || "Reflection Session",
        messages: [],
        createdAt: now,
        updatedAt: now,
        tags: ["Reflection"],
      };
    }

    const userMessage: Message = {
      id: `msg_user_${now}`,
      role: "user",
      content: currentText,
      timestamp: now,
    };

    const updatedMessages = [...targetEntry.messages, userMessage];
    const updatedEntry: JournalEntry = {
      ...targetEntry,
      title:
        targetEntry.title === "New Reflection Session"
          ? currentText.slice(0, 36) + (currentText.length > 36 ? "..." : "")
          : targetEntry.title,
      messages: updatedMessages,
      updatedAt: now,
    };

    setActiveEntry(updatedEntry);
    setIsSending(true);
    setSaveStatus("saving");
    setErrorMessage(null);

    // Persist user's question first
    try {
      await saveJournalEntry(user.uid, updatedEntry);
      setSaveStatus("saved");
    } catch (saveErr) {
      console.error("Failed to save user input:", saveErr);
      setSaveStatus("error");
    }

    // Call server-side Gemini route
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          mode,
          currentEntryText: currentText,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reach Gemini.");
      }

      const modelMessage: Message = {
        id: `msg_model_${Date.now()}`,
        role: "model",
        content: data.text,
        timestamp: Date.now(),
      };

      const finalMessages = [...updatedMessages, modelMessage];
      const finalEntry: JournalEntry = {
        ...updatedEntry,
        messages: finalMessages,
        updatedAt: Date.now(),
      };

      setActiveEntry(finalEntry);
      setSaveStatus("saving");
      await saveJournalEntry(user.uid, finalEntry);
      setSaveStatus("saved");
    } catch (err: any) {
      console.error("Gemini Chat Error:", err);
      setErrorMessage(err.message || "Gemini reflection generation failed. Please retry.");
      setSaveStatus("error");
    } finally {
      setIsSending(false);
    }
  };

  // Trigger Gemini Executive Synthesis & Brainstorming
  const handleSynthesize = async () => {
    if (!activeEntry || !user || activeEntry.messages.length === 0 || isSynthesizing) return;

    setIsSynthesizing(true);
    setErrorMessage(null);
    setSaveStatus("saving");

    try {
      const res = await fetch("/api/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: activeEntry.messages,
          title: activeEntry.title,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Synthesis failed.");
      }

      const enrichedEntry: JournalEntry = {
        ...activeEntry,
        title: data.suggestedTitle || activeEntry.title,
        summary: data.summary,
        brainstormIdeas: data.brainstormIdeas,
        tags: data.tags || activeEntry.tags,
        updatedAt: Date.now(),
      };

      setActiveEntry(enrichedEntry);
      await saveJournalEntry(user.uid, enrichedEntry);
      setSaveStatus("saved");
    } catch (err: any) {
      console.error("Synthesize error:", err);
      setErrorMessage(err.message || "Failed to generate AI synthesis.");
      setSaveStatus("error");
    } finally {
      setIsSynthesizing(false);
    }
  };

  // Filter journals for sidebar search
  const filteredJournals = journals.filter((j) => {
    const q = searchQuery.toLowerCase();
    const titleMatch = j.title?.toLowerCase().includes(q);
    const summaryMatch = j.summary?.toLowerCase().includes(q);
    const tagMatch = j.tags?.some((t) => t.toLowerCase().includes(q));
    return titleMatch || summaryMatch || tagMatch;
  });

  return (
    <div className="flex h-screen bg-[#0f172a] text-white font-sans overflow-hidden relative selection:bg-purple-500/30 selection:text-white">
      {/* Ambient Frosted Glows */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-600/20 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[40%] bg-pink-500/10 rounded-full blur-[100px]" />
      </div>

      {/* LEFT SIDEBAR: History & Navigation */}
      <aside className="w-[280px] md:w-80 h-full z-10 bg-white/5 backdrop-blur-2xl border-r border-white/10 flex flex-col justify-between shrink-0">
        {/* Workspace Brand & New Session CTA */}
        <div className="p-5 border-b border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-500 to-blue-500 text-white font-bold flex items-center justify-center text-sm shadow-md border border-white/20">
                G
              </div>
              <span className="font-semibold text-white tracking-tight text-base">
                Gemini Mind
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-300 bg-emerald-500/15 px-2.5 py-1 rounded-full border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Synced</span>
            </div>
          </div>

          <button
            id="new-journal-button"
            onClick={handleCreateNewJournal}
            className="cursor-pointer w-full flex items-center justify-center gap-2 py-3 px-4 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-xl active:scale-98 text-sm font-medium transition-all shadow-lg"
          >
            <Plus className="w-4 h-4 text-purple-300" />
            <span>New Reflection</span>
          </button>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              id="search-journals-input"
              type="text"
              placeholder="Search reflections & tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white/5 border border-white/10 rounded-xl focus:outline-hidden focus:border-white/25 focus:ring-1 focus:ring-purple-500/40 text-white placeholder:text-white/30 transition-all"
            />
          </div>
        </div>

        {/* Scrollable Journal History List */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-white/40 flex items-center justify-between">
            <span>Recent History ({journals.length})</span>
            <span className="text-[10px] text-white/30 font-normal">Firestore Vault</span>
          </div>

          {loadingJournals ? (
            <div className="p-6 text-center text-xs text-white/40 flex flex-col items-center gap-2">
              <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
              Loading reflections...
            </div>
          ) : filteredJournals.length === 0 ? (
            <div className="p-6 text-center text-xs text-white/40 space-y-2">
              <BookOpen className="w-6 h-6 mx-auto text-white/30" />
              <p>No past entries found.</p>
              <p className="text-[11px] text-white/30">Click &ldquo;+ New Reflection&rdquo; to start.</p>
            </div>
          ) : (
            filteredJournals.map((journal) => {
              const isSelected = activeEntry?.id === journal.id;
              const dateStr = new Date(journal.updatedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });

              return (
                <div
                  key={journal.id}
                  id={`journal-item-${journal.id}`}
                  onClick={() => setActiveEntry(journal)}
                  className={`group relative w-full text-left p-3 rounded-xl transition-all cursor-pointer border ${
                    isSelected
                      ? "bg-white/15 border-white/20 shadow-md backdrop-blur-md"
                      : "bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-medium text-white truncate flex-1">
                      {journal.title || "Untitled Reflection"}
                    </h4>
                    <span className="text-[11px] text-white/40 shrink-0">{dateStr}</span>
                  </div>

                  <p className="text-[11px] text-white/50 line-clamp-1 mt-1">
                    {journal.summary ||
                      (journal.messages.length > 0
                        ? journal.messages[0].content
                        : "Empty draft...")}
                  </p>

                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-white/5">
                    <div className="flex items-center gap-1.5 text-white/40">
                      <MessageSquare className="w-3 h-3" />
                      <span className="text-[10px]">
                        {journal.messages.length} messages
                      </span>
                    </div>

                    <button
                      id={`delete-btn-${journal.id}`}
                      title="Delete entry"
                      onClick={(e) => handleDeleteEntry(journal.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-white/40 hover:text-rose-300 hover:bg-rose-500/20 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* User Profile & Sign Out Footer */}
        <div className="p-4 border-t border-white/10 bg-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            {user?.photoURL ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={user.photoURL}
                alt={user.displayName || "User"}
                className="w-9 h-9 rounded-full border border-white/20 shrink-0 object-cover"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 text-white flex items-center justify-center text-xs font-bold shrink-0 border border-white/20">
                {user?.email?.charAt(0).toUpperCase() || "U"}
              </div>
            )}
            <div className="truncate">
              <p className="text-sm font-medium text-white truncate">
                {user?.displayName || user?.email?.split("@")[0] || "Authenticated User"}
              </p>
              <p className="text-[11px] text-white/40 truncate">{user?.email}</p>
            </div>
          </div>

          <button
            id="logout-button"
            title="Sign Out"
            onClick={logout}
            className="cursor-pointer p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* MAIN WORKSPACE: Active Multi-Turn Journal & Synthesis Panel */}
      <main className="flex-1 flex flex-col bg-transparent overflow-hidden relative z-10">
        {/* Top Header */}
        <header className="h-16 px-8 border-b border-white/10 bg-white/5 backdrop-blur-2xl flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
                {activeEntry?.title || "Reflection Workspace"}
                {saveStatus === "saving" && (
                  <span className="text-[11px] text-purple-300 font-sans font-normal flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Saving...
                  </span>
                )}
                {saveStatus === "saved" && activeEntry && (
                  <div className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] rounded-full border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> Firestore Synced
                  </div>
                )}
              </h2>
              <p className="text-xs text-white/50">
                {activeEntry
                  ? `A collaborative reflection session with Gemini Flash &bull; ${new Date(
                      activeEntry.updatedAt
                    ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                  : "No active session"}
              </p>
            </div>
          </div>

          {/* Action Tools: Synthesize & Reflection Modes */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/10 text-xs backdrop-blur-md">
              <button
                id="mode-reflection"
                onClick={() => setMode("reflection")}
                className={`cursor-pointer px-3 py-1 rounded-lg font-medium transition-all ${
                  mode === "reflection"
                    ? "bg-white/15 text-white shadow-xs border border-white/10"
                    : "text-white/50 hover:text-white"
                }`}
              >
                Reflect
              </button>
              <button
                id="mode-brainstorm"
                onClick={() => setMode("brainstorm")}
                className={`cursor-pointer px-3 py-1 rounded-lg font-medium transition-all ${
                  mode === "brainstorm"
                    ? "bg-white/15 text-white shadow-xs border border-white/10"
                    : "text-white/50 hover:text-white"
                }`}
              >
                Brainstorm
              </button>
              <button
                id="mode-summary"
                onClick={() => setMode("summary")}
                className={`cursor-pointer px-3 py-1 rounded-lg font-medium transition-all ${
                  mode === "summary"
                    ? "bg-white/15 text-white shadow-xs border border-white/10"
                    : "text-white/50 hover:text-white"
                }`}
              >
                Summary
              </button>
              <button
                id="mode-coaching"
                onClick={() => setMode("coaching")}
                className={`cursor-pointer px-3 py-1 rounded-lg font-medium transition-all ${
                  mode === "coaching"
                    ? "bg-white/15 text-white shadow-xs border border-white/10"
                    : "text-white/50 hover:text-white"
                }`}
              >
                Coaching
              </button>
            </div>

            <button
              id="ai-synthesize-button"
              onClick={handleSynthesize}
              disabled={isSynthesizing || !activeEntry || activeEntry.messages.length === 0}
              className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-medium transition-all shadow-lg backdrop-blur-xl disabled:opacity-40"
              title="Synthesize journal into insights and action ideas"
            >
              {isSynthesizing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-300" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              )}
              <span>AI Synthesize</span>
            </button>
          </div>
        </header>

        {/* Global Error Banner if any */}
        {errorMessage && (
          <div className="px-6 py-2.5 bg-rose-500/15 border-b border-rose-500/30 text-rose-200 text-xs backdrop-blur-md flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-300 hover:text-white font-medium"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Content Area: Two-Column Chat & AI Insights View */}
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT: Multi-turn Chat Conversation */}
          <div className="flex-1 flex flex-col h-full bg-transparent border-r border-white/10">
            {/* Messages Scroll View */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
              {!activeEntry || activeEntry.messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-2xl flex items-center justify-center text-purple-300 shadow-xl">
                    <FileText className="w-7 h-7" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-xl font-bold text-white">
                      Begin Your Reflection
                    </h3>
                    <p className="text-xs sm:text-sm text-white/60 leading-relaxed">
                      Write freely about a challenge you are facing, an idea you want to explore, or a personal milestone. Gemini will reflect and brainstorm with you.
                    </p>
                  </div>

                  {/* Starter Prompts */}
                  <div className="w-full grid grid-cols-1 gap-2.5 text-left pt-3">
                    <button
                      onClick={() => {
                        setInputText(
                          "I'm feeling stuck between pursuing a creative lead role and moving into product management. Both seem interesting, but I'm worried about losing my technical edge."
                        );
                      }}
                      className="cursor-pointer p-3.5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 hover:border-white/20 hover:bg-white/10 text-xs text-white/80 transition-all text-left flex items-center justify-between group shadow-md"
                    >
                      <span>&ldquo;I&apos;m feeling stuck between creative leadership and product management...&rdquo;</span>
                      <ArrowUpRight className="w-4 h-4 text-white/40 group-hover:text-purple-300 transition-colors" />
                    </button>
                    <button
                      onClick={() => {
                        setInputText(
                          "Reflecting on a recent creative project: what went well, what friction did I face, and what are 3 key takeaways?"
                        );
                      }}
                      className="cursor-pointer p-3.5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 hover:border-white/20 hover:bg-white/10 text-xs text-white/80 transition-all text-left flex items-center justify-between group shadow-md"
                    >
                      <span>&ldquo;Reflect on my recent project and distill 3 key takeaways.&rdquo;</span>
                      <ArrowUpRight className="w-4 h-4 text-white/40 group-hover:text-purple-300 transition-colors" />
                    </button>
                  </div>
                </div>
              ) : (
                activeEntry.messages.map((message) => {
                  const isUser = message.role === "user";
                  return (
                    <div
                      key={message.id}
                      className={`flex gap-3.5 ${isUser ? "justify-end" : "justify-start"}`}
                    >
                      {!isUser && (
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-400 to-indigo-600 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white shadow-lg border border-white/20 mt-0.5">
                          AI
                        </div>
                      )}

                      <div
                        className={`leading-relaxed ${
                          isUser
                            ? "max-w-[70%] p-4 bg-white/10 backdrop-blur-md rounded-2xl rounded-tr-none border border-white/10 text-white text-sm shadow-lg"
                            : "max-w-[75%] p-4 bg-white/5 backdrop-blur-md rounded-2xl rounded-tl-none border border-white/10 text-white/90 text-sm shadow-md whitespace-pre-wrap"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4 mb-1.5 pb-1 border-b border-white/10 text-[10px] text-white/40">
                          <span className="font-medium text-white/60">
                            {isUser ? "You" : "Gemini 3.6 Flash"}
                          </span>
                          <span>
                            {new Date(message.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <div className="leading-relaxed">{message.content}</div>
                      </div>

                      {isUser && (
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-500 to-pink-500 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white shadow-lg border border-white/20 mt-0.5">
                          {user?.displayName ? user.displayName.charAt(0).toUpperCase() : "U"}
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {isSending && (
                <div className="flex gap-3.5 justify-start">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-400 to-indigo-600 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white shadow-lg border border-white/20 mt-0.5">
                    AI
                  </div>
                  <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl rounded-tl-none p-4 shadow-md flex items-center gap-2 text-white/60 text-xs">
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce [animation-delay:0.4s]" />
                    <span className="ml-1 text-white/50">Gemini is reflecting...</span>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input Composer with Frosted Blur */}
            <div className="p-4 md:p-6 bg-transparent">
              <form
                onSubmit={handleSendMessage}
                className="relative bg-white/5 backdrop-blur-3xl rounded-2xl border border-white/10 shadow-2xl focus-within:border-white/25 focus-within:bg-white/10 transition-all p-3"
              >
                <textarea
                  id="journal-input-textarea"
                  ref={textareaRef}
                  value={inputText}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  rows={2}
                  placeholder={`Share a reflection or ask Gemini in ${mode} mode... (Enter to send, Shift+Enter for newline)`}
                  className="w-full px-2 py-1 bg-transparent border-none outline-none text-sm placeholder:text-white/30 text-white resize-none"
                />

                <div className="pt-2 flex items-center justify-between border-t border-white/5">
                  <div className="flex items-center gap-2 text-[11px] text-white/40 px-2">
                    <span className="capitalize font-medium text-white/60">Mode: {mode}</span>
                    <span>&bull;</span>
                    <span>Firestore Synced</span>
                  </div>

                  <button
                    id="submit-journal-message"
                    type="submit"
                    disabled={!inputText.trim() || isSending}
                    className="cursor-pointer inline-flex items-center gap-2 py-2 px-5 bg-white text-slate-900 rounded-xl text-xs font-bold hover:bg-white/90 active:scale-98 transition-all disabled:opacity-40 shadow-lg"
                  >
                    <span>Reflect</span>
                    <CornerDownLeft className="w-3.5 h-3.5 text-purple-600" />
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* RIGHT: AI Synthesized Summary & Brainstorming Sidebar */}
          <aside className="w-80 bg-white/5 backdrop-blur-2xl border-l border-white/10 p-6 overflow-y-auto flex flex-col space-y-5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>AI Reflection Summary</span>
                </h3>
              </div>
              <p className="text-[11px] text-white/50 leading-relaxed">
                Gemini extracts core themes, emotional clarity, and actionable avenues.
              </p>
            </div>

            {/* Summary Box */}
            <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-2 shadow-sm">
              <h4 className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-purple-400" />
                <span>Executive Synthesis</span>
              </h4>
              {activeEntry?.summary ? (
                <p className="text-xs text-white/80 leading-relaxed">
                  {activeEntry.summary}
                </p>
              ) : (
                <p className="text-xs text-white/40 italic leading-relaxed">
                  Click &ldquo;AI Synthesize&rdquo; above to generate an executive summary of this reflection.
                </p>
              )}
            </div>

            {/* Brainstorming Takeaways */}
            <div className="p-4 rounded-2xl bg-gradient-to-b from-purple-500/10 to-transparent border border-purple-500/20 space-y-2.5 shadow-sm">
              <h4 className="text-xs font-semibold text-purple-200 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-purple-400" />
                <span>Brainstormed Action Ideas</span>
              </h4>
              {activeEntry?.brainstormIdeas && activeEntry.brainstormIdeas.length > 0 ? (
                <ul className="space-y-2">
                  {activeEntry.brainstormIdeas.map((idea, i) => (
                    <li key={i} className="text-xs text-white/80 flex items-start gap-2">
                      <ChevronRight className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                      <span className="leading-snug">{idea}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-purple-200/50 italic leading-relaxed">
                  Brainstormed takeaways will appear here once synthesized.
                </p>
              )}
            </div>

            {/* Topical Tags */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-blue-400" />
                <span>Taxonomy &amp; Tags</span>
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {activeEntry?.tags && activeEntry.tags.length > 0 ? (
                  activeEntry.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white/70 text-[11px] font-medium"
                    >
                      #{tag}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-white/30 italic">No tags assigned</span>
                )}
              </div>
            </div>

            {/* Session Metadata & Firestore Verification */}
            <div className="pt-4 border-t border-white/10 text-[11px] text-white/40 space-y-2">
              <div className="flex justify-between">
                <span>Database:</span>
                <span className="font-mono text-white/70 truncate max-w-[120px]">
                  Cloud Firestore
                </span>
              </div>
              <div className="flex justify-between">
                <span>Isolation Vault:</span>
                <span className="font-mono text-white/70">/users/{user?.uid?.slice(0, 6)}...</span>
              </div>
              <div className="flex justify-between">
                <span>Model Engine:</span>
                <span className="font-mono text-white/70">gemini-3.6-flash</span>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
