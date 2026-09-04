import React, { useState } from 'react';
import { X, Radio, Activity, Download, Layers, ShieldCheck } from 'lucide-react';
import { ObservationPoint } from '../../types/ocean';
import { formatCoordinates } from '../../utils/geo';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';

interface ObservationProfileModalProps {
  observation: ObservationPoint | null;
  onClose: () => void;
  onCompareWithModel: (obs: ObservationPoint) => void;
}

export const ObservationProfileModal: React.FC<ObservationProfileModalProps> = ({
  observation,
  onClose,
  onCompareWithModel,
}) => {
  const [profileVar, setProfileVar] = useState<'temperature' | 'salinity' | 'dissolvedOxygen'>('temperature');

  if (!observation) return null;

  const dataKey = profileVar;
  const unit = profileVar === 'temperature' ? '°C' : profileVar === 'salinity' ? 'PSU' : 'ml/L';
  const color = profileVar === 'temperature' ? '#06b6d4' : profileVar === 'salinity' ? '#f59e0b' : '#10b981';

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#040d1a] border border-ocean-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-ocean-950/80 border-b border-ocean-800/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">{observation.name}</h3>
                <span className="px-2 py-0.5 rounded bg-ocean-900 text-[10px] font-mono text-ocean-300 border border-ocean-700">
                  WMO #{observation.wmoId}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {formatCoordinates(observation.lat, observation.lon)} • {observation.timestamp}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-ocean-900/60 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Variable Selector Tabs */}
        <div className="px-5 py-2.5 bg-ocean-950/40 border-b border-ocean-800/40 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setProfileVar('temperature')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                profileVar === 'temperature'
                  ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Temperature Profile (°C)
            </button>
            <button
              onClick={() => setProfileVar('salinity')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                profileVar === 'salinity'
                  ? 'bg-amber-500/20 border border-amber-400 text-amber-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Salinity Profile (PSU)
            </button>
            <button
              onClick={() => setProfileVar('dissolvedOxygen')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                profileVar === 'dissolvedOxygen'
                  ? 'bg-emerald-500/20 border border-emerald-400 text-emerald-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Oxygen (ml/L)
            </button>
          </div>

          <button
            onClick={() => onCompareWithModel(observation)}
            className="px-3 py-1 rounded-md bg-ocean-600 hover:bg-ocean-500 text-white text-xs font-medium transition cursor-pointer flex items-center gap-1"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Compare with Model</span>
          </button>
        </div>

        {/* Profile Chart Canvas */}
        <div className="p-5 flex-1 flex flex-col gap-3">
          <div className="h-72 w-full bg-[#02070f] rounded-xl border border-ocean-900/80 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={observation.profile}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#0f2942" />
                <XAxis
                  type="number"
                  domain={['auto', 'auto']}
                  stroke="#64748b"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  unit={unit}
                />
                <YAxis
                  type="number"
                  dataKey="depth"
                  reversed={true}
                  stroke="#64748b"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  unit="m"
                  domain={[0, 2000]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#040d1a',
                    borderColor: '#0284c7',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#e0f2fe',
                  }}
                  formatter={(val: number) => [`${val} ${unit}`, profileVar]}
                  labelFormatter={(depth) => `Depth: ${depth} m`}
                />
                <ReferenceLine y={85} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Thermocline Base (85m)', fill: '#f59e0b', fontSize: 10, position: 'right' }} />
                <Line
                  type="monotone"
                  dataKey={dataKey}
                  stroke={color}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: color }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Scientific Interpretation Footer */}
          <div className="p-3 rounded-lg bg-ocean-950/60 border border-ocean-800/40 text-xs text-slate-300 flex flex-col gap-1">
            <span className="font-semibold text-cyan-300">Oceanographic Profile Summary:</span>
            <p className="text-slate-400 leading-relaxed">
              Surface mixed layer extends to ~50m with near-uniform temperature ({observation.surfaceTemp}°C). Rapid thermocline gradient occurs between 60m–150m, transitioning into uniform intermediate water masses at 1000m+.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
