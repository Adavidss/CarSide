export interface GeocodeResult {
  label: string;
  latitude: number;
  longitude: number;
  provider: 'nominatim' | 'open-meteo' | 'zippopotam';
}

export class GeocodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeocodeError';
  }
}
