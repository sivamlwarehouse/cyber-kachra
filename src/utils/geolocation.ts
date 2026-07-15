import { snapToReportLocation, HYDERABAD_CENTER, isWithinHyderabad } from '../hyderabad-bounds';

export type GeoResult =
  | { ok: true; lat: number; lng: number; rawLat: number; rawLng: number; fromDevice: boolean; outOfBounds: boolean }
  | { ok: false; error: string; permissionDenied?: boolean };

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
  if (!navigator.geolocation) {
    return Promise.resolve({
      ok: false,
      error: 'Geolocation is not supported by this browser.',
    });
  }

  return new Promise<GeoResult>((resolve) => {
    let settled = false;

    // Hard fallback timeout: iOS Safari Incognito and some Android devices
    // silently swallow the GPS request without triggering success or error callbacks.
    // This timer ensures the app doesn't hang on an infinite loading spinner.
    const fallbackTimer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve({
          ok: false,
          error: 'GPS request timed out. If you are in Private/Incognito mode, location may be blocked.',
        });
      }
    }, 15000);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (settled) return;
        settled = true;
        clearTimeout(fallbackTimer);
        const { latitude, longitude } = pos.coords;
        const outOfBounds = !isWithinHyderabad(latitude, longitude);
        // Return BOTH raw coords and snapped coords
        const snapped = snapToReportLocation(latitude, longitude);
        resolve({
          ok: true,
          lat: snapped.lat,       // snapped (for report submission)
          lng: snapped.lng,
          rawLat: latitude,       // raw GPS (for map display)
          rawLng: longitude,
          fromDevice: true,
          outOfBounds,
        });
      },
      (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(fallbackTimer);
        const isPermissionDenied = err && typeof err === 'object' && 'code' in err && err.code === 1;
        resolve({
          ok: false,
          error: isPermissionDenied ? 'PERMISSION_DENIED' : 'Could not read GPS. Please try again.',
          permissionDenied: isPermissionDenied,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000, // Tell the browser to timeout after 10s (before our 15s hard fallback)
        maximumAge: 0,
      }
    );
  });
}
