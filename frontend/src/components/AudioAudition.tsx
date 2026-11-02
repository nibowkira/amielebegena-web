"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Play, Pause, Volume2, Music, Sparkles, ArrowRight } from "lucide-react";

interface Track {
  id: string;
  name: string;
  amharic: string;
  category: string;
  audioSrc: string;
  description: string;
  tuning: string;
}

const tracks: Track[] = [
  {
    id: "begena",
    name: "Sacred Begena (Harp of David)",
    amharic: "በገና",
    category: "10-String Box Lyre",
    audioSrc: "/audio/begena.mp3",
    description: "Deep meditative sub-bass resonance with characteristic parchment buzzing damper bridge.",
    tuning: "Tuned to Bati & Tizita Sacred Pentatonic Modes",
  },
  {
    id: "kirar",
    name: "Highland Kirar (Acoustic Lyre)",
    amharic: "ክራር",
    category: "6-String Bowl Lyre",
    audioSrc: "/audio/kirar.mp3",
    description: "Lively, rhythmic highland modal strumming popular in festive gatherings and secular celebrations.",
    tuning: "Tuned to Ambassel & Anchi Hoye Scales",
  },
  {
    id: "masinko",
    name: "Authentic Masinko (Single String Fiddle)",
    amharic: "ማሲንቆ",
    category: "Bowed Lute with Horsehair Bow",
    audioSrc: "/audio/masinko.mp3",
    description: "Diamond goatskin soundbox with horsehair bow producing soulful, expressive highland troubadour ballads.",
    tuning: "Flexible Glissando Microtonal Tuning",
  },
];

export default function AudioAudition() {
  const [activeTrackIndex, setActiveTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTrack = tracks[activeTrackIndex];

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [activeTrackIndex]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch((e) => console.log("Audio play error:", e));
    }
  };

  const onTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const onLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const onEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = Math.floor(secs % 60);
    return `${mins}:${remaining < 10 ? "0" : ""}${remaining}`;
  };

  return (
    <section id="audition" className="w-full py-20 px-4 sm:px-8 relative overflow-hidden bg-gradient-to-b from-[#080b09] via-[#0c140f] to-[#080b09]">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={currentTrack.audioSrc}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onEnded}
      />

      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#2d6a4f]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#d4af37]/30 bg-[#14231b] text-xs text-[#d4af37] font-semibold tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Studio Acoustic Auditions</span>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#fbf8f2] tracking-tight">
            Listen to Sacred Ethiopian Tones
          </h2>
          <p className="text-xs sm:text-sm text-[#fbf8f2]/70 leading-relaxed">
            Experience uncompressed studio recordings of our handcrafted instruments tuned to historic pentatonic modes.
          </p>
        </div>

        {/* Player Container */}
        <div className="rounded-3xl border border-[#d4af37]/30 bg-[#0f1a14]/85 backdrop-blur-2xl p-6 sm:p-10 shadow-2xl">
          {/* Instrument Switcher Tabs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
            {tracks.map((track, idx) => {
              const isSelected = idx === activeTrackIndex;
              return (
                <button
                  key={track.id}
                  onClick={() => setActiveTrackIndex(idx)}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "border-[#d4af37] bg-[#14231b] shadow-lg shadow-[#d4af37]/10"
                      : "border-[#d4af37]/15 bg-[#080b09]/60 hover:border-[#d4af37]/40 hover:bg-[#14231b]/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-[#d4af37] uppercase tracking-widest font-semibold">{track.category}</span>
                    <span className="font-serif text-lg text-[#d4af37] font-bold">{track.amharic}</span>
                  </div>
                  <h3 className="font-serif text-base font-bold text-[#fbf8f2]">{track.name}</h3>
                </button>
              );
            })}
          </div>

          {/* Active Player Deck */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 pt-4 border-t border-[#d4af37]/15">
            <div className="flex-1 space-y-2 text-center md:text-left">
              <span className="text-[11px] text-[#52b788] font-bold uppercase tracking-widest flex items-center justify-center md:justify-start gap-1.5">
                <Music className="w-3.5 h-3.5" />
                <span>{currentTrack.tuning}</span>
              </span>
              <h4 className="font-serif text-2xl font-bold text-[#f3e5ab]">{currentTrack.name}</h4>
              <p className="text-xs text-[#fbf8f2]/70 max-w-lg leading-relaxed">{currentTrack.description}</p>
            </div>

            {/* Controls */}
            <div className="flex flex-col items-center gap-4 w-full md:w-auto">
              {/* Visualizer bars */}
              <div className="flex items-end gap-1.5 h-8">
                {[40, 75, 55, 90, 60, 100, 45, 80, 65, 95].map((h, i) => (
                  <div
                    key={i}
                    className={`w-1.5 rounded-full transition-all duration-300 ${
                      isPlaying ? "bg-[#d4af37] animate-pulse" : "bg-[#d4af37]/30"
                    }`}
                    style={{
                      height: isPlaying ? `${h}%` : "20%",
                      animationDelay: `${i * 100}ms`,
                    }}
                  />
                ))}
              </div>

              {/* Play/Pause Button */}
              <div className="flex items-center gap-4">
                <button
                  onClick={togglePlay}
                  className="w-14 h-14 rounded-full gold-gradient-bg text-[#080b09] flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  aria-label={isPlaying ? "Pause audio" : "Play audio"}
                >
                  {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
                </button>

                <div className="text-xs font-mono text-[#f3e5ab]">
                  <span>{formatTime(currentTime)}</span>
                  <span className="text-[#fbf8f2]/40"> / {formatTime(duration || 0)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Call to Action banner */}
          <div className="mt-8 pt-6 border-t border-[#d4af37]/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-[#fbf8f2]/60">
              Want this sound in your personal studio or sacred sanctuary?
            </span>
            <Link
              href="/products"
              className="px-5 py-2.5 rounded-xl border border-[#d4af37]/50 bg-[#14231b] hover:bg-[#1b4332] text-xs font-bold text-[#f3e5ab] transition-all flex items-center gap-2 group"
            >
              <span>Explore {currentTrack.amharic} in Catalog</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
