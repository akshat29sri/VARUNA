import React, { useEffect } from 'react';
import { Play, Pause, RotateCcw, Calendar } from 'lucide-react';
import { TIMELINE_DATES } from '../../data/oceanData';

interface TimeControlProps {
  timeIndex: number;
  setTimeIndex: React.Dispatch<React.SetStateAction<number>>;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
}

export const TimeControl: React.FC<TimeControlProps> = ({
  timeIndex,
  setTimeIndex,
  isPlaying,
  setIsPlaying,
}) => {
  const currentDate = TIMELINE_DATES[timeIndex] || TIMELINE_DATES[0];

  // Playback timer loop
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setTimeIndex((prev) => (prev + 1) % 30);
    }, 600);
    return () => clearInterval(interval);
  }, [isPlaying, setTimeIndex]);

  return (
    <div className="flex flex-col gap-2 p-3 bg-[#04111f]/90 backdrop-blur-md rounded-lg border border-cyan-950/70 shadow-abyss-card select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
          <Calendar className="w-3.5 h-3.5 text-cyan-400" />
          <span>Timeline Exploration</span>
        </div>
        <div className="px-2 py-0.5 rounded bg-ocean-950 border border-ocean-600/40 text-[11px] font-mono font-bold text-cyan-300">
          {currentDate.dateString}
        </div>
      </div>

      {/* Scrub Slider & Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="p-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition cursor-pointer shadow-sm shrink-0"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>

        <button
          onClick={() => setTimeIndex(0)}
          className="p-1.5 rounded-lg bg-ocean-950 hover:bg-ocean-900 text-slate-400 hover:text-slate-200 transition cursor-pointer shrink-0"
          title="Reset to Day 1"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <input
          type="range"
          min="0"
          max="29"
          value={timeIndex}
          onChange={(e) => setTimeIndex(Number(e.target.value))}
          className="w-full accent-cyan-400 bg-ocean-950 h-1.5 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono pt-1 border-t border-ocean-900">
        <span>Jan 01, 2026</span>
        <span className="text-cyan-400 font-medium">{currentDate.monsoonPhase}</span>
        <span>Jan 30, 2026</span>
      </div>
    </div>
  );
};
