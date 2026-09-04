import React from 'react';
import { Compass, Waves, Sparkles, ShieldCheck, PlayCircle, BarChart3 } from 'lucide-react';
import { OceanRegion } from '../../types/ocean';
import { formatCoordinates } from '../../utils/geo';

interface TopHeaderProps {
  currentRegion: OceanRegion;
  hoverCoordinates: { lat: number; lon: number } | null;
  hoverValue: { value: number; unit: string } | null;
  activeView: string;
  onOpenDemoTour: () => void;
  onToggleResearchMode: () => void;
  onOpenAssistant: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentRegion,
  hoverCoordinates,
  hoverValue,
  activeView,
  onOpenDemoTour,
  onToggleResearchMode,
  onOpenAssistant,
}) => {
  return (
    <header className="h-14 px-3 md:px-4 bg-[#04111f]/90 backdrop-blur-md border-b border-cyan-950/70 flex items-center justify-between z-30 select-none shadow-[0_1px_0_rgba(255,255,255,0.03)]">
      {/* Brand & Tagline */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-ocean-500 to-cyan-600 flex items-center justify-center shadow-ocean-glow">
          <Waves className="w-5 h-5 text-white animate-pulse-subtle" />
        </div>
        <div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold tracking-tight text-white text-base">OceanMind</span>
            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-ocean-950 border border-ocean-600/40 text-ocean-300">
              v1.0 • SIH 2026
            </span>
          </div>
          <p className="text-[11px] text-slate-400 hidden sm:block">3D Ocean Visualization & Analysis Workspace</p>
        </div>
      </div>

      {/* Center: Realtime Telemetry Cursor Readout */}
      <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-abyss-900/90 border border-ocean-800/50 text-xs font-mono text-slate-300 shadow-inner">
        <div className="flex items-center gap-1.5 text-ocean-400">
          <Compass className="w-3.5 h-3.5" />
          <span>{currentRegion.name}</span>
        </div>
        <span className="text-slate-600">|</span>
        <div>
          {hoverCoordinates ? (
            <span className="text-slate-200">{formatCoordinates(hoverCoordinates.lat, hoverCoordinates.lon)}</span>
          ) : (
            <span className="text-slate-500">Cursor over globe</span>
          )}
        </div>
        {hoverValue && (
          <>
            <span className="text-slate-600">|</span>
            <span className="text-cyan-300 font-semibold">
              {hoverValue.value} {hoverValue.unit}
            </span>
          </>
        )}
      </div>

      {/* Right Controls & Scientific Data Disclaimer Badge */}
      <div className="flex items-center gap-2">
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded bg-ocean-950/80 border border-ocean-700/40 text-[11px] text-ocean-300 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>INCOIS / Argo Prototype Data</span>
        </div>

        <button
          onClick={onOpenDemoTour}
          className="flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-md bg-ocean-600 hover:bg-ocean-500 text-white text-xs font-medium transition shadow-sm cursor-pointer"
        >
          <PlayCircle className="w-4 h-4 text-cyan-200" />
          <span className="hidden sm:inline">Demo Tour</span>
        </button>

        <button
          onClick={onToggleResearchMode}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition cursor-pointer ${
            activeView === 'research'
              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
              : 'bg-ocean-950/80 border-ocean-700/40 text-slate-300 hover:text-white hover:border-ocean-600'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">Research Mode</span>
        </button>

        <button
          onClick={onOpenAssistant}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gradient-to-r from-ocean-800 to-indigo-900 border border-ocean-600/40 hover:border-ocean-400 text-ocean-200 text-xs font-medium transition cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
          <span className="hidden sm:inline">Research Assistant</span>
        </button>
      </div>
    </header>
  );
};
