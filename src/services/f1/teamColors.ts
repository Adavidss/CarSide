/** Conventional team colours used as thin bars in standings. Unknown teams fall back to grey. */
const TEAM_COLORS: Record<string, string> = {
  mercedes: '#27f4d2',
  ferrari: '#e8002d',
  mclaren: '#ff8000',
  red_bull: '#3671c6',
  aston_martin: '#229971',
  alpine: '#0093cc',
  williams: '#64c4ff',
  rb: '#6692ff',
  sauber: '#52e252',
  audi: '#e4002b',
  haas: '#b6babd',
  cadillac: '#c9a227',
  alfa: '#c92d4b',
  alphatauri: '#5e8faa',
  racing_point: '#f596c8',
  renault: '#fff500',
  toro_rosso: '#469bff',
  force_india: '#f596c8',
};

export function teamColor(constructorId: string): string | undefined {
  return TEAM_COLORS[constructorId];
}
