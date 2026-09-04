import React from 'react';
import { Thermometer, Droplets, Wind, Sparkles, Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { OceanVariable } from '../../types/ocean';
import { VARIABLES } from '../../data/oceanData';
import { getColormapGradientCSS } from '../../utils/colormaps';

interface VariableSelectorProps {
  currentVariable: OceanVariable;
  onVariableChange: (variable: OceanVariable) => void;
}

export const VariableSelector: React.FC<VariableSelectorProps> = ({ currentVariable, onVariableChange }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const currentConfig = VARIABLES[currentVariable];

  const variableOptions = [
    { id: 'temperature', label: 'Temperature', unit: '°C', icon: Thermometer },
    { id: 'salinity', label: 'Salinity', unit: 'PSU', icon: Droplets },
    { id: 'currents', label: 'Currents', unit: 'm/s', icon: Wind },
    { id: 'chlorophyll', label: 'Chlorophyll', unit: 'mg/m³', icon: Sparkles },
    { id: 'oxygen', label: 'Dissolved O₂', unit: 'ml/L', icon: Activity },
  ];

  return (
    <div className="flex flex-col gap-2 p-3 bg-[#04111f]/90 backdrop-blur-md rounded-lg border border-cyan-950/70 shadow-abyss-card select-none">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        className="flex items-center justify-between w-full text-left cursor-pointer"
      >
        <span className="text-xs font-semibold text-slate-200">Ocean Parameter</span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-cyan-300 font-mono font-medium">
            {currentConfig.name} ({currentConfig.unit})
          </span>
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <>
          {/* Variable Tabs */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1">
        {variableOptions.map((opt) => {
          const Icon = opt.icon;
          const isSelected = currentVariable === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => onVariableChange(opt.id as OceanVariable)}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-[11px] font-medium transition cursor-pointer min-h-8 ${
                isSelected
                  ? 'bg-gradient-to-r from-ocean-600 to-cyan-600 text-white shadow-sm font-semibold border border-cyan-400/40'
                  : 'bg-ocean-950/60 hover:bg-ocean-900/60 text-slate-400 hover:text-slate-200 border border-ocean-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>

          {/* Scientific Colormap Legend */}
          <div className="pt-2 border-t border-ocean-900 flex flex-col gap-1">
            <div
              className="h-2.5 rounded-full w-full border border-ocean-700/50 shadow-inner"
              style={{ background: getColormapGradientCSS(currentConfig.colormap) }}
            />
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
              <span>{currentConfig.min} {currentConfig.unit}</span>
              <span className="text-[9px] uppercase tracking-wider text-slate-500 font-sans">
                {currentConfig.colormap} Colormap
              </span>
              <span>{currentConfig.max} {currentConfig.unit}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
