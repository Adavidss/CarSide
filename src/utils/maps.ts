export function isApplePlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod|Macintosh/.test(ua);
}

export function googleDirectionsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
}

export function googleSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function appleMapsUrl(latitude: number, longitude: number, label?: string): string {
  const q = label ? `&q=${encodeURIComponent(label)}` : '';
  return `https://maps.apple.com/?daddr=${latitude},${longitude}${q}`;
}

/** Static OpenStreetMap tile link for a "view on map" affordance without a map SDK. */
export function openStreetMapUrl(latitude: number, longitude: number, zoom = 14): string {
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=${zoom}/${latitude}/${longitude}`;
}
