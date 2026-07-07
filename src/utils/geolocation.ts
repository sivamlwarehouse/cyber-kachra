import { snapToReportLocation, HYDERABAD_CENTER } from '../hyderabad-bounds';

export type GeoResult =
  | { ok: true; lat: number; lng: number; fromDevice: boolean }
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

  const readPosition = (options: PositionOptions) =>
    new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });

  const tryRead = async (): Promise<GeoResult> => {
    try {
      const pos = await readPosition({
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      });
      const snapped = snapToReportLocation(pos.coords.latitude, pos.coords.longitude);
      return { ok: true, lat: snapped.lat, lng: snapped.lng, fromDevice: true };
    } catch {
      try {
        const pos = await readPosition({
          enableHighAccuracy: false,
          timeout: 20000,
          maximumAge: 120000,
        });
        const snapped = snapToReportLocation(pos.coords.latitude, pos.coords.longitude);
        return { ok: true, lat: snapped.lat, lng: snapped.lng, fromDevice: true };
      } catch (err) {
        const message = err instanceof GeolocationPositionError
          ? err.code === 1
            ? 'Location permission denied. Allow location access in browser settings.'
            : 'Could not read GPS. Enable location and try again.'
          : 'Could not read GPS.';
        return { ok: false, error: message, lat: fallback.lat, lng: fallback.lng };
      }
    }
  };

  return tryRead();
}
