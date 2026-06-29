import { Constituency, Ward } from './types';
import wardsMeta from './ghmc/wards-meta.json';
import { distanceMeters } from './geo-utils';

/** All ~145 GHMC wards (metadata only — safe for browser bundle). */
export const wards = wardsMeta.wards as Ward[];

export const getDistanceMeters = distanceMeters;

export const constituencies: Constituency[] = [
  {
    id: 1,
    name: 'Jubilee Hills',
    mla_name: 'Maganti Gopinath',
    party: 'BRS',
    center: [17.430, 78.410],
    bounds: { minLat: 17.41, maxLat: 17.45, minLng: 78.38, maxLng: 78.43 },
  },
  {
    id: 2,
    name: 'Khairatabad',
    mla_name: 'Danam Nagender',
    party: 'INC',
    center: [17.410, 78.450],
    bounds: { minLat: 17.39, maxLat: 17.43, minLng: 78.43, maxLng: 78.47 },
  },
  {
    id: 3,
    name: 'Amberpet',
    mla_name: 'Kaleru Venkatesh',
    party: 'BRS',
    center: [17.390, 78.520],
    bounds: { minLat: 17.37, maxLat: 17.41, minLng: 78.50, maxLng: 78.54 },
  },
  {
    id: 4,
    name: 'Musheerabad',
    mla_name: 'Muta Gopal',
    party: 'BRS',
    center: [17.420, 78.490],
    bounds: { minLat: 17.40, maxLat: 17.44, minLng: 78.47, maxLng: 78.51 },
  },
  {
    id: 5,
    name: 'Charminar',
    mla_name: 'Mir Zulfeqar Ali',
    party: 'AIMIM',
    center: [17.360, 78.470],
    bounds: { minLat: 17.34, maxLat: 17.38, minLng: 78.45, maxLng: 78.49 },
  },
  {
    id: 6,
    name: 'Yakutpura',
    mla_name: 'Jaffar Hussain',
    party: 'AIMIM',
    center: [17.350, 78.490],
    bounds: { minLat: 17.33, maxLat: 17.37, minLng: 78.47, maxLng: 78.51 },
  },
  {
    id: 7,
    name: 'Secunderabad',
    mla_name: 'T. Padma Rao Goud',
    party: 'BRS',
    center: [17.440, 78.500],
    bounds: { minLat: 17.42, maxLat: 17.46, minLng: 78.48, maxLng: 78.52 },
  },
  {
    id: 8,
    name: 'Kukatpally',
    mla_name: 'Madhavaram Krishna Rao',
    party: 'BRS',
    center: [17.480, 78.400],
    bounds: { minLat: 17.46, maxLat: 17.50, minLng: 78.38, maxLng: 78.42 },
  },
  {
    id: 9,
    name: 'Sherilingampally',
    mla_name: 'Arekapudi Gandhi',
    party: 'BRS',
    center: [17.450, 78.350],
    bounds: { minLat: 17.42, maxLat: 17.48, minLng: 78.31, maxLng: 78.37 },
  },
  {
    id: 10,
    name: 'Nampally',
    mla_name: 'Majid Hussain',
    party: 'AIMIM',
    center: [17.390, 78.450],
    bounds: { minLat: 17.37, maxLat: 17.41, minLng: 78.43, maxLng: 78.47 },
  },
];

export function getConstituencyForCoord(lat: number, lng: number): Constituency {
  const matches = constituencies.filter(
    (c) =>
      lat >= c.bounds.minLat &&
      lat <= c.bounds.maxLat &&
      lng >= c.bounds.minLng &&
      lng <= c.bounds.maxLng,
  );
  if (matches.length > 0) {
    let closest = matches[0];
    let minDist = distanceMeters(lat, lng, closest.center[0], closest.center[1]);
    for (let i = 1; i < matches.length; i++) {
      const dist = distanceMeters(lat, lng, matches[i].center[0], matches[i].center[1]);
      if (dist < minDist) {
        minDist = dist;
        closest = matches[i];
      }
    }
    return closest;
  }

  let closest = constituencies[0];
  let minDist = distanceMeters(lat, lng, closest.center[0], closest.center[1]);
  for (let i = 1; i < constituencies.length; i++) {
    const dist = distanceMeters(lat, lng, constituencies[i].center[0], constituencies[i].center[1]);
    if (dist < minDist) {
      minDist = dist;
      closest = constituencies[i];
    }
  }
  return closest;
}
