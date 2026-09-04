import React from 'react';
import { Info } from 'lucide-react';

interface MicroInteractionToastProps {
  message: string | null;
}

export const MicroInteractionToast: React.FC<MicroInteractionToastProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#040d1a]/95 border border-cyan-500/40 text-xs font-mono text-cyan-200 shadow-ocean-glow animate-fade-in pointer-events-none">
      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
      <span>{message}</span>
    </div>
  );
};
