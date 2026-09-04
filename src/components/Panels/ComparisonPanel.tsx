import React from 'react';
import { X, GitCompare, CheckCircle2, TrendingUp, AlertCircle, HelpCircle } from 'lucide-react';
import { ModelComparisonResult } from '../../types/ocean';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

interface ComparisonPanelProps {
  comparison: ModelComparisonResult | null;
  onClose: () => void;
}

export const ComparisonPanel: React.FC<ComparisonPanelProps> = ({ comparison, onClose }) => {
  if (!comparison) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-[#040d1a]/95 backdrop-blur-xl border-l border-ocean-800/60 shadow-2xl z-50 flex flex-col justify-between overflow-y-auto">
      {/* Header */}
      <div>
        <div className="px-5 py-4 bg-ocean-950/80 border-b border-ocean-800/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Model vs Observation</h3>
              <p className="text-xs text-slate-400">{comparison.locationName} • Depth {comparison.depth}m</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-ocean-900/60 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Core Metric Cards */}
        <div className="p-5 flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-xl bg-ocean-950/70 border border-ocean-800/60 flex flex-col">
              <span className="text-[10px] uppercase font-mono text-slate-400">Observed</span>
              <span className="text-lg font-bold text-cyan-300">
                {comparison.observedValue} {comparison.unit}
              </span>
              <span className="text-[10px] text-slate-500">In-situ Argo Float</span>
            </div>

            <div className="p-3 rounded-xl bg-ocean-950/70 border border-ocean-800/60 flex flex-col">
              <span className="text-[10px] uppercase font-mono text-slate-400">Model Pred.</span>
              <span className="text-lg font-bold text-amber-300">
                {comparison.modelValue} {comparison.unit}
              </span>
              <span className="text-[10px] text-slate-500">INCOIS-OGCM</span>
            </div>

            <div className="p-3 rounded-xl bg-ocean-950/70 border border-ocean-800/60 flex flex-col">
              <span className="text-[10px] uppercase font-mono text-slate-400">Difference (Δ)</span>
              <span className={`text-lg font-bold ${comparison.difference > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {comparison.difference > 0 ? `+${comparison.difference}` : comparison.difference} {comparison.unit}
              </span>
              <span className="text-[10px] text-slate-500">Bias: +{comparison.bias}{comparison.unit}</span>
            </div>
          </div>

          {/* Plain-English "So What?" Box */}
          <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-cyan-300 font-semibold text-xs">
              <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Plain-English Interpretation</span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed font-medium">
              "{comparison.humanExplanation}"
            </p>
          </div>

          {/* Vertical Profile Comparison Chart */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-slate-300">Water Column Delta Profile (0–2000m)</span>
            <div className="h-56 w-full bg-[#02070f] rounded-xl border border-ocean-900 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={comparison.verticalDeltaProfile} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#0f2942" />
                  <XAxis type="number" stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} unit={comparison.unit} />
                  <YAxis type="number" dataKey="depth" reversed={true} stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} unit="m" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#040d1a', borderColor: '#0284c7', borderRadius: '8px', fontSize: '11px', color: '#e0f2fe' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line type="monotone" dataKey="observation" stroke="#06b6d4" strokeWidth={2} name="Observed" dot={false} />
                  <Line type="monotone" dataKey="model" stroke="#f59e0b" strokeWidth={2} name="Model" strokeDasharray="4 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Statistical Validation Matrix */}
          <div className="p-3.5 rounded-xl bg-ocean-950/60 border border-ocean-800/40 flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-300">Statistical Error Metrics</span>
            <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
              <div className="p-2 rounded bg-abyss-900 border border-ocean-900">
                <div className="text-[10px] text-slate-400">MAE</div>
                <div className="font-bold text-slate-200">{comparison.mae} {comparison.unit}</div>
              </div>
              <div className="p-2 rounded bg-abyss-900 border border-ocean-900">
                <div className="text-[10px] text-slate-400">RMSE</div>
                <div className="font-bold text-slate-200">{comparison.rmse} {comparison.unit}</div>
              </div>
              <div className="p-2 rounded bg-abyss-900 border border-ocean-900">
                <div className="text-[10px] text-slate-400">Correlation (r)</div>
                <div className="font-bold text-emerald-400">{comparison.correlation}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-ocean-800/60 bg-ocean-950/40 text-[11px] text-slate-500 font-mono text-center">
        Ocean Circulation Model Validation • INCOIS Data Assimilation Standard
      </div>
    </div>
  );
};
