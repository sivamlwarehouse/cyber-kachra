import { snapToReportLocation, HYDERABAD_CENTER, isWithinHyderabad } from '../hyderabad-bounds';

export type GeoResult =
  | { ok: true; lat: number; lng: number; fromDevice: boolean; outOfBounds?: boolean }
  | { ok: false; error: string; lat: number; lng: number; permissionDenied?: boolean };

/** Check the current geolocation permission state without triggering a prompt. */
export async function checkGeolocationPermission(): Promise<PermissionState | 'unsupported'> {
  if (!navigator.geolocation) return 'unsupported';
  if (!navigator.permissions) return 'prompt'; // older browsers — assume prompt
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' });
    return status.state;
  } catch {
    return 'prompt';
  }
}

/** Request GPS — must be called from a user tap/click on mobile (iOS Safari). */
export function requestDeviceLocation(): Promise<GeoResult> {
  const fallback = snapToReportLocation(HYDERABAD_CENTER[0], HYDERABAD_CENTER[1]);

  if (!navigator.geolocation) {
    return Promise.resolve({
      ok: false,
      error: 'Geolocation is not supported by this browser.',
      lat: fallback.lat,
      lng: fallback.lng,
    });
  }

  return new Promise<GeoResult>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const outOfBounds = !isWithinHyderabad(latitude, longitude);
        const snapped = snapToReportLocation(latitude, longitude);
        resolve({
          ok: true,
          lat: snapped.lat,
          lng: snapped.lng,
          fromDevice: true,
          outOfBounds,
        });
      },
      (err) => {
        const isPermissionDenied = err && typeof err === 'object' && 'code' in err && err.code === 1;
        resolve({
          ok: false,
          error: isPermissionDenied ? 'PERMISSION_DENIED' : 'Could not read GPS. Please try again.',
          lat: fallback.lat,
          lng: fallback.lng,
          permissionDenied: isPermissionDenied,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  });
}
