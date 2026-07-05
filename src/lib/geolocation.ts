export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Captura la ubicación GPS actual del navegador. Best-effort: nunca lanza
 * error, retorna null si el permiso fue denegado, el dispositivo no soporta
 * geolocalización, o hay timeout — el flujo que la invoca no debe bloquearse.
 */
export function captureCurrentLocation(timeoutMs = 8000): Promise<Coordinates | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 },
    );
  });
}

/**
 * Reverse-geocoding best-effort vía OpenStreetMap Nominatim (sin API key).
 * Retorna una etiqueta legible (ej. "Maipú, Región Metropolitana") o null
 * si falla — el consumidor debe tener un fallback (coordenadas / link a mapa).
 */
export async function reverseGeocode(coords: Coordinates): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.latitude}&lon=${coords.longitude}&zoom=14&addressdetails=1`;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;

    const data = await response.json();
    const address = data?.address ?? {};
    const locality = address.suburb || address.city_district || address.city || address.town || address.village;
    const region = address.state || address.county;

    if (locality && region && locality !== region) return `${locality}, ${region}`;
    return locality || region || data?.display_name || null;
  } catch {
    return null;
  }
}

export function mapsUrl(coords: Coordinates): string {
  return `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`;
}
