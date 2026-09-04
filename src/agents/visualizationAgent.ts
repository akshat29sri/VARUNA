import { DepthLevel, OceanRegion, OceanVariable } from '../types/ocean';
import { OCEAN_REGIONS } from '../data/oceanData';
import { ToolCall } from './agentTypes';

export class VisualizationAgent {
  static parseRegion(query: string): OceanRegion | null {
    const q = query.toLowerCase();
    if (q.includes('arabian')) return OCEAN_REGIONS.find((r) => r.id === 'arabian-sea') || null;
    if (q.includes('bengal') || q.includes('bob')) return OCEAN_REGIONS.find((r) => r.id === 'bay-of-bengal') || null;
    if (q.includes('equator') || q.includes('wyrtki')) return OCEAN_REGIONS.find((r) => r.id === 'equatorial-indian-ocean') || null;
    if (q.includes('lakshadweep') || q.includes('maldives')) return OCEAN_REGIONS.find((r) => r.id === 'lakshadweep-sea') || null;
    if (q.includes('somali') || q.includes('upwelling') || q.includes('horn')) return OCEAN_REGIONS.find((r) => r.id === 'somali-current') || null;
    if (q.includes('india') || q.includes('overview') || q.includes('indian ocean')) return OCEAN_REGIONS.find((r) => r.id === 'global-overview') || null;
    return null;
  }

  static parseDepth(query: string): DepthLevel | null {
    const q = query.toLowerCase();
    if (q.includes('surface') || q.includes('0m') || q.includes('0 meter')) return 0;
    if (q.includes('50m') || q.includes('50 meter') || q.includes('50 m')) return 50;
    if (q.includes('100m') || q.includes('100 meter') || q.includes('100 m')) return 100;
    if (q.includes('250m') || q.includes('250 meter') || q.includes('250 m')) return 250;
    if (q.includes('500m') || q.includes('500 meter') || q.includes('500 m')) return 500;
    if (q.includes('1000m') || q.includes('1000 meter') || q.includes('1000 m') || q.includes('1km')) return 1000;
    if (q.includes('2000m') || q.includes('2000 meter') || q.includes('2000 m') || q.includes('2km')) return 2000;
    if (q.includes('4000m') || q.includes('4000 meter') || q.includes('abyss')) return 4000;
    return null;
  }

  static parseVariable(query: string): OceanVariable | null {
    const q = query.toLowerCase();
    if (q.includes('temp') || q.includes('warm') || q.includes('heat') || q.includes('thermal')) return 'temperature';
    if (q.includes('salin') || q.includes('salt') || q.includes('psu') || q.includes('freshwater')) return 'salinity';
    if (q.includes('current') || q.includes('flow') || q.includes('velocity') || q.includes('speed')) return 'currents';
    if (q.includes('chloro') || q.includes('bloom') || q.includes('phytoplankton')) return 'chlorophyll';
    if (q.includes('oxygen') || q.includes('do') || q.includes('omz') || q.includes('hypox')) return 'oxygen';
    return null;
  }
}
