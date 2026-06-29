/** Greater Hyderabad Municipal Corporation map bounds (SW → NE) */
export const HYDERABAD_BOUNDS = {
  south: 17.28,
  north: 17.58,
  west: 78.20,
  east: 78.62,
} as const;

export const HYDERABAD_CENTER: [number, number] = [17.385, 78.4867];

export const HYDERABAD_LEAFLET_BOUNDS: [[number, number], [number, number]] = [
  [HYDERABAD_BOUNDS.south, HYDERABAD_BOUNDS.west],
  [HYDERABAD_BOUNDS.north, HYDERABAD_BOUNDS.east],
];

export function clampToHyderabad(lat: number, lng: number): { lat: number; lng: number } {
  return {
    lat: Math.max(HYDERABAD_BOUNDS.south, Math.min(HYDERABAD_BOUNDS.north, lat)),
    lng: Math.max(HYDERABAD_BOUNDS.west, Math.min(HYDERABAD_BOUNDS.east, lng)),
  };
}

export function isWithinHyderabad(lat: number, lng: number): boolean {
  return (
    lat >= HYDERABAD_BOUNDS.south &&
    lat <= HYDERABAD_BOUNDS.north &&
    lng >= HYDERABAD_BOUNDS.west &&
    lng <= HYDERABAD_BOUNDS.east
  );
}
