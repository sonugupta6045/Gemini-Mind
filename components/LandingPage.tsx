"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  Sparkles,
  ShieldCheck,
  BrainCircuit,
  Lock,
  ArrowRight,
  Database,
  CheckCircle2,
  Cpu,
  AlertCircle
} from "lucide-react";

export function LandingPage() {
  const { signInWithGoogle, authError, clearError } = useAuth();
  const [signingIn, setSigningIn] = useState(false);

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex flex-col justify-between selection:bg-purple-500/30 selection:text-white relative overflow-hidden font-sans">
      {/* Ambient Frosted Glows */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-600/20 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[40%] bg-pink-500/10 rounded-full blur-[100px]" />
      </div>

      {/* Top Navigation */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-500 to-blue-500 text-white flex items-center justify-center shadow-lg font-bold text-base border border-white/20">
            G
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-semibold tracking-tight text-white flex items-center gap-2">
              Gemini Mind
              <span className="text-[10px] font-normal text-white/50 bg-white/10 px-2 py-0.5 rounded-full border border-white/10">
                Journal
              </span>
            </h1>
            <p className="text-xs text-white/40 font-sans tracking-wide">
              Authenticated Multi-Turn Reflection Workspace
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="nav-signin-button"
            onClick={handleSignIn}
            disabled={signingIn}
            className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white active:scale-98 text-sm font-medium transition-all backdrop-blur-xl shadow-lg disabled:opacity-50"
          >
            {signingIn ? (
              <span className="inline-block w-4 h-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-purple-300" />
            )}
            Sign In with Google
          </button>
        </div>
      </header>

      {/* Main Hero & Purpose */}
      <main className="relative z-10 w-full max-w-4xl mx-auto px-6 py-12 flex-1 flex flex-col justify-center">
        {authError && (
          <div className="mb-8 p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-200 backdrop-blur-xl flex items-start justify-between gap-3 text-sm">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Authentication Notice</p>
                <p className="text-rose-300/80 text-xs mt-0.5">{authError}</p>
              </div>
            </div>
            <button
              onClick={clearError}
              className="text-xs text-rose-300 hover:text-white font-medium underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="space-y-6 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-xs font-medium text-white/80">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Gemini 3.6 Flash &amp; Cloud Firestore Isolation
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.12]">
            Thoughtful space for your <span className="bg-gradient-to-r from-purple-400 via-pink-300 to-blue-400 bg-clip-text text-transparent">multi-turn reflections</span> and ideas.
          </h2>

          <p className="text-base sm:text-lg text-white/70 max-w-2xl leading-relaxed">
            Converse with Gemini to deconstruct complex dilemmas, brainstorm creative avenues, and summarize deep personal insights. Every entry is encrypted and stored in your private, authenticated Firestore vault.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center gap-4">
            <button
              id="hero-get-started-button"
              onClick={handleSignIn}
              disabled={signingIn}
              className="cursor-pointer w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-white text-slate-950 hover:bg-white/90 active:scale-98 text-base font-bold transition-all shadow-2xl group disabled:opacity-50"
            >
              {signingIn ? (
                <span className="inline-block w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Begin Private Journal</span>
                  <ArrowRight className="w-4 h-4 text-purple-600 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>

            <div className="flex items-center gap-2 text-xs text-white/50 bg-white/5 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-white/10">
              <Lock className="w-3.5 h-3.5 text-purple-400" />
              <span>Passwordless Google Authentication &bull; Isolated per User UID</span>
            </div>
          </div>
        </div>

        {/* Feature Highlights Bento Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl space-y-3 hover:bg-white/10 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-500/20 to-blue-500/20 border border-purple-500/30 flex items-center justify-center text-white">
              <BrainCircuit className="w-5 h-5 text-purple-300" />
            </div>
            <h3 className="text-base font-semibold text-white">
              Multi-Turn Synthesis
            </h3>
            <p className="text-xs sm:text-sm text-white/60 leading-relaxed">
              Explore your thoughts through organic conversations. Gemini adapts to reflection, ideation, coaching, or executive summarization.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl space-y-3 hover:bg-white/10 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-white">
              <Database className="w-5 h-5 text-emerald-300" />
            </div>
            <h3 className="text-base font-semibold text-white">
              Firestore Cloud Vault
            </h3>
            <p className="text-xs sm:text-sm text-white/60 leading-relaxed">
              All interactions are permanently synchronized to your cloud partition. Zero risk of lost drafts or cross-account data leakage.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl space-y-3 hover:bg-white/10 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500/20 to-indigo-500/20 border border-blue-500/30 flex items-center justify-center text-white">
              <ShieldCheck className="w-5 h-5 text-blue-300" />
            </div>
            <h3 className="text-base font-semibold text-white">
              Strict Security Rules
            </h3>
            <p className="text-xs sm:text-sm text-white/60 leading-relaxed">
              Enforced by Cloud Firestore granular security rules (`request.auth.uid == userId`) ensuring absolute data sovereignty.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-6 py-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-white/40 gap-4">
        <div>
          &copy; {new Date().getFullYear()} Gemini Mind &bull; Built with Google GenAI &amp; Firebase
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-purple-400" /> Model: Gemini 3.6 Flash
          </span>
          <span>&bull;</span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Firestore Real-time
          </span>
        </div>
      </footer>
    </div>
  );
}
