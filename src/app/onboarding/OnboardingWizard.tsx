"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Database, Bot, Zap, CheckCircle2 } from "lucide-react";
import { completeOnboarding } from "../actions/onboarding";

export function OnboardingWizard() {
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<"empty" | "demo" | null>(null);
  const [aiProvider, setAiProvider] = useState<string>("rules");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleComplete = async () => {
    if (!mode) return;
    setLoading(true);
    const result = await completeOnboarding(mode, aiProvider);
    if (result.success) {
      router.push("/");
    } else {
      alert("Failed to complete onboarding: " + result.error);
      setLoading(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-8 border border-white/10 relative overflow-hidden">
      {/* Step Indicators */}
      <div className="flex gap-2 mb-8">
        {[1, 2, 3, 4, 5].map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              s <= step ? "bg-blue-500" : "bg-white/10"
            }`}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-6">
            <Zap className="text-blue-400" size={24} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Welcome to Personal Assist</h1>
          <p className="text-zinc-400 text-lg mb-8 leading-relaxed">
            Your personal, autonomous command center. Personal Assist unifies your daily life—documents, emails, calendar, and tasks—into a single intelligent dashboard.
          </p>
          <button
            onClick={() => setStep(2)}
            className="px-6 py-3 bg-white text-black font-bold rounded-lg hover:bg-zinc-200 transition-colors"
          >
            Get Started
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mb-6">
            <Shield className="text-green-400" size={24} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Local-First Privacy</h1>
          <p className="text-zinc-400 mb-6 leading-relaxed">
            In this MVP phase, Personal Assist operates strictly on your local machine. No external APIs are connected, and no emails or documents are sent to the cloud. Your data resides entirely in a local SQLite database.
          </p>
          <div className="bg-white/5 border border-white/10 p-4 rounded-xl mb-8 flex gap-3 items-start">
            <CheckCircle2 className="text-green-400 shrink-0 mt-0.5" size={18} />
            <p className="text-sm text-zinc-300">
              Live integrations (Gmail, Outlook, DocuSign) are planned for Phase 3. Until then, everything you do here is a safe, local simulation.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 bg-white/5 text-white font-medium rounded-lg hover:bg-white/10 transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="px-6 py-2 bg-white text-black font-bold rounded-lg hover:bg-zinc-200 transition-colors"
            >
              I Understand
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-6">
            <Database className="text-purple-400" size={24} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Choose Your Workspace</h1>
          <p className="text-zinc-400 mb-8">
            How would you like to start your experience?
          </p>
          <div className="grid gap-4 mb-8">
            <button
              onClick={() => setMode("demo")}
              className={`p-5 text-left border rounded-xl transition-all ${
                mode === "demo" ? "border-purple-500 bg-purple-500/10" : "border-white/10 bg-white/5 hover:border-white/30"
              }`}
            >
              <h3 className="font-bold text-white mb-1">Demo Mode (Recommended)</h3>
              <p className="text-sm text-zinc-400">Pre-loads the database with mock documents, calendar events, and reminders to explore the app&apos;s capabilities immediately.</p>
            </button>
            <button
              onClick={() => setMode("empty")}
              className={`p-5 text-left border rounded-xl transition-all ${
                mode === "empty" ? "border-purple-500 bg-purple-500/10" : "border-white/10 bg-white/5 hover:border-white/30"
              }`}
            >
              <h3 className="font-bold text-white mb-1">Empty Workspace</h3>
              <p className="text-sm text-zinc-400">Start with a clean slate. We&apos;ll only create a single starter item for you.</p>
            </button>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 bg-white/5 text-white font-medium rounded-lg hover:bg-white/10 transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep(4)}
              disabled={!mode}
              className="px-6 py-2 bg-white text-black font-bold rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center mb-6">
            <Bot className="text-orange-400" size={24} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Choose AI Provider</h1>
          <p className="text-zinc-400 mb-8">
            Select the intelligence engine powering Personal Assist.
          </p>
          <div className="grid gap-4 mb-8">
            <button
              onClick={() => setAiProvider("rules")}
              className={`p-4 text-left border rounded-xl transition-all ${
                aiProvider === "rules" ? "border-orange-500 bg-orange-500/10" : "border-white/10 bg-white/5 hover:border-white/30"
              }`}
            >
              <h3 className="font-bold text-white mb-1">Local Rules (Default)</h3>
              <p className="text-sm text-zinc-400">Fast, local regex and rule-based parsing. Perfect for basic offline testing.</p>
            </button>
            <button
              onClick={() => setAiProvider("ollama")}
              className={`p-4 text-left border rounded-xl transition-all ${
                aiProvider === "ollama" ? "border-orange-500 bg-orange-500/10" : "border-white/10 bg-white/5 hover:border-white/30"
              }`}
            >
              <h3 className="font-bold text-white mb-1">Ollama (Advanced)</h3>
              <p className="text-sm text-zinc-400">Requires local Ollama installed and running `llama3.1` or `llama3`. True local LLM power.</p>
            </button>
            <button
              onClick={() => setAiProvider("mock")}
              className={`p-4 text-left border rounded-xl transition-all ${
                aiProvider === "mock" ? "border-orange-500 bg-orange-500/10" : "border-white/10 bg-white/5 hover:border-white/30"
              }`}
            >
              <h3 className="font-bold text-white mb-1">Mock Provider</h3>
              <p className="text-sm text-zinc-400">Returns hardcoded responses instantly. Good for UI testing.</p>
            </button>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setStep(3)}
              className="px-4 py-2 bg-white/5 text-white font-medium rounded-lg hover:bg-white/10 transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep(5)}
              className="px-6 py-2 bg-white text-black font-bold rounded-lg hover:bg-zinc-200 transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500 text-center py-8">
          <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-6 mx-auto">
            <Zap className="text-blue-400 animate-pulse" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Ready to Launch</h1>
          <p className="text-zinc-400 mb-8 max-w-sm mx-auto">
            We are configuring your workspace and generating your first daily brief...
          </p>
          <div className="flex gap-3 justify-center">
             <button
              onClick={() => setStep(4)}
              disabled={loading}
              className="px-4 py-2 bg-white/5 text-white font-medium rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              Back
            </button>
            <button
              onClick={handleComplete}
              disabled={loading}
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? "Preparing..." : "Open Command Center"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
