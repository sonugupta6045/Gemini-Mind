"use client";

import React from "react";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { LandingPage } from "@/components/LandingPage";
import { Dashboard } from "@/components/Dashboard";

function MainApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center justify-center space-y-4 relative overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/30 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-600/20 rounded-full blur-[120px]" />
        </div>
        <div className="relative z-10 w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 to-blue-500 text-white flex items-center justify-center font-bold text-xl shadow-xl border border-white/20">
          R
        </div>
        <div className="relative z-10 flex items-center gap-2.5 text-white/60 text-xs tracking-wide bg-white/5 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10">
          <div className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          <span>Verifying security &amp; session status...</span>
        </div>
      </div>
    );
  }

  return user ? <Dashboard /> : <LandingPage />;
}

export default function Home() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
