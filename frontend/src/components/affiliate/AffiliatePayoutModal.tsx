"use client";

import React, { useState } from "react";
import PremiumModal from "../ui/PremiumModal";
import {
  Wallet,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  ChevronDown,
  Loader2,
  ShieldCheck,
} from "lucide-react";

export interface AffiliatePayoutModalProps {
  open: boolean;
  onClose: () => void;
  availableBalance: number;
  onSubmit: (params: {
    amount: number;
    method: string;
    details: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

export default function AffiliatePayoutModal({
  open,
  onClose,
  availableBalance = 0,
  onSubmit,
}: AffiliatePayoutModalProps) {
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState("Telebirr Mobile Wallet");
  const [payoutDetails, setPayoutDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  if (!open) return null;

  const handlePreset = (amt: number) => {
    setWithdrawAmount(String(amt));
    setFeedbackMsg(null);
  };

  const handleMaxPreset = () => {
    const maxVal = Math.max(availableBalance, 1000);
    setWithdrawAmount(String(maxVal));
    setFeedbackMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(withdrawAmount);

    if (isNaN(amountNum) || amountNum < 1000) {
      setFeedbackMsg({
        type: "error",
        text: "Minimum commission payout threshold is ETB 1,000.",
      });
      return;
    }

    if (amountNum > availableBalance) {
      setFeedbackMsg({
        type: "error",
        text: `Requested amount (ETB ${amountNum.toLocaleString()}) exceeds your verified available balance of ETB ${availableBalance.toLocaleString()}.`,
      });
      return;
    }

    if (!payoutDetails.trim()) {
      setFeedbackMsg({
        type: "error",
        text: "Please provide your verified account or mobile wallet number.",
      });
      return;
    }

    setSubmitting(true);
    setFeedbackMsg(null);

    try {
      const res = await onSubmit({
        amount: amountNum,
        method: withdrawMethod,
        details: payoutDetails.trim(),
      });

      if (res && res.success) {
        setFeedbackMsg({
          type: "success",
          text: `Payout request for ETB ${amountNum.toLocaleString()} submitted successfully via ${withdrawMethod}.`,
        });
        setWithdrawAmount("");
        setPayoutDetails("");
      } else {
        setFeedbackMsg({
          type: "error",
          text: res?.error || "Withdrawal submission failed. Please try again.",
        });
      }
    } catch {
      setFeedbackMsg({
        type: "error",
        text: "Connection error while processing payout. Please verify your network.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Fixed Footer for the Payout Modal
  const modalFooter = (
    <>
      <button
        type="button"
        onClick={onClose}
        disabled={submitting}
        className="px-5 py-2.5 sm:px-6 sm:py-3 rounded-full border border-[#E8E1D6] bg-white hover:bg-[#F8F5EF] text-[#172820] text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#D9B32E]/30 disabled:opacity-50"
      >
        Cancel
      </button>

      <button
        type="submit"
        form="amiele-payout-form"
        disabled={submitting || availableBalance < 1000}
        className="px-6 py-2.5 sm:px-8 sm:py-3 rounded-full bg-[#14271D] hover:bg-[#0c1811] text-white font-extrabold text-xs sm:text-sm tracking-wide shadow-md hover:shadow-lg active:scale-[0.99] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#D9B32E]"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-[#D9B32E]" />
            <span>Processing Transfer Request...</span>
          </>
        ) : (
          <>
            <span>Submit Payout Request</span>
            <ArrowRight className="w-4 h-4 text-[#D9B32E]" />
          </>
        )}
      </button>
    </>
  );

  return (
    <PremiumModal
      open={open}
      onClose={onClose}
      eyebrow="AFFILIATE PAYOUT"
      title="Request Commission Payout"
      subtitle="Fast direct transfer via Telebirr or Ethiopian Banking"
      badge={
        <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F8F5EF] border border-[#E8E1D6] text-[11px] font-bold text-[#14271D] shadow-2xs">
          <Wallet className="w-3.5 h-3.5 text-[#D9B32E]" />
          <span>PAYOUT SYSTEM</span>
        </div>
      }
      footer={modalFooter}
    >
      <form
        id="amiele-payout-form"
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        {/* Available Balance Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#F8F5EF] border border-[#E8E1D6] flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#7D867F]">
              AVAILABLE TO WITHDRAW
            </span>
            <div className="text-2xl sm:text-3xl font-black text-[#14271D] tracking-tight mt-0.5">
              ETB {availableBalance.toLocaleString()}
            </div>
          </div>

          <div className="text-right">
            <span className="inline-block px-3 py-1 rounded-full bg-[#D9B32E]/15 text-[#14271D] border border-[#D9B32E]/40 text-[11px] font-bold shadow-2xs">
              Min. 1,000 ETB
            </span>
          </div>
        </div>

        {/* Quick Amount Presets */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-[#14271D]">
            Quick Amount Presets
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[1000, 2500, 5000].map((amt) => {
              const isSelected = withdrawAmount === String(amt);
              return (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handlePreset(amt)}
                  className={`py-2.5 rounded-[14px] text-xs font-bold border transition-all cursor-pointer shadow-2xs ${
                    isSelected
                      ? "bg-[#14271D] text-white border-[#14271D] shadow-xs"
                      : "bg-[#FCFBF8] border-[#E8E1D6] text-[#172820] hover:bg-[#F8F5EF]"
                  }`}
                >
                  {amt.toLocaleString()} ETB
                </button>
              );
            })}

            {/* Max / All Preset */}
            <button
              type="button"
              onClick={handleMaxPreset}
              className={`py-2.5 rounded-[14px] text-xs font-extrabold border transition-all cursor-pointer shadow-2xs ${
                withdrawAmount === String(availableBalance)
                  ? "bg-[#14271D] text-white border-[#14271D]"
                  : "bg-[#D9B32E]/15 border-[#D9B32E]/40 text-[#14271D] hover:bg-[#D9B32E]/25"
              }`}
            >
              Max / All
            </button>
          </div>
        </div>

        {/* Feedback Alert Message */}
        {feedbackMsg && (
          <div
            className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-2xs ${
              feedbackMsg.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {feedbackMsg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Withdrawal Form Fields */}
        <div className="space-y-4">
          {/* Field 1: Withdrawal Amount (ETB) */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#14271D]">
              Withdrawal Amount (ETB) <span className="text-[#D9B32E]">*</span>
            </label>
            <input
              type="number"
              required
              min={1000}
              max={availableBalance || 100000}
              value={withdrawAmount}
              onChange={(e) => {
                setWithdrawAmount(e.target.value);
                setFeedbackMsg(null);
              }}
              placeholder="e.g. 1,000"
              className="w-full px-4 py-3 rounded-[14px] border border-[#E8E1D6] bg-[#FCFBF8] text-sm font-semibold text-[#172820] placeholder-[#7D867F]/70 focus:bg-white focus:border-[#D9B32E] focus:ring-2 focus:ring-[#D9B32E]/20 outline-none transition-all shadow-2xs"
            />
          </div>

          {/* Field 2: Disbursement Channel */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#14271D]">
              Disbursement Channel <span className="text-[#D9B32E]">*</span>
            </label>
            <div className="relative">
              <select
                value={withdrawMethod}
                onChange={(e) => setWithdrawMethod(e.target.value)}
                className="w-full appearance-none px-4 py-3 pr-10 rounded-[14px] border border-[#E8E1D6] bg-[#FCFBF8] text-sm font-semibold text-[#172820] focus:bg-white focus:border-[#D9B32E] focus:ring-2 focus:ring-[#D9B32E]/20 outline-none transition-all cursor-pointer shadow-2xs"
              >
                <option value="Telebirr Mobile Wallet">
                  Telebirr Mobile Wallet (Instant • 0% Fee)
                </option>
                <option value="Commercial Bank of Ethiopia (CBE)">
                  Commercial Bank of Ethiopia (CBE Direct)
                </option>
                <option value="Bank of Abyssinia (BoA)">
                  Bank of Abyssinia (BoA)
                </option>
                <option value="Awash International Bank">
                  Awash International Bank
                </option>
                <option value="Dashen Bank">
                  Dashen Bank (Amole)
                </option>
                <option value="PayPal (International)">
                  PayPal (Diaspora Ambassador Accounts)
                </option>
              </select>
              <ChevronDown className="w-4 h-4 text-[#7D867F] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Field 3: Account / Mobile Number */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#14271D]">
              Account / Mobile Number <span className="text-[#D9B32E]">*</span>
            </label>
            <input
              type="text"
              required
              value={payoutDetails}
              onChange={(e) => {
                setPayoutDetails(e.target.value);
                setFeedbackMsg(null);
              }}
              placeholder="e.g. 0911... (Telebirr) or Account Number"
              className="w-full px-4 py-3 rounded-[14px] border border-[#E8E1D6] bg-[#FCFBF8] text-sm font-semibold text-[#172820] placeholder-[#7D867F]/70 focus:bg-white focus:border-[#D9B32E] focus:ring-2 focus:ring-[#D9B32E]/20 outline-none transition-all shadow-2xs"
            />
          </div>
        </div>

        {/* Security Subtext */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#7D867F] text-center pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-[#D9B32E] shrink-0" />
          <span>
            Encrypted disbursement with verified Amiele Begena transaction ledger.
          </span>
        </div>
      </form>
    </PremiumModal>
  );
}
