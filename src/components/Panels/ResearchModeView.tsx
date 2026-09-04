import React from 'react';
import { X, BarChart3, Download, Layers, Activity, FileSpreadsheet, Sparkles, Database } from 'lucide-react';
import { OceanState } from '../../types/ocean';
import { OBSERVATION_POINTS } from '../../data/observations';
import { OCEAN_ANOMALIES } from '../../data/anomalies';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

interface ResearchModeViewProps {
  state: OceanState;
  onClose: () => void;
}

export const ResearchModeView: React.FC<ResearchModeViewProps> = ({ state, onClose }) => {
  const chartData = state.activeComparison?.verticalDeltaProfile.map((point) => ({
    depth: `${Math.round(point.depth)}m`,
    obs: point.observation,
    model: point.model,
  })) ?? [];


  const handleExportCSV = () => {
    const headers = 'WMO_ID,Instrument,Latitude,Longitude,Depth_m,Temperature_C,Salinity_PSU,Timestamp\n';
    const rows = OBSERVATION_POINTS.map(
      (o) => `${o.wmoId},${o.instrument},${o.lat},${o.lon},${o.currentDepth},${o.tempAtDepth},${o.salinityAtDepth},"${o.timestamp}"`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OceanMind_Research_Export_${state.currentRegion.id}.csv`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#02070f]/95 backdrop-blur-2xl flex flex-col overflow-y-auto">
      {/* Top Bar */}
      <div className="h-14 px-6 bg-[#040d1a] border-b border-ocean-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-600/30 border border-cyan-500 flex items-center justify-center text-cyan-300">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Scientific Research Workspace</h2>
            <p className="text-xs text-slate-400">Multi-parameter Ocean State Analytics • {state.currentRegion.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ocean-600 hover:bg-ocean-500 text-white text-xs font-medium transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Dataset (CSV)</span>
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-ocean-900 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Analytical Grid */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto w-full">
        {/* Metric Summary */}
        <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-ocean-950/60 border border-ocean-800">
            <span className="text-xs text-slate-400 font-mono uppercase">Active Region</span>
            <div className="text-xl font-bold text-white">{state.currentRegion.name}</div>
            <span className="text-xs text-cyan-400">Lat: {state.currentRegion.lat}°N, Lon: {state.currentRegion.lon}°E</span>
          </div>

          <div className="p-4 rounded-xl bg-ocean-950/60 border border-ocean-800">
            <span className="text-xs text-slate-400 font-mono uppercase">Assimilated Floats</span>
            <div className="text-xl font-bold text-cyan-300">{OBSERVATION_POINTS.length} Instruments</div>
            <span className="text-xs text-emerald-400">Argo GDAC query</span>
          </div>

          <div className="p-4 rounded-xl bg-ocean-950/60 border border-ocean-800">
            <span className="text-xs text-slate-400 font-mono uppercase">Identified Anomalies</span>
            <div className="text-xl font-bold text-rose-400">{OCEAN_ANOMALIES.length} Features</div>
            <span className="text-xs text-slate-400">Real baseline pending</span>
          </div>

          <div className="p-4 rounded-xl bg-ocean-950/60 border border-ocean-800">
            <span className="text-xs text-slate-400 font-mono uppercase">Mean Model RMSE</span>
            <div className="text-xl font-bold text-amber-300">{state.activeComparison ? `${state.activeComparison.rmse} ${state.activeComparison.unit}` : '—'}</div>
            <span className="text-xs text-slate-400">{state.activeComparison ? `Pearson r = ${state.activeComparison.correlation}` : 'Run a model comparison'}</span>
          </div>
        </div>

        {/* Model vs In-situ Validation Chart */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-ocean-950/40 border border-ocean-800/80 flex flex-col gap-3">
          <h3 className="text-sm font-bold text-white">Depth Stratum Validation (Model vs Observation)</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartData.length > 0 ? (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#0f2942" />
                <XAxis dataKey="depth" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} unit="°C" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#040d1a', borderColor: '#0284c7', borderRadius: '8px', color: '#e0f2fe' }}
                />
                <Legend />
                <Bar dataKey="obs" name="Observed (Argo)" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                <Bar dataKey="model" name="Model Prediction (Copernicus)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500 border border-dashed border-ocean-800 rounded-xl">Run “Compare with Model” on an Argo profile to populate this chart.</div>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Active In-Situ Table */}
        <div className="p-5 rounded-2xl bg-ocean-950/40 border border-ocean-800/80 flex flex-col gap-3">
          <h3 className="text-sm font-bold text-white">Observational Mooring & Float Log</h3>
          <div className="flex flex-col gap-2 overflow-y-auto max-h-72 pr-1">
            {OBSERVATION_POINTS.slice(0, 6).map((obs) => (
              <div key={obs.id} className="p-2.5 rounded-lg bg-abyss-900 border border-ocean-900 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-200">{obs.name}</div>
                  <div className="text-[10px] text-slate-500">{obs.instrument} • {obs.timestamp}</div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-cyan-300 font-bold">{obs.surfaceTemp}°C</div>
                  <div className="text-[10px] text-slate-400">{obs.surfaceSalinity} PSU</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
