import type { ReactNode } from 'react';

interface FlagProps {
  /** ISO 3166-1 alpha-2 country code. */
  country: string;
  size?: 'sm' | 'lg';
  title?: string;
}

const W = 24;
const H = 16;

function hBands(colors: string[], weights?: number[]): ReactNode {
  const total = weights ? weights.reduce((a, b) => a + b, 0) : colors.length;
  let y = 0;
  return colors.map((c, i) => {
    const h = (H * (weights ? weights[i] : 1)) / total;
    const rect = <rect key={i} x={0} y={y} width={W} height={h + 0.01} fill={c} />;
    y += h;
    return rect;
  });
}

function vBands(colors: string[], weights?: number[]): ReactNode {
  const total = weights ? weights.reduce((a, b) => a + b, 0) : colors.length;
  let x = 0;
  return colors.map((c, i) => {
    const w = (W * (weights ? weights[i] : 1)) / total;
    const rect = <rect key={i} x={x} y={0} width={w + 0.01} height={H} fill={c} />;
    x += w;
    return rect;
  });
}

/** Serrated vertical divider (Qatar / Bahrain). */
function serrated(baseX: number, depth: number, teeth: number): string {
  const step = H / teeth;
  let d = `M0 0H${baseX}`;
  for (let i = 0; i < teeth; i++) {
    d += `L${baseX + depth} ${i * step + step / 2}L${baseX} ${(i + 1) * step}`;
  }
  return d + 'L0 16Z';
}

function star(cx: number, cy: number, r: number, fill: string, key?: string): ReactNode {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : r * 0.4;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(cx + radius * Math.cos(a)).toFixed(2)},${(cy + radius * Math.sin(a)).toFixed(2)}`);
  }
  return <polygon key={key} points={pts.join(' ')} fill={fill} />;
}

function unionJack(scale = 1, x = 0, y = 0): ReactNode {
  const w = W * scale;
  const h = H * scale;
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={w} height={h} fill="#012169" />
      <path d={`M0 0L${w} ${h}M${w} 0L0 ${h}`} stroke="#fff" strokeWidth={3 * scale} />
      <path d={`M0 0L${w} ${h}M${w} 0L0 ${h}`} stroke="#C8102E" strokeWidth={1 * scale} />
      <path d={`M${w / 2} 0V${h}M0 ${h / 2}H${w}`} stroke="#fff" strokeWidth={5 * scale} />
      <path d={`M${w / 2} 0V${h}M0 ${h / 2}H${w}`} stroke="#C8102E" strokeWidth={3 * scale} />
    </g>
  );
}

const FLAGS: Record<string, () => ReactNode> = {
  IT: () => vBands(['#009246', '#fff', '#CE2B37']),
  FR: () => vBands(['#0055A4', '#fff', '#EF4135']),
  BE: () => vBands(['#000', '#FDDA24', '#EF3340']),
  NL: () => hBands(['#AE1C28', '#fff', '#21468B']),
  AT: () => hBands(['#ED2939', '#fff', '#ED2939']),
  HU: () => hBands(['#CE2939', '#fff', '#477050']),
  MC: () => hBands(['#CE1126', '#fff']),
  ES: () => hBands(['#AA151B', '#F1BF00', '#AA151B'], [1, 2, 1]),
  DE: () => hBands(['#000', '#DD0000', '#FFCE00']),
  RU: () => hBands(['#fff', '#0039A6', '#D52B1E']),
  GB: () => unionJack(),
  US: () => (
    <>
      {hBands(Array.from({ length: 13 }, (_, i) => (i % 2 === 0 ? '#B22234' : '#fff')))}
      <rect width={W * 0.42} height={(H * 7) / 13} fill="#3C3B6E" />
      {[2, 5, 8].map((x) =>
        [1.5, 4, 6.5].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r={0.55} fill="#fff" />),
      )}
    </>
  ),
  CA: () => (
    <>
      {vBands(['#FF0000', '#fff', '#FF0000'], [1, 2, 1])}
      <path
        d="M12 3.2l0.9 1.7 1-0.4-0.3 1.9 1.4-1.1 0.2 1.1h1.3l-0.5 1.3 0.6 0.5-2.2 1.8 0.2 0.8-2.1-0.4v1.9h-1v-1.9l-2.1 0.4 0.2-0.8-2.2-1.8 0.6-0.5-0.5-1.3h1.3l0.2-1.1 1.4 1.1-0.3-1.9 1 0.4z"
        fill="#FF0000"
      />
    </>
  ),
  MX: () => (
    <>
      {vBands(['#006847', '#fff', '#CE1126'])}
      <circle cx={12} cy={8} r={2.2} fill="#8C6239" />
      <circle cx={12} cy={8} r={1.1} fill="#fff" opacity={0.5} />
    </>
  ),
  BR: () => (
    <>
      <rect width={W} height={H} fill="#009C3B" />
      <polygon points="12,1.5 22,8 12,14.5 2,8" fill="#FFDF00" />
      <circle cx={12} cy={8} r={4} fill="#002776" />
      <path d="M8.3 7.2Q12 6 15.6 8.6" stroke="#fff" strokeWidth={0.8} fill="none" />
    </>
  ),
  JP: () => (
    <>
      <rect width={W} height={H} fill="#fff" />
      <circle cx={12} cy={8} r={4.8} fill="#BC002D" />
    </>
  ),
  CN: () => (
    <>
      <rect width={W} height={H} fill="#DE2910" />
      {star(4.5, 5, 3, '#FFDE00')}
      {[
        [9.5, 2],
        [11, 4],
        [11, 6.5],
        [9.5, 8.5],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={0.65} fill="#FFDE00" />
      ))}
    </>
  ),
  AU: () => (
    <>
      <rect width={W} height={H} fill="#012169" />
      {unionJack(0.5)}
      {star(6, 12, 2, '#fff')}
      {[
        [18, 3],
        [21, 6.5],
        [16, 7.5],
        [18.5, 13],
        [20, 9.5],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={0.75} fill="#fff" />
      ))}
    </>
  ),
  SG: () => (
    <>
      {hBands(['#EF3340', '#fff'])}
      <circle cx={5} cy={4} r={2.6} fill="#fff" />
      <circle cx={6} cy={4} r={2.2} fill="#EF3340" />
      {[
        [7.5, 2.4],
        [9.2, 3.5],
        [8.6, 5.5],
        [6.4, 5.5],
        [5.8, 3.5],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={0.45} fill="#fff" />
      ))}
    </>
  ),
  MY: () => (
    <>
      {hBands(Array.from({ length: 14 }, (_, i) => (i % 2 === 0 ? '#CC0001' : '#fff')))}
      <rect width={W / 2} height={H / 2} fill="#010066" />
      <circle cx={4.5} cy={4} r={2.4} fill="#FFCC00" />
      <circle cx={5.4} cy={4} r={2.1} fill="#010066" />
      {star(8.6, 4, 1.6, '#FFCC00')}
    </>
  ),
  AZ: () => (
    <>
      {hBands(['#0092BC', '#E00034', '#00AE65'])}
      <circle cx={11.2} cy={8} r={2.4} fill="#fff" />
      <circle cx={11.9} cy={8} r={2} fill="#E00034" />
      {star(13.8, 8, 1.1, '#fff')}
    </>
  ),
  QA: () => (
    <>
      <rect width={W} height={H} fill="#8D1B3D" />
      <path d={serrated(6, 2.2, 9)} fill="#fff" />
    </>
  ),
  BH: () => (
    <>
      <rect width={W} height={H} fill="#CE1126" />
      <path d={serrated(6, 2.6, 5)} fill="#fff" />
    </>
  ),
  SA: () => (
    <>
      <rect width={W} height={H} fill="#006C35" />
      <path d="M6 6.5h12M7 8.5h10" stroke="#fff" strokeWidth={0.9} />
      <path d="M6 11h11" stroke="#fff" strokeWidth={1.3} />
    </>
  ),
  AE: () => (
    <>
      {hBands(['#00732F', '#fff', '#000'])}
      <rect width={W / 4} height={H} fill="#FF0000" />
    </>
  ),
  PT: () => (
    <>
      {vBands(['#006600', '#FF0000'], [2, 3])}
      <circle cx={9.6} cy={8} r={2.6} fill="#FFE900" />
      <circle cx={9.6} cy={8} r={1.4} fill="#FF0000" />
    </>
  ),
  TR: () => (
    <>
      <rect width={W} height={H} fill="#E30A17" />
      <circle cx={9} cy={8} r={4} fill="#fff" />
      <circle cx={10} cy={8} r={3.2} fill="#E30A17" />
      {star(14, 8, 1.7, '#fff')}
    </>
  ),
  ZA: () => (
    <>
      {hBands(['#DE3831', '#fff', '#007A4D', '#fff', '#002395'], [3, 1, 3, 1, 3])}
      <polygon points="0,0 9,8 0,16" fill="#FFB612" />
      <polygon points="0,2 7,8 0,14" fill="#000" />
    </>
  ),
  AR: () => (
    <>
      {hBands(['#74ACDF', '#fff', '#74ACDF'])}
      <circle cx={12} cy={8} r={1.8} fill="#F6B40E" />
    </>
  ),
  KR: () => (
    <>
      <rect width={W} height={H} fill="#fff" />
      <circle cx={12} cy={8} r={3.6} fill="#CD2E3A" />
      <path d="M8.4 8a3.6 3.6 0 0 0 7.2 0a1.8 1.8 0 0 0-3.6 0a1.8 1.8 0 0 1-3.6 0z" fill="#0047A0" />
    </>
  ),
  IN: () => (
    <>
      {hBands(['#FF9933', '#fff', '#138808'])}
      <circle cx={12} cy={8} r={1.9} fill="none" stroke="#000080" strokeWidth={0.6} />
    </>
  ),
};

export function Flag({ country, size = 'sm', title }: FlagProps) {
  const code = country.toUpperCase();
  const draw = FLAGS[code];
  return (
    <span className={`flag${size === 'lg' ? ' flag--lg' : ''}`} title={title ?? code} role="img" aria-label={title ?? code}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
        {draw ? (
          draw()
        ) : (
          <>
            <rect width={W} height={H} fill="#8a8985" />
            <text x={12} y={11} textAnchor="middle" fontSize={8} fontFamily="sans-serif" fill="#fff">
              {code}
            </text>
          </>
        )}
      </svg>
    </span>
  );
}
