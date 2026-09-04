import React from 'react';
import { X, Play, ArrowRight, CheckCircle, Sparkles, Compass } from 'lucide-react';

interface DemoTourModalProps {
  currentStep: number;
  onNextStep: () => void;
  onClose: () => void;
}

export const DEMO_STEPS = [
  {
    step: 1,
    title: 'Step 1: Welcome to OceanMind',
    desc: 'Immersive 3D Ocean research platform with bathymetric colormapping, atmospheric glow, and live Indian Ocean basin physics.',
    actionLabel: 'Explore Arabian Sea',
  },
  {
    step: 2,
    title: 'Step 2: Regional Navigation',
    desc: 'Camera glides smoothly to the Arabian Sea basin, initializing spatial boundaries and thermocline depth baselines.',
    actionLabel: 'Select Temperature at 500m',
  },
  {
    step: 3,
    title: 'Step 3: Depth & Variable Stratification',
    desc: 'Diving from the sunlit epipelagic surface down to 500m intermediate water mass, displaying calibrated thermal fields.',
    actionLabel: 'Show In-Situ Observations',
  },
  {
    step: 4,
    title: 'Step 4: Observational Array',
    desc: 'Assimilating 3D in-situ Argo floats, underwater gliders, and RAMA moored buoys across the Arabian Sea.',
    actionLabel: 'Inspect Argo Float Profile',
  },
  {
    step: 5,
    title: 'Step 5: Vertical Profile Analysis',
    desc: 'Opening continuous water column profile (0–2000m) with temperature, salinity, and mixed layer depth annotations.',
    actionLabel: 'Compare Model vs Observation',
  },
  {
    step: 6,
    title: 'Step 6: Numerical Model Validation',
    desc: 'Evaluating OGCM model simulation (18.8°C) against Argo in-situ float (18.2°C) with bias (+0.6°C), MAE, and RMSE metrics.',
    actionLabel: 'Investigate Thermal Anomalies',
  },
  {
    step: 7,
    title: 'Step 7: Mesoscale Anomaly Detection',
    desc: 'Highlighting the Arabian Sea Warm Core Eddy (+2.1°C thermal elevation above climatological baseline at 500m).',
    actionLabel: 'Play 30-Day Evolution',
  },
  {
    step: 8,
    title: 'Step 8: 30-Day Temporal Evolution',
    desc: 'Animating monsoonal current pulses, thermohaline eddy migration, and temporal heat transfer over 30 days.',
    actionLabel: 'Open Research Mode',
  },
  {
    step: 9,
    title: 'Step 9: Deep Research Mode',
    desc: 'Switching to scientific multi-metric analytics, water column delta plots, and standard CSV data export.',
    actionLabel: 'Ask AI Research Assistant',
  },
  {
    step: 10,
    title: 'Step 10: Natural Language AI Colleague',
    desc: 'Ask complex scientific questions; the Research Assistant executes structured 3D actions and explains findings in plain English.',
    actionLabel: 'Finish Demo Tour',
  },
];

export const DemoTourModal: React.FC<DemoTourModalProps> = ({ currentStep, onNextStep, onClose }) => {
  const stepInfo = DEMO_STEPS[Math.min(currentStep, DEMO_STEPS.length - 1)];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-lg bg-[#040d1a]/95 backdrop-blur-xl border border-cyan-500/50 rounded-2xl shadow-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between pb-2 border-b border-ocean-800">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-cyan-600 flex items-center justify-center text-white text-xs font-bold font-mono">
            {stepInfo.step}
          </div>
          <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">{stepInfo.title}</span>
        </div>
        <button onClick={onClose} className="text-xs text-slate-400 hover:text-white cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-slate-200 leading-relaxed">{stepInfo.desc}</p>

      {/* Progress Dots */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex gap-1.5">
          {DEMO_STEPS.map((s, idx) => (
            <div
              key={s.step}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === currentStep ? 'bg-cyan-400 w-5' : idx < currentStep ? 'bg-ocean-600' : 'bg-ocean-900'
              }`}
            />
          ))}
        </div>

        <button
          onClick={onNextStep}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-ocean-600 to-cyan-600 hover:from-ocean-500 hover:to-cyan-500 text-white text-xs font-medium transition cursor-pointer shadow-ocean-glow"
        >
          <span>{stepInfo.actionLabel}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
