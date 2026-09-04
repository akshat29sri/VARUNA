import React from 'react';
import { Globe, GitCompare, Clock, Radio, AlertTriangle, Layers, MapPin, Wind } from 'lucide-react';
import { OceanRegion } from '../../types/ocean';
import { OCEAN_REGIONS } from '../../data/oceanData';

interface NavSidebarProps {
  activeView: string;
  setActiveView: (view: 'explore' | 'compare' | 'time' | 'observations' | 'insights' | 'research') => void;
  currentRegion: OceanRegion;
  onSelectRegion: (region: OceanRegion) => void;
  showObservations: boolean;
  setShowObservations: (show: boolean) => void;
  showCurrents: boolean;
  setShowCurrents: (show: boolean) => void;
  showAnomalies: boolean;
  setShowAnomalies: (show: boolean) => void;
}

export const NavSidebar: React.FC<NavSidebarProps> = ({
  activeView,
  setActiveView,
  currentRegion,
  onSelectRegion,
  showObservations,
  setShowObservations,
  showCurrents,
  setShowCurrents,
  showAnomalies,
  setShowAnomalies,
}) => {
  const prototypeRegions = OCEAN_REGIONS.filter((region) =>
    ['global-overview', 'arabian-sea', 'bay-of-bengal'].includes(region.id)
  );

  const navItems = [
    { id: 'explore', label: 'Explore', icon: Globe, desc: '3D Ocean Basin' },
    { id: 'compare', label: 'Compare', icon: GitCompare, desc: 'Model vs Obs' },
    { id: 'time', label: 'Time', icon: Clock, desc: '30-Day Evolution' },
    { id: 'observations', label: 'Observations', icon: Radio, desc: 'Argo & Gliders' },
    { id: 'insights', label: 'Insights', icon: AlertTriangle, desc: 'Thermal Anomalies' },
  ];

  return (
    <aside className="w-16 md:w-56 bg-[#040d1a]/90 backdrop-blur-md border-r border-ocean-800/40 flex flex-col justify-between py-3 z-20 select-none">
      {/* Primary Navigation */}
      <div className="flex flex-col gap-6 px-2">
        <div className="flex flex-col gap-1">
          <div className="hidden md:block px-2 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold mb-1">
            Workspace Views
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveView(item.id as any);
                  if (item.id === 'observations') setShowObservations(true);
                  if (item.id === 'insights') setShowAnomalies(true);
                }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition cursor-pointer text-left ${
                  isActive
                    ? 'bg-ocean-600/30 text-cyan-300 border border-ocean-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-ocean-950/60'
                }`}
                title={item.label}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <div className="hidden md:block">
                  <div className="leading-tight">{item.label}</div>
                  <div className="text-[10px] text-slate-500 leading-tight">{item.desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Region Quick Selector */}
        <div className="hidden md:flex flex-col gap-1.5">
          <div className="px-2 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1">
            <MapPin className="w-3 h-3 text-ocean-400" />
            <span>Target Regions</span>
          </div>
          <div className="flex flex-col gap-0.5">
            {prototypeRegions.map((reg) => (
              <button
                key={reg.id}
                onClick={() => onSelectRegion(reg)}
                className={`px-2.5 py-1.5 rounded-md text-[11px] text-left transition cursor-pointer truncate ${
                  currentRegion.id === reg.id
                    ? 'bg-ocean-500/20 text-cyan-300 font-semibold border-l-2 border-cyan-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-ocean-950/40'
                }`}
              >
                {reg.name}
              </button>
            ))}
          </div>
        </div>

        {/* Layer Toggles */}
        <div className="hidden md:flex flex-col gap-2 pt-2 border-t border-ocean-800/40">
          <div className="px-2 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1">
            <Layers className="w-3 h-3 text-ocean-400" />
            <span>Layers</span>
          </div>
          <div className="flex flex-col gap-1.5 px-2">
            <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
              <span className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-cyan-400" />
                <span>Argo Floats</span>
              </span>
              <input
                type="checkbox"
                checked={showObservations}
                onChange={(e) => setShowObservations(e.target.checked)}
                className="rounded bg-ocean-950 border-ocean-700 text-cyan-500 focus:ring-0 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
              <span className="flex items-center gap-1.5">
                <Wind className="w-3.5 h-3.5 text-cyan-400" />
                <span>Current Vectors</span>
              </span>
              <input
                type="checkbox"
                checked={showCurrents}
                onChange={(e) => setShowCurrents(e.target.checked)}
                className="rounded bg-ocean-950 border-ocean-700 text-cyan-500 focus:ring-0 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>Anomalies</span>
              </span>
              <input
                type="checkbox"
                checked={showAnomalies}
                onChange={(e) => setShowAnomalies(e.target.checked)}
                className="rounded bg-ocean-950 border-ocean-700 text-rose-500 focus:ring-0 cursor-pointer"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Bottom Status Info */}
      <div className="hidden md:block px-3 py-2 border-t border-ocean-800/40 text-[10px] text-slate-500 font-mono">
        <div>COORDINATES REF: WGS84</div>
        <div className="text-ocean-400">DEPTH STRATA: 0–4000m</div>
      </div>
    </aside>
  );
};
