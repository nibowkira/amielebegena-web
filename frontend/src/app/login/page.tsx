"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect") || "/account";
  const redirectUrl = rawRedirect.replace(/\.html$/, "");

  const { refreshProfile } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        await refreshProfile();
        const destination = redirectUrl.startsWith("/") ? redirectUrl : `/${redirectUrl}`;
        router.push(destination);
      } else {
        const { data: signUpData, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              avatar_url: "/image/default-avatar.png",
            },
          },
        });

        if (error) throw error;

        // Set the default avatar on the new profile row
        if (signUpData?.user?.id) {
          try {
            await supabase
              .from("profiles")
              .update({ avatar_url: "/image/default-avatar.png" })
              .eq("id", signUpData.user.id);
          } catch (e) {
            // Profile row might not exist yet (trigger-created), that's okay
            console.warn("Default avatar sync:", e);
          }
        }

        setSuccessMsg("Registration successful! You can now log in with your credentials.");
        setMode("login");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-72px)] flex items-center justify-center px-4 py-12 sm:py-16 bg-[#FAF8F5]">
      {/* Clean White Card matching reference */}
      <div className="w-full max-w-[460px] rounded-3xl bg-white p-8 sm:p-11 shadow-[0_10px_35px_-5px_rgba(0,0,0,0.05)] border border-[#14231b]/5 space-y-6">
        {/* Top Tab Bar: LOGIN / SIGN UP */}
        <div className="flex border-b border-[#E5E1DA] text-xs font-bold tracking-widest uppercase">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 text-center pb-3.5 pt-1 font-bold text-xs sm:text-[13px] tracking-wider transition-colors cursor-pointer min-h-[44px] flex items-center justify-center ${
              mode === "login"
                ? "text-[#14231b] border-b-2 border-[#14231b] -mb-[1px]"
                : "text-[#9ca3af] hover:text-[#14231b] border-b-2 border-transparent -mb-[1px]"
            }`}
          >
            LOGIN
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 text-center pb-3.5 pt-1 font-bold text-xs sm:text-[13px] tracking-wider transition-colors cursor-pointer min-h-[44px] flex items-center justify-center ${
              mode === "register"
                ? "text-[#14231b] border-b-2 border-[#14231b] -mb-[1px]"
                : "text-[#9ca3af] hover:text-[#14231b] border-b-2 border-transparent -mb-[1px]"
            }`}
          >
            SIGN UP
          </button>
        </div>

        {/* Status Alerts */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {mode === "register" && (
            <div>
              <label className="block text-xs font-bold tracking-wider uppercase text-[#14231b] mb-2 font-sans">
                FULL NAME
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-4 py-3.5 rounded-lg sm:rounded-xl bg-[#EAE6DD] text-[#14231b] placeholder-[#8c8780] text-xs sm:text-sm font-medium focus:outline-none focus:ring-1 focus:ring-[#14231b]/30 transition-all"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold tracking-wider uppercase text-[#14231b] mb-2 font-sans">
              EMAIL ADDRESS
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full px-4 py-3.5 rounded-lg sm:rounded-xl bg-[#EAE6DD] text-[#14231b] placeholder-[#8c8780] text-xs sm:text-sm font-medium focus:outline-none focus:ring-1 focus:ring-[#14231b]/30 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold tracking-wider uppercase text-[#14231b] mb-2 font-sans">
              PASSWORD
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-4 py-3.5 rounded-lg sm:rounded-xl bg-[#EAE6DD] text-[#14231b] placeholder-[#8c8780] text-xs sm:text-sm font-medium focus:outline-none focus:ring-1 focus:ring-[#14231b]/30 transition-all"
            />
          </div>

          {/* Action Button: Deep Forest Green Pill */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 sm:py-4 px-6 rounded-full bg-[#1b3124] hover:bg-[#14231b] text-white text-xs sm:text-sm font-bold tracking-widest uppercase transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 mt-8 active:scale-[0.99]"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <span>{mode === "login" ? "LOGIN" : "SIGN UP"}</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full min-h-[70vh] flex items-center justify-center bg-[#FAF8F5]">
          <Loader2 className="w-6 h-6 animate-spin text-[#14231b]" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
