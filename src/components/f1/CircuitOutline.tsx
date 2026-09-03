import circuitData from '@/data/circuits.json';

interface CircuitRecord {
  id: string;
  name: string;
  location: string;
  lengthM: number;
  width: number;
  height: number;
  start: [number, number];
  d: string;
}

const circuits = circuitData.circuits as unknown as Record<string, CircuitRecord>;

export function getCircuitRecord(geoId: string | undefined): CircuitRecord | undefined {
  return geoId ? circuits[geoId] : undefined;
}

interface CircuitOutlineProps {
  geoId: string | undefined;
  className?: string;
  /** Padding around the outline in SVG units. */
  pad?: number;
}

/**
 * Simplified track outline drawn from the bundled GeoJSON-derived path data.
 * The accent dot marks the start/finish line.
 */
export function CircuitOutline({ geoId, className, pad = 6 }: CircuitOutlineProps) {
  const circuit = getCircuitRecord(geoId);
  if (!circuit) return null;
  const { width, height, d, start, name } = circuit;
  return (
    <svg
      className={['circuit', className].filter(Boolean).join(' ')}
      viewBox={`${-pad} ${-pad} ${width + pad * 2} ${height + pad * 2}`}
      role="img"
      aria-label={`${name} circuit outline`}
      focusable="false"
    >
      <path className="circuit__path" d={d} />
      <rect className="circuit__start" x={start[0] - 2.4} y={start[1] - 2.4} width={4.8} height={4.8} rx={0.6} />
    </svg>
  );
}
