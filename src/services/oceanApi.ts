import { DepthLevel, ObservationPoint, OceanVariable, VerticalProfilePoint } from '../types/ocean';

export interface OceanGrid {
  variable: OceanVariable;
  requestedDepth: DepthLevel;
  actualDepth: number;
  date: string;
  unit: string;
  source: string;
  latitudes: number[];
  longitudes: number[];
  values: (number | null)[][];
  u?: (number | null)[][];
  v?: (number | null)[][];
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Ocean API request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export function fetchOceanGrid(variable: OceanVariable, depth: DepthLevel, date: string): Promise<OceanGrid> {
  const params = new URLSearchParams({ variable, depth: String(depth), date });
  return getJson<OceanGrid>(`/api/model/grid?${params.toString()}`);
}

export function fetchOceanProfile(
  lat: number,
  lon: number,
  date: string,
  variable: OceanVariable,
): Promise<{ variable: OceanVariable; unit: string; source: string; profile: { depth: number; value: number }[] }> {
  const params = new URLSearchParams({ lat: String(lat), lon: String(lon), date, variable });
  return getJson(`/api/model/profile?${params.toString()}`);
}

export function fetchObservations(date: string): Promise<{ source: string; observations: ObservationPoint[] }> {
  const params = new URLSearchParams({ date });
  return getJson(`/api/observations?${params.toString()}`);
}

export function nearestGridValue(grid: OceanGrid | null, lat: number, lon: number): number | null {
  if (!grid || grid.latitudes.length === 0 || grid.longitudes.length === 0) return null;

  const latIndex = nearestIndex(grid.latitudes, lat);
  const lonIndex = nearestIndex(grid.longitudes, lon);
  const value = grid.values[latIndex]?.[lonIndex];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function nearestCurrentVector(
  grid: OceanGrid | null,
  lat: number,
  lon: number,
): { u: number; v: number } | null {
  if (!grid?.u || !grid.v) return null;
  const latIndex = nearestIndex(grid.latitudes, lat);
  const lonIndex = nearestIndex(grid.longitudes, lon);
  const u = grid.u[latIndex]?.[lonIndex];
  const v = grid.v[latIndex]?.[lonIndex];
  if (typeof u !== 'number' || typeof v !== 'number' || !Number.isFinite(u) || !Number.isFinite(v)) return null;
  return { u, v };
}

function nearestIndex(values: number[], target: number): number {
  let low = 0;
  let high = values.length - 1;
  const ascending = values[0] <= values[high];

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (values[mid] === target) return mid;
    if (ascending ? values[mid] < target : values[mid] > target) low = mid + 1;
    else high = mid - 1;
  }

  if (low <= 0) return 0;
  if (low >= values.length) return values.length - 1;
  return Math.abs(values[low] - target) < Math.abs(values[low - 1] - target) ? low : low - 1;
}

export function buildProfileFromObservation(
  profile: VerticalProfilePoint[],
  variable: OceanVariable,
): { depth: number; value: number }[] {
  return profile
    .map((point) => ({
      depth: point.depth,
      value: variable === 'temperature' ? point.temperature : variable === 'salinity' ? point.salinity : point.dissolvedOxygen,
    }))
    .filter((point) => Number.isFinite(point.value));
}
