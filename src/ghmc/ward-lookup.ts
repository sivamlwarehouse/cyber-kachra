import { readFileSync } from 'fs';
import path from 'path';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';
import type { Feature, FeatureCollection, Polygon, MultiPolygon } from 'geojson';
import type { Ward } from '../types';
import wardsMeta from './wards-meta.json';
import { distanceMeters } from '../geo-utils';

type GeoFeature = Feature<Polygon | MultiPolygon>;

interface WardIndexEntry {
  meta: Ward;
  feature: GeoFeature;
}

interface ZoneIndexEntry {
  name: string;
  feature: GeoFeature;
}

let wardIndex: WardIndexEntry[] | null = null;
let zoneIndex: ZoneIndexEntry[] | null = null;
let ghmcBoundary: GeoFeature | null = null;

function shortenZoneName(raw: string): string {
  return raw
    .replace(/^Greater Hyderabad Municipal Corporation\s*/i, '')
    .replace(/\s*Zone$/i, '')
    .trim() + ' Zone';
}

function parseWardName(raw: string): { ward_number: number; name: string } {
  const match = raw.match(/^Ward\s+(\d+)\s+(.+)$/i);
  if (match) {
    return { ward_number: Number(match[1]), name: match[2].trim() };
  }
  const num = raw.match(/(\d+)/);
  return { ward_number: num ? Number(num[1]) : 0, name: raw };
}

function dataPath(file: string): string {
  return path.join(process.cwd(), 'data', file);
}

function loadGeoJson<T>(file: string): T {
  return JSON.parse(readFileSync(dataPath(file), 'utf8')) as T;
}

function ensureLoaded(): void {
  if (wardIndex) return;

  const wardsGeo = loadGeoJson<FeatureCollection<Polygon | MultiPolygon>>('ghmc-wards.geojson');
  const zonesGeo = loadGeoJson<FeatureCollection<Polygon | MultiPolygon>>('ghmc-zones.geojson');

  try {
    const areaGeo = loadGeoJson<FeatureCollection<Polygon | MultiPolygon>>('ghmc-area.geojson');
    ghmcBoundary = areaGeo.features[0] ?? null;
  } catch {
    ghmcBoundary = null;
  }

  wardIndex = wardsGeo.features.map((f) => {
    const parsed = parseWardName(String(f.properties?.name ?? 'Unknown'));
    const metaFromJson = wardsMeta.wards.find((w) => w.ward_number === parsed.ward_number);
    const meta: Ward = {
      id: parsed.ward_number,
      ward_number: parsed.ward_number,
      name: parsed.name,
      zone: metaFromJson?.zone ?? 'Unknown Zone',
      center: (metaFromJson?.center ?? [17.385, 78.4867]) as [number, number],
      bounds: metaFromJson?.bounds ?? { minLat: 0, maxLat: 0, minLng: 0, maxLng: 0 },
    };
    return { meta, feature: f };
  });

  zoneIndex = zonesGeo.features.map((f) => ({
    name: shortenZoneName(String(f.properties?.name ?? 'Unknown')),
    feature: f,
  }));
}

export function getGhmcWards(): Ward[] {
  return wardsMeta.wards as Ward[];
}

export function getGhmcZones(): string[] {
  return wardsMeta.zones;
}

export function isWithinGhmcBoundary(lat: number, lng: number): boolean {
  ensureLoaded();
  if (!ghmcBoundary) return true;
  return booleanPointInPolygon(point([lng, lat]), ghmcBoundary);
}

export function getZoneForCoord(lat: number, lng: number): string {
  ensureLoaded();
  const pt = point([lng, lat]);
  for (const z of zoneIndex!) {
    if (booleanPointInPolygon(pt, z.feature)) {
      return z.name;
    }
  }
  return 'Unknown Zone';
}

export interface LocationResolution {
  ward: Ward;
  zone: string;
  constituency_id: number | null;
}

export function resolveLocation(lat: number, lng: number): LocationResolution | null {
  ensureLoaded();

  const pt = point([lng, lat]);
  const zone = getZoneForCoord(lat, lng);

  const inBounds = wardIndex!.filter(
    (w) =>
      lat >= w.meta.bounds.minLat &&
      lat <= w.meta.bounds.maxLat &&
      lng >= w.meta.bounds.minLng &&
      lng <= w.meta.bounds.maxLng,
  );

  const candidates = inBounds.length > 0 ? inBounds : wardIndex!;

  for (const entry of candidates) {
    if (booleanPointInPolygon(pt, entry.feature)) {
      const ward: Ward = { ...entry.meta, zone };
      return { ward, zone, constituency_id: null };
    }
  }

  // Fallback: nearest ward center (edge of GHMC or boundary gaps in OSM data)
  let closest = wardIndex![0];
  let minDist = distanceMeters(lat, lng, closest.meta.center[0], closest.meta.center[1]);

  for (let i = 1; i < wardIndex!.length; i++) {
    const d = distanceMeters(lat, lng, wardIndex![i].meta.center[0], wardIndex![i].meta.center[1]);
    if (d < minDist) {
      minDist = d;
      closest = wardIndex![i];
    }
  }

  const ward: Ward = { ...closest.meta, zone };
  return { ward, zone, constituency_id: null };
}

export function getWardForCoord(lat: number, lng: number): Ward {
  const result = resolveLocation(lat, lng);
  if (!result) {
    throw new Error(`No GHMC ward found for coordinates ${lat}, ${lng}`);
  }
  return result.ward;
}
