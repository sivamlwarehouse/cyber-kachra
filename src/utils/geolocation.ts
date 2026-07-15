import { snapToReportLocation, HYDERABAD_CENTER, isWithinHyderabad } from '../hyderabad-bounds';

export type GeoResult =
  | { ok: true; lat: number; lng: number; fromDevice: boolean; outOfBounds?: boolean }
  | { ok: false; error: string; lat: number; lng: number };

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
        const message = isPermissionDenied
          ? 'Location permission denied. Allow location access in browser settings.'
          : 'Could not read GPS. Enable location and try again.';
        resolve({
          ok: false,
          error: message,
          lat: fallback.lat,
          lng: fallback.lng,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,    // 10 seconds timeout is standard and avoids hanging
        maximumAge: 30000, // 30 seconds cache allowance avoids timeouts indoors
      }
    );
  });
}
