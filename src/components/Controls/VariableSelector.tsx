import React from 'react';
import {
  Thermometer,
  Droplets,
  Wind,
  Sparkles,
  Activity,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { OceanVariable } from '../../types/ocean';
import { VARIABLES } from '../../data/oceanData';
import { getColormapGradientCSS } from '../../utils/colormaps';

type CurrentColorMode = 'speed' | 'temperature';

interface VariableSelectorProps {
  currentVariable: OceanVariable;
  onVariableChange: (
    variable: OceanVariable
  ) => void;
}

export const VariableSelector: React.FC<
  VariableSelectorProps
> = ({
  currentVariable,
  onVariableChange,
}) => {
  const [isExpanded, setIsExpanded] =
    React.useState(false);

  const [currentColorMode, setCurrentColorMode] =
    React.useState<CurrentColorMode>(
      'speed'
    );

  const currentConfig =
    VARIABLES[currentVariable];

  const variableOptions = [
    {
      id: 'temperature',
      label: 'Temperature',
      unit: '°C',
      icon: Thermometer,
    },
    {
      id: 'salinity',
      label: 'Salinity',
      unit: 'PSU',
      icon: Droplets,
    },
    {
      id: 'currents',
      label: 'Currents',
      unit: 'm/s',
      icon: Wind,
    },
    {
      id: 'chlorophyll',
      label: 'Chlorophyll',
      unit: 'mg/m³',
      icon: Sparkles,
    },
    {
      id: 'oxygen',
      label: 'Dissolved O₂',
      unit: 'ml/L',
      icon: Activity,
    },
  ];

  const handleColorModeChange = (
    mode: CurrentColorMode
  ) => {
    setCurrentColorMode(mode);

    window.dispatchEvent(
      new CustomEvent(
        'varuna-current-color-mode',
        {
          detail: mode,
        }
      )
    );
  };

  return (
    <div className="flex flex-col gap-2 p-3 bg-[#04111f]/90 backdrop-blur-md rounded-lg border border-cyan-950/70 shadow-abyss-card select-none">
      <button
        type="button"
        onClick={() =>
          setIsExpanded(
            (prev) => !prev
          )
        }
        aria-expanded={
          isExpanded
        }
        className="flex items-center justify-between w-full text-left cursor-pointer"
      >
        <span className="text-xs font-semibold text-slate-200">
          Ocean Parameter
        </span>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-cyan-300 font-mono font-medium">
            {currentConfig.name}{' '}
            ({currentConfig.unit})
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
            {variableOptions.map(
              (opt) => {
                const Icon =
                  opt.icon;

                const isSelected =
                  currentVariable ===
                  opt.id;

                return (
                  <button
                    key={opt.id}
                    onClick={() =>
                      onVariableChange(
                        opt.id as OceanVariable
                      )
                    }
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-[11px] font-medium transition cursor-pointer min-h-8 ${
                      isSelected
                        ? 'bg-gradient-to-r from-ocean-600 to-cyan-600 text-white shadow-sm font-semibold border border-cyan-400/40'
                        : 'bg-ocean-950/60 hover:bg-ocean-900/60 text-slate-400 hover:text-slate-200 border border-ocean-900'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />

                    <span>
                      {opt.label}
                    </span>
                  </button>
                );
              }
            )}
          </div>

          {/*
           * Current-specific colour control.
           *
           * It only appears when Currents is selected, so the
           * existing UI for every other variable is untouched.
           */}
          {currentVariable ===
            'currents' && (
            <div className="pt-2 border-t border-ocean-900">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                  Colour by
                </span>

                <div className="flex items-center gap-1 rounded-md bg-ocean-950/70 border border-ocean-900 p-0.5">
                  <button
                    type="button"
                    onClick={() =>
                      handleColorModeChange(
                        'speed'
                      )
                    }
                    className={`px-2.5 py-1 rounded text-[10px] font-semibold transition cursor-pointer ${
                      currentColorMode ===
                      'speed'
                        ? 'bg-cyan-600/80 text-white'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Speed
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleColorModeChange(
                        'temperature'
                      )
                    }
                    className={`px-2.5 py-1 rounded text-[10px] font-semibold transition cursor-pointer ${
                      currentColorMode ===
                      'temperature'
                        ? 'bg-cyan-600/80 text-white'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Temperature
                  </button>
                </div>
              </div>

              <div className="mt-1 text-[9px] text-slate-600">
                {currentColorMode ===
                'speed'
                  ? 'Current strength from u/v velocity'
                  : 'Temperature sampled along current paths'}
              </div>
            </div>
          )}

          {/* Scientific Colormap Legend */}
          <div className="pt-2 border-t border-ocean-900 flex flex-col gap-1">
            <div
              className="h-2.5 rounded-full w-full border border-ocean-700/50 shadow-inner"
              style={{
                background:
                  currentVariable ===
                    'currents' &&
                  currentColorMode ===
                    'temperature'
                    ? getColormapGradientCSS(
                        VARIABLES.temperature
                          .colormap
                      )
                    : getColormapGradientCSS(
                        currentConfig.colormap
                      ),
              }}
            />

            <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
              {currentVariable ===
                'currents' &&
              currentColorMode ===
                'temperature' ? (
                <>
                  <span>
                    {VARIABLES.temperature.min}{' '}
                    °C
                  </span>

                  <span className="text-[9px] uppercase tracking-wider text-slate-500 font-sans">
                    Temperature
                  </span>

                  <span>
                    {VARIABLES.temperature.max}{' '}
                    °C
                  </span>
                </>
              ) : (
                <>
                  <span>
                    {currentConfig.min}{' '}
                    {currentConfig.unit}
                  </span>

                  <span className="text-[9px] uppercase tracking-wider text-slate-500 font-sans">
                    {currentConfig.colormap}{' '}
                    Colormap
                  </span>

                  <span>
                    {currentConfig.max}{' '}
                    {currentConfig.unit}
                  </span>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};