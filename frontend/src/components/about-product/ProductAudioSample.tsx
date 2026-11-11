"use client";

import React, { useState, useRef } from "react";
import { Play, Pause, Volume2 } from "lucide-react";

interface ProductAudioSampleProps {
  audioUrl: string;
  productName: string;
}

export default function ProductAudioSample({ audioUrl, productName }: ProductAudioSampleProps) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch((e) => {
        console.warn("Audio autoplay blocked or failed:", e);
      });
    }
  };

  return (
    <div className="inline-flex items-center gap-2.5 sm:gap-3 p-1.5 sm:p-2 pr-3.5 sm:pr-4 rounded-full bg-white/95 backdrop-blur-md border border-[#d4af37]/40 shadow-md max-w-full">
      <button
        type="button"
        onClick={togglePlay}
        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#14231b] hover:bg-[#d4af37] text-[#FAF8F5] hover:text-[#14231b] flex items-center justify-center transition-all cursor-pointer shadow-sm shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]"
        aria-label={isPlaying ? `Pause audio sample for ${productName}` : `Listen to acoustic audition of ${productName}`}
      >
        {isPlaying ? <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-0.5" />}
      </button>

      <div className="text-left min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Volume2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#d4af37] shrink-0" />
          <span className="text-[10px] sm:text-[11px] font-bold text-[#14231b] tracking-wider uppercase">
            Acoustic Audition
          </span>
        </div>
        <span className="text-[9px] sm:text-[10px] text-[#737874] block leading-tight">
          {isPlaying ? "Playing master sample..." : `Listen to ${productName}`}
        </span>
      </div>

      <audio
        ref={audioRef}
        src={audioUrl}
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        className="hidden"
      />
    </div>
  );
}

