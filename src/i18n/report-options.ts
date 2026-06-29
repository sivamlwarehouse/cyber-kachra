export type Severity = 'minor' | 'moderate' | 'severe' | 'critical';

export type ComplaintType =
  | 'door_collection_missed'
  | 'public_place'
  | 'empty_plot'
  | 'construction_waste'
  | 'street_not_swept';

export type WasteType =
  | 'household'
  | 'construction_debris'
  | 'mixed'
  | 'ewaste'
  | 'biomedical';

export const SEVERITY_OPTIONS: Severity[] = ['minor', 'moderate', 'severe', 'critical'];

export const COMPLAINT_TYPE_OPTIONS: ComplaintType[] = [
  'door_collection_missed',
  'public_place',
  'empty_plot',
  'construction_waste',
  'street_not_swept',
];

export const WASTE_TYPE_OPTIONS: WasteType[] = [
  'household',
  'construction_debris',
  'mixed',
  'ewaste',
  'biomedical',
];

export const SEVERITY_COLORS: Record<Severity, string> = {
  minor: 'bg-yellow-300',
  moderate: 'bg-orange-400',
  severe: 'bg-red-400',
  critical: 'bg-stone-600',
};

export const SEVERITY_BORDER: Record<Severity, string> = {
  minor: 'border-yellow-400',
  moderate: 'border-orange-500',
  severe: 'border-red-500',
  critical: 'border-stone-600',
};
