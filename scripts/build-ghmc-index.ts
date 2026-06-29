/**
 * Builds lightweight ward metadata from GHMC OpenStreetMap GeoJSON (DataMeet / ODbL).
 * Run: npm run ghmc:build
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import centroid from '@turf/centroid';
import bbox from '@turf/bbox';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';
import type { Feature, FeatureCollection, Polygon, MultiPolygon } from 'geojson';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dataDir = path.join(root, 'data');
const outDir = path.join(root, 'src', 'ghmc');

type WardFeature = Feature<Polygon | MultiPolygon>;

interface WardMeta {
  id: number;
  ward_number: number;
  name: string;
  zone: string;
  center: [number, number];
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number };
}

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

function boundsFromBbox(b: number[]) {
  return { minLng: b[0], minLat: b[1], maxLng: b[2], maxLat: b[3] };
}

function zoneForPoint(
  lat: number,
  lng: number,
  zones: FeatureCollection<Polygon | MultiPolygon>,
): string {
  const pt = point([lng, lat]);
  for (const f of zones.features) {
    if (booleanPointInPolygon(pt, f)) {
      return shortenZoneName(String(f.properties?.name ?? 'Unknown'));
    }
  }
  return 'Unknown Zone';
}

function main() {
  const wardsGeo = JSON.parse(
    readFileSync(path.join(dataDir, 'ghmc-wards.geojson'), 'utf8'),
  ) as FeatureCollection<Polygon | MultiPolygon>;
  const zonesGeo = JSON.parse(
    readFileSync(path.join(dataDir, 'ghmc-zones.geojson'), 'utf8'),
  ) as FeatureCollection<Polygon | MultiPolygon>;

  const wards: WardMeta[] = wardsGeo.features.map((f: WardFeature) => {
    const parsed = parseWardName(String(f.properties?.name ?? 'Unknown'));
    const c = centroid(f);
    const [lng, lat] = c.geometry.coordinates;
    const zone = zoneForPoint(lat, lng, zonesGeo);
    const b = bbox(f);
    return {
      id: parsed.ward_number,
      ward_number: parsed.ward_number,
      name: parsed.name,
      zone,
      center: [lat, lng] as [number, number],
      bounds: boundsFromBbox(b),
    };
  });

  wards.sort((a, b) => a.ward_number - b.ward_number);

  const zones = Array.from(new Set(wards.map((w) => w.zone))).sort();

  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    path.join(outDir, 'wards-meta.json'),
    JSON.stringify({ wards, zones, generated_at: new Date().toISOString() }, null, 2),
  );

  console.log(`Built ${wards.length} wards across ${zones.length} zones → src/ghmc/wards-meta.json`);
  zones.forEach((z) => console.log(`  • ${z}: ${wards.filter((w) => w.zone === z).length} wards`));
}

main();
