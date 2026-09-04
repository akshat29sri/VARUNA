import * as THREE from 'three';

/**
 * Converts geographic latitude and longitude (in degrees) to 3D Cartesian coordinates (Vector3).
 * Latitude: [-90, 90], Longitude: [-180, 180]
 * Uses spherical coordinate system where Y is Up (North pole), Z is Prime Meridian at Equator.
 */
export function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);

  return new THREE.Vector3(x, y, z);
}

/**
 * Converts 3D Cartesian coordinates back to latitude and longitude.
 */
export function vector3ToLatLon(point: THREE.Vector3, radius: number): { lat: number; lon: number } {
  const normalized = point.clone().normalize();
  const phi = Math.acos(Math.max(-1, Math.min(1, normalized.y)));
  const theta = Math.atan2(normalized.z, -normalized.x);

  const lat = 90 - (phi * 180 / Math.PI);
  let lon = (theta * 180 / Math.PI) - 180;
  
  // Normalize lon to [-180, 180]
  if (lon < -180) lon += 360;
  if (lon > 180) lon -= 360;

  return { lat, lon };
}

/**
 * Haversine formula to compute great-circle distance between two points in kilometers.
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Format lat/lon to human-readable scientific coordinate string (e.g. "15.4° N, 68.2° E")
 */
export function isWaterBodyNearIndia(lat: number, lon: number): boolean {
  const arabianSea = lat >= 5 && lat <= 25.5 && lon >= 55 && lon <= 77.5;
  const lakshadweepSea = lat >= 4 && lat <= 14 && lon >= 68 && lon <= 76.5;
  const bayOfBengal = lat >= 5 && lat <= 23 && lon >= 78 && lon <= 97.5;
  const andamanSea = lat >= 6 && lat <= 16 && lon >= 90 && lon <= 98;
  const southernApproach = lat >= -2 && lat <= 8 && lon >= 68 && lon <= 90;
  const sriLankaWaters = lat >= 5 && lat <= 10 && lon >= 77 && lon <= 83;

  return arabianSea || lakshadweepSea || bayOfBengal || andamanSea || southernApproach || sriLankaWaters;
}

export function formatCoordinates(lat: number, lon: number): string {
  const latStr = `${Math.abs(lat).toFixed(1)}° ${lat >= 0 ? 'N' : 'S'}`;
  const lonStr = `${Math.abs(lon).toFixed(1)}° ${lon >= 0 ? 'E' : 'W'}`;
  return `${latStr}, ${lonStr}`;
}
