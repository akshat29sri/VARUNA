import React from 'react';
import { ArrowDown, Layers, Sun, Moon, ChevronDown, ChevronUp } from 'lucide-react';
import { DepthLevel } from '../../types/ocean';
import { DEPTH_LEVELS, DEPTH_METADATA } from '../../data/oceanData';

interface DepthSliderProps {
  currentDepth: DepthLevel;
  onDepthChange: (depth: DepthLevel) => void;
}

export const DepthSlider: React.FC<DepthSliderProps> = ({ currentDepth, onDepthChange }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const currentMeta = DEPTH_METADATA[currentDepth];

  return (
    <div className="flex flex-col gap-2 p-3 bg-[#04111f]/90 backdrop-blur-md rounded-lg border border-cyan-950/70 shadow-abyss-card select-none">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        className="flex items-center justify-between w-full text-left cursor-pointer"
      >
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>Depth Stratum</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-2 py-0.5 rounded bg-ocean-950 border border-ocean-600/40 text-[11px] font-mono font-bold text-cyan-300">
            {currentDepth === 0 ? 'Surface' : `${currentDepth} m`}
          </div>
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <>
          {/* Horizontal / Compact Depth Buttons */}
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-1">
        {DEPTH_LEVELS.map((d) => {
          const isSelected = currentDepth === d;
          return (
            <button
              key={d}
              onClick={() => onDepthChange(d)}
              className={`py-1.5 px-2 rounded-md text-[11px] font-mono font-medium transition cursor-pointer flex flex-col items-center min-h-8 ${
                isSelected
                  ? 'bg-gradient-to-b from-cyan-500 to-ocean-600 text-white shadow-ocean-glow font-bold border border-cyan-300/40'
                  : 'bg-ocean-950/60 hover:bg-ocean-900/60 text-slate-400 hover:text-slate-200 border border-ocean-900'
              }`}
            >
              <span>{d === 0 ? '0m' : `${d}m`}</span>
            </button>
          );
        })}
      </div>

          {/* Depth Scientific Details */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-ocean-900 font-mono">
            <div className="flex items-center gap-1">
              {currentDepth <= 100 ? <Sun className="w-3 h-3 text-amber-400" /> : <Moon className="w-3 h-3 text-indigo-400" />}
              <span className="text-slate-300">{currentMeta.zone}</span>
            </div>
            <div className="text-cyan-400 font-medium">Climatology avg: ~{currentMeta.avgTemp}°C</div>
          </div>
        </>
      )}
    </div>
  );
};
