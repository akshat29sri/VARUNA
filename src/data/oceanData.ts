import { DepthLevel, OceanRegion, OceanVariable, VariableConfig } from '../types/ocean';

export const DEPTH_LEVELS: DepthLevel[] = [0, 50, 100, 250, 500, 1000, 2000, 4000];

export const DEPTH_METADATA: Record<DepthLevel, { label: string; zone: string; lightLevel: string; avgTemp: number }> = {
  0: { label: 'Surface (0m)', zone: 'Epipelagic (Sunlit Zone)', lightLevel: '100% Sunlight', avgTemp: 28.5 },
  50: { label: '50 m', zone: 'Mixed Layer Base', lightLevel: '25% Sunlight', avgTemp: 27.2 },
  100: { label: '100 m', zone: 'Upper Thermocline', lightLevel: '1% Sunlight (Euphotic Base)', avgTemp: 24.1 },
  250: { label: '250 m', zone: 'Permanent Thermocline', lightLevel: 'Mesopelagic (Twilight)', avgTemp: 18.3 },
  500: { label: '500 m', zone: 'Intermediate Water', lightLevel: 'Complete Darkness (Aphotic)', avgTemp: 11.2 },
  1000: { label: '1000 m', zone: 'Bathypelagic', lightLevel: 'Bathypelagic (Midnight)', avgTemp: 6.4 },
  2000: { label: '2000 m', zone: 'Deep Ocean Basin', lightLevel: 'Abyssopelagic', avgTemp: 2.8 },
  4000: { label: '4000 m', zone: 'Abyssal Plain', lightLevel: 'Hadopelagic Zone', avgTemp: 1.4 },
};

export const VARIABLES: Record<OceanVariable, VariableConfig> = {
  temperature: {
    id: 'temperature',
    name: 'Potential Temperature',
    unit: '°C',
    min: 1.0,
    max: 31.0,
    colormap: 'turbo',
    description: 'Sea-water potential temperature from the Copernicus global physical reanalysis.',
    depthDecay: 0.85,
  },
  salinity: {
    id: 'salinity',
    name: 'Practical Salinity',
    unit: 'PSU',
    min: 31.5,
    max: 37.2,
    colormap: 'haline',
    description: 'Sea-water salinity from the Copernicus global physical reanalysis.',
    depthDecay: 0.15,
  },
  currents: {
    id: 'currents',
    name: 'Sea Water Current Speed',
    unit: 'm/s',
    min: 0.0,
    max: 2.2,
    colormap: 'velocity',
    description: 'Current speed calculated from eastward and northward sea-water velocity components.',
    depthDecay: 0.9,
  },
  chlorophyll: {
    id: 'chlorophyll',
    name: 'Chlorophyll-a Concentration',
    unit: 'mg/m³',
    min: 0.01,
    max: 4.5,
    colormap: 'chlorophyll',
    description: 'Mass concentration of chlorophyll-a from the Copernicus global biogeochemistry analysis and forecast.',
    depthDecay: 0.95,
  },
  oxygen: {
    id: 'oxygen',
    name: 'Dissolved Oxygen',
    unit: 'ml/L',
    min: 0.2,
    max: 5.8,
    colormap: 'oxygen',
    description: 'Dissolved molecular oxygen from the Copernicus global biogeochemistry analysis and forecast, converted to ml/L.',
    depthDecay: 0.4,
  },
};

export const OCEAN_REGIONS: OceanRegion[] = [
  {
    id: 'arabian-sea', name: 'Arabian Sea', lat: 16.5, lon: 64.0, zoomDistance: 2.4,
    description: 'Arabian Sea sector of the northern Indian Ocean.', avgTempSurface: 0, avgSalinitySurface: 0, thermoclineDepth: 0,
  },
  {
    id: 'bay-of-bengal', name: 'Bay of Bengal', lat: 15.0, lon: 88.0, zoomDistance: 2.4,
    description: 'Bay of Bengal sector of the northern Indian Ocean.', avgTempSurface: 0, avgSalinitySurface: 0, thermoclineDepth: 0,
  },
  {
    id: 'equatorial-indian-ocean', name: 'Equatorial Indian Ocean', lat: 1.5, lon: 78.0, zoomDistance: 2.8,
    description: 'Equatorial Indian Ocean sector.', avgTempSurface: 0, avgSalinitySurface: 0, thermoclineDepth: 0,
  },
  {
    id: 'lakshadweep-sea', name: 'Lakshadweep Sea', lat: 10.5, lon: 72.5, zoomDistance: 2.0,
    description: 'Lakshadweep Sea sector.', avgTempSurface: 0, avgSalinitySurface: 0, thermoclineDepth: 0,
  },
  {
    id: 'somali-current', name: 'Somali Current & Upwelling', lat: 8.5, lon: 53.0, zoomDistance: 2.2,
    description: 'Somali coast sector of the western Indian Ocean.', avgTempSurface: 0, avgSalinitySurface: 0, thermoclineDepth: 0,
  },
  {
    id: 'global-overview', name: 'Indian Ocean Basin (Overview)', lat: 8.0, lon: 76.0, zoomDistance: 3.5,
    description: 'Synoptic view across the northern Indian Ocean basin.', avgTempSurface: 0, avgSalinitySurface: 0, thermoclineDepth: 0,
  },
];

export const TIMELINE_DATES = Array.from({ length: 30 }, (_, i) => {
  const day = i + 1;
  const isoDate = `2026-01-${String(day).padStart(2, '0')}`;
  return {
    index: i,
    isoDate,
    dateString: `January ${String(day).padStart(2, '0')}, 2026`,
    shortLabel: `Jan ${day}`,
    dayOfMonth: day,
    monsoonPhase: day < 12 ? 'Early Winter Monsoon' : day < 22 ? 'Peak Winter Surge' : 'Late Monsoon Transition',
  };
});

export function getTimelineDate(index: number): string {
  return TIMELINE_DATES[index]?.isoDate ?? TIMELINE_DATES[0].isoDate;
}

export function getVariableConfig(variable: OceanVariable): VariableConfig {
  return VARIABLES[variable];
}

// Intentionally removed: the previous implementation generated synthetic ocean values.
// Real values now come from the backend data service in src/services/oceanApi.ts.
export function calculateOceanField(): number {
  return Number.NaN;
}
