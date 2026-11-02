"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { CheckCircle2, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";

function ConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Confirming your email verification...");

  useEffect(() => {
    async function verify() {
      try {
        const tokenHash = searchParams.get("token_hash");
        const type = (searchParams.get("type") as any) || "signup";

        if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type,
          });

          if (error) throw error;
          setStatus("success");
          setMessage("Your email has been verified successfully!");
          setTimeout(() => router.push("/account"), 2500);
          return;
        }

        // Check if session was automatically established via hash fragment
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setStatus("success");
          setMessage("Authentication confirmed!");
          setTimeout(() => router.push("/account"), 2000);
        } else {
          setStatus("success");
          setMessage("You may now sign in with your credentials.");
        }
      } catch (err: any) {
        setStatus("error");
        setMessage(err.message || "Failed to confirm email link. It may have expired.");
      }
    }

    verify();
  }, [searchParams, router]);

  return (
    <div className="w-full max-w-md rounded-3xl border border-[#d4af37]/30 bg-[#0f1a14]/90 backdrop-blur-2xl p-8 text-center space-y-5 shadow-2xl">
      {status === "loading" && (
        <>
          <Loader2 className="w-12 h-12 text-[#d4af37] animate-spin mx-auto" />
          <h2 className="font-serif text-2xl font-bold text-[#fbf8f2]">Verifying Email</h2>
          <p className="text-xs text-[#fbf8f2]/60">{message}</p>
        </>
      )}

      {status === "success" && (
        <>
          <div className="w-14 h-14 rounded-full bg-[#1b4332] border border-[#52b788] mx-auto flex items-center justify-center text-[#52b788]">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-[#fbf8f2]">Email Verified!</h2>
          <p className="text-xs text-[#52b788]">{message}</p>
          <div className="pt-2">
            <Link
              href="/account"
              className="px-6 py-2.5 rounded-xl gold-gradient-bg text-[#080b09] font-bold text-xs uppercase tracking-wider inline-flex items-center gap-1.5"
            >
              <span>Go to Account</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </>
      )}

      {status === "error" && (
        <>
          <div className="w-14 h-14 rounded-full bg-red-950/70 border border-red-500/40 mx-auto flex items-center justify-center text-red-400">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-[#fbf8f2]">Verification Failed</h2>
          <p className="text-xs text-red-200">{message}</p>
          <div className="pt-2">
            <Link
              href="/login"
              className="px-6 py-2.5 rounded-xl border border-[#d4af37]/40 bg-[#14231b] text-xs font-semibold text-[#f3e5ab] hover:border-[#d4af37] inline-block"
            >
              Return to Login
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <div className="w-full min-h-[75vh] flex items-center justify-center px-4 py-16">
      <Suspense
        fallback={
          <div className="text-center py-12 text-xs text-[#d4af37] flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Verifying link...</span>
          </div>
        }
      >
        <ConfirmContent />
      </Suspense>
    </div>
  );
}
