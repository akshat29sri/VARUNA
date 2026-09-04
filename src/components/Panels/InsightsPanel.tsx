import React from 'react';
import { AlertTriangle, MapPin, Layers, ArrowRight, Eye } from 'lucide-react';
import { OceanAnomaly } from '../../types/ocean';
import { OCEAN_ANOMALIES } from '../../data/anomalies';

interface InsightsPanelProps {
  selectedAnomaly: OceanAnomaly | null;
  onSelectAnomaly: (anomaly: OceanAnomaly) => void;
  onClose: () => void;
}

export const InsightsPanel: React.FC<InsightsPanelProps> = ({
  selectedAnomaly,
  onSelectAnomaly,
  onClose,
}) => {
  return (
    <div className="fixed top-16 left-20 md:left-64 z-30 w-80 md:w-96 bg-[#040d1a]/95 backdrop-blur-md rounded-2xl border border-rose-500/30 shadow-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between pb-2 border-b border-ocean-800/60">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Thermal & Salinity Anomalies</span>
        </div>
        <button onClick={onClose} className="text-xs text-slate-400 hover:text-white cursor-pointer">
          Close
        </button>
      </div>

      <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
        {OCEAN_ANOMALIES.length === 0 ? (
          <div className="p-3 rounded-xl border border-ocean-800/60 bg-ocean-950/60 text-[11px] text-slate-400 leading-relaxed">
            Real anomaly detection is not enabled yet. Step 2 uses live model and Argo data only; a climatology baseline will be added before anomaly values are shown.
          </div>
        ) : OCEAN_ANOMALIES.map((anom) => {
          const isSelected = selectedAnomaly?.id === anom.id;
          return (
            <div
              key={anom.id}
              onClick={() => onSelectAnomaly(anom)}
              className={`p-3 rounded-xl border transition cursor-pointer flex flex-col gap-1.5 ${
                isSelected
                  ? 'bg-rose-950/40 border-rose-400/80 shadow-sm'
                  : 'bg-ocean-950/60 border-ocean-800/60 hover:border-ocean-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-100">{anom.title}</span>
                <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-[10px] font-mono font-bold text-rose-300">
                  {anom.magnitude > 0 ? `+${anom.magnitude}` : anom.magnitude} {anom.unit}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-ocean-400" />
                  <span>{anom.region}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Layers className="w-3 h-3 text-ocean-400" />
                  <span>{anom.depth} m</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-snug">{anom.summary}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
