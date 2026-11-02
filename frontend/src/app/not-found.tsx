import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6 py-24 bg-[#0d1e16] text-[#fbf8f2]">
      <span className="text-[#d4af37] text-sm font-bold tracking-widest uppercase">404 — ERROR</span>
      <h1 className="font-benaiah text-4xl sm:text-5xl font-extrabold mt-3 mb-4">
        ገጹ አልተገኘም (Page Not Found)
      </h1>
      <p className="text-sm text-[#cbd5cf] max-w-md mx-auto mb-8 font-light">
        የፈለጉት ገጽ ሊቀየር ወይም ሊሰረዝ ይችላል። እባክዎ ወደ ዋናው ገጽ ይመለሱ።
      </p>
      <Link
        href="/"
        className="px-8 py-3.5 rounded-full bg-[#152e22] hover:bg-[#1f4232] border border-[#345c47] text-white font-benaiah text-sm font-bold tracking-wide transition-all shadow-lg hover:scale-105"
      >
        ወደ ዋናው ገጽ ይመለሱ (Back to Home)
      </Link>
    </div>
  );
}
