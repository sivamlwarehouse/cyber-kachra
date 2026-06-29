export interface Ward {
  id: number;
  ward_number: number;
  name: string;
  zone: string;
  // Bounding box or approximate coordinates for centroid
  center: [number, number];
  bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
}

export interface Constituency {
  id: number;
  name: string;
  mla_name: string;
  party: string;
  center: [number, number];
  bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
}

export interface Dump {
  id: string;
  lat: number;
  lng: number;
  address_text: string;
  ward_id: number;
  constituency_id: number;
  status: 'active' | 'pending_verification' | 'resolved';
  confidence_score: number;
  created_at: string;
  resolved_at: string | null;
  photos: string[];
}

export interface CitizenReport {
  id: string;
  dump_id: string;
  image_url: string;
  device_hash: string;
  created_at: string;
}

export interface VerificationLog {
  id: string;
  dump_id: string;
  device_hash: string;
  vote_type: 'still_exists' | 'cleaned';
  created_at: string;
}

export interface LeaderboardEntry {
  id: number; // Ward ID or Constituency ID
  name: string;
  subLabel?: string; // Zone or Party
  active_dumps: number;
  resolved_dumps: number;
  percentage_cleaned: number;
}
