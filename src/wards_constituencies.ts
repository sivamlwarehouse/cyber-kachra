import { Ward, Constituency } from './types';

export const wards: Ward[] = [
  {
    id: 1,
    ward_number: 93,
    name: "Banjara Hills",
    zone: "Khairatabad",
    center: [17.415, 78.435],
    bounds: { minLat: 17.40, maxLat: 17.43, minLng: 78.41, maxLng: 78.45 }
  },
  {
    id: 2,
    ward_number: 94,
    name: "Jubilee Hills",
    zone: "Khairatabad",
    center: [17.430, 78.410],
    bounds: { minLat: 17.41, maxLat: 17.45, minLng: 78.38, maxLng: 78.43 }
  },
  {
    id: 3,
    ward_number: 91,
    name: "Somajiguda",
    zone: "Khairatabad",
    center: [17.422, 78.455],
    bounds: { minLat: 17.41, maxLat: 17.44, minLng: 78.44, maxLng: 78.47 }
  },
  {
    id: 4,
    ward_number: 149,
    name: "Begumpet",
    zone: "Secunderabad",
    center: [17.444, 78.472],
    bounds: { minLat: 17.43, maxLat: 17.46, minLng: 78.45, maxLng: 78.49 }
  },
  {
    id: 5,
    ward_number: 33,
    name: "Charminar",
    zone: "Charminar",
    center: [17.362, 78.474],
    bounds: { minLat: 17.34, maxLat: 17.38, minLng: 78.45, maxLng: 78.49 }
  },
  {
    id: 6,
    ward_number: 105,
    name: "Gachibowli",
    zone: "Serilingampally",
    center: [17.440, 78.348],
    bounds: { minLat: 17.41, maxLat: 17.46, minLng: 78.31, maxLng: 78.36 }
  },
  {
    id: 7,
    ward_number: 106,
    name: "Madhapur",
    zone: "Serilingampally",
    center: [17.448, 78.374],
    bounds: { minLat: 17.43, maxLat: 17.47, minLng: 78.35, maxLng: 78.39 }
  },
  {
    id: 8,
    ward_number: 72,
    name: "Mehdipatnam",
    zone: "Karwan",
    center: [17.391, 78.442],
    bounds: { minLat: 17.37, maxLat: 17.41, minLng: 78.42, maxLng: 78.46 }
  },
  {
    id: 9,
    ward_number: 119,
    name: "Kukatpally",
    zone: "Kukatpally",
    center: [17.485, 78.405],
    bounds: { minLat: 17.46, maxLat: 17.51, minLng: 78.38, maxLng: 78.43 }
  },
  {
    id: 10,
    ward_number: 108,
    name: "Miyapur",
    zone: "Serilingampally",
    center: [17.495, 78.360],
    bounds: { minLat: 17.47, maxLat: 17.52, minLng: 78.33, maxLng: 78.38 }
  }
];

export const constituencies: Constituency[] = [
  {
    id: 1,
    name: "Jubilee Hills",
    mla_name: "Maganti Gopinath",
    party: "BRS",
    center: [17.430, 78.410],
    bounds: { minLat: 17.41, maxLat: 17.45, minLng: 78.38, maxLng: 78.43 }
  },
  {
    id: 2,
    name: "Khairatabad",
    mla_name: "Danam Nagender",
    party: "INC",
    center: [17.410, 78.450],
    bounds: { minLat: 17.39, maxLat: 17.43, minLng: 78.43, maxLng: 78.47 }
  },
  {
    id: 3,
    name: "Amberpet",
    mla_name: "Kaleru Venkatesh",
    party: "BRS",
    center: [17.390, 78.520],
    bounds: { minLat: 17.37, maxLat: 17.41, minLng: 78.50, maxLng: 78.54 }
  },
  {
    id: 4,
    name: "Musheerabad",
    mla_name: "Muta Gopal",
    party: "BRS",
    center: [17.420, 78.490],
    bounds: { minLat: 17.40, maxLat: 17.44, minLng: 78.47, maxLng: 78.51 }
  },
  {
    id: 5,
    name: "Charminar",
    mla_name: "Mir Zulfeqar Ali",
    party: "AIMIM",
    center: [17.360, 78.470],
    bounds: { minLat: 17.34, maxLat: 17.38, minLng: 78.45, maxLng: 78.49 }
  },
  {
    id: 6,
    name: "Yakutpura",
    mla_name: "Jaffar Hussain",
    party: "AIMIM",
    center: [17.350, 78.490],
    bounds: { minLat: 17.33, maxLat: 17.37, minLng: 78.47, maxLng: 78.51 }
  },
  {
    id: 7,
    name: "Secunderabad",
    mla_name: "T. Padma Rao Goud",
    party: "BRS",
    center: [17.440, 78.500],
    bounds: { minLat: 17.42, maxLat: 17.46, minLng: 78.48, maxLng: 78.52 }
  },
  {
    id: 8,
    name: "Kukatpally",
    mla_name: "Madhavaram Krishna Rao",
    party: "BRS",
    center: [17.480, 78.400],
    bounds: { minLat: 17.46, maxLat: 17.50, minLng: 78.38, maxLng: 78.42 }
  },
  {
    id: 9,
    name: "Sherilingampally",
    mla_name: "Arekapudi Gandhi",
    party: "BRS",
    center: [17.450, 78.350],
    bounds: { minLat: 17.42, maxLat: 17.48, minLng: 78.31, maxLng: 78.37 }
  },
  {
    id: 10,
    name: "Nampally",
    mla_name: "Majid Hussain",
    party: "AIMIM",
    center: [17.390, 78.450],
    bounds: { minLat: 17.37, maxLat: 17.41, minLng: 78.43, maxLng: 78.47 }
  }
];

// Distance calculation in meters using Haversine Formula
export function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Find closest ward based on coordinate
export function getWardForCoord(lat: number, lng: number): Ward {
  // First, see if it is in any bounding box
  const matches = wards.filter(w => 
    lat >= w.bounds.minLat && lat <= w.bounds.maxLat && 
    lng >= w.bounds.minLng && lng <= w.bounds.maxLng
  );
  if (matches.length > 0) {
    // If multiple matches, return the closest one
    let closest = matches[0];
    let minDist = getDistanceMeters(lat, lng, closest.center[0], closest.center[1]);
    for (let i = 1; i < matches.length; i++) {
      const dist = getDistanceMeters(lat, lng, matches[i].center[0], matches[i].center[1]);
      if (dist < minDist) {
        minDist = dist;
        closest = matches[i];
      }
    }
    return closest;
  }

  // Fallback to absolute closest center
  let closest = wards[0];
  let minDist = getDistanceMeters(lat, lng, closest.center[0], closest.center[1]);
  for (let i = 1; i < wards.length; i++) {
    const dist = getDistanceMeters(lat, lng, wards[i].center[0], wards[i].center[1]);
    if (dist < minDist) {
      minDist = dist;
      closest = wards[i];
    }
  }
  return closest;
}

// Find closest constituency based on coordinate
export function getConstituencyForCoord(lat: number, lng: number): Constituency {
  const matches = constituencies.filter(c => 
    lat >= c.bounds.minLat && lat <= c.bounds.maxLat && 
    lng >= c.bounds.minLng && lng <= c.bounds.maxLng
  );
  if (matches.length > 0) {
    let closest = matches[0];
    let minDist = getDistanceMeters(lat, lng, closest.center[0], closest.center[1]);
    for (let i = 1; i < matches.length; i++) {
      const dist = getDistanceMeters(lat, lng, matches[i].center[0], matches[i].center[1]);
      if (dist < minDist) {
        minDist = dist;
        closest = matches[i];
      }
    }
    return closest;
  }

  let closest = constituencies[0];
  let minDist = getDistanceMeters(lat, lng, closest.center[0], closest.center[1]);
  for (let i = 1; i < constituencies.length; i++) {
    const dist = getDistanceMeters(lat, lng, constituencies[i].center[0], constituencies[i].center[1]);
    if (dist < minDist) {
      minDist = dist;
      closest = constituencies[i];
    }
  }
  return closest;
}
