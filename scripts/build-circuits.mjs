#!/usr/bin/env node
/**
 * Builds src/data/circuits.json — simplified SVG outlines for every F1 circuit.
 *
 * Source: https://github.com/bacinger/f1-circuits (MIT License, © Tomislav Bacinger).
 * The GeoJSON LineStrings are projected (equirectangular, latitude-corrected so the
 * shapes are not stretched), simplified with Douglas–Peucker, normalised into a
 * 100-unit box and written out as compact SVG path data.
 *
 * Usage: npm run circuits            (fetches the latest GeoJSON)
 *        node scripts/build-circuits.mjs path/to/f1-circuits.geojson
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE_URL = 'https://raw.githubusercontent.com/bacinger/f1-circuits/master/f1-circuits.geojson';
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/circuits.json');
const BOX = 100; // longest side of every outline, in SVG units
const TOLERANCE = 0.35; // Douglas–Peucker tolerance in SVG units

async function loadGeoJson() {
  const localPath = process.argv[2];
  if (localPath) return JSON.parse(await readFile(localPath, 'utf8'));
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`Failed to fetch ${SOURCE_URL}: ${res.status}`);
  return res.json();
}

function project(coords) {
  const meanLat = coords.reduce((s, [, lat]) => s + lat, 0) / coords.length;
  const k = Math.cos((meanLat * Math.PI) / 180);
  return coords.map(([lon, lat]) => [lon * k, -lat]);
}

function simplify(points, tolerance) {
  if (points.length < 3) return points;
  const sqTol = tolerance * tolerance;
  const sqSegDist = (p, a, b) => {
    let [x, y] = a;
    let dx = b[0] - x;
    let dy = b[1] - y;
    if (dx !== 0 || dy !== 0) {
      const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
      if (t > 1) {
        x = b[0];
        y = b[1];
      } else if (t > 0) {
        x += dx * t;
        y += dy * t;
      }
    }
    dx = p[0] - x;
    dy = p[1] - y;
    return dx * dx + dy * dy;
  };
  const keep = new Array(points.length).fill(false);
  keep[0] = keep[points.length - 1] = true;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    let maxDist = 0;
    let index = -1;
    for (let i = first + 1; i < last; i++) {
      const d = sqSegDist(points[i], points[first], points[last]);
      if (d > maxDist) {
        maxDist = d;
        index = i;
      }
    }
    if (maxDist > sqTol && index !== -1) {
      keep[index] = true;
      stack.push([first, index], [index, last]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

function normalise(points) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const spanX = Math.max(...xs) - minX;
  const spanY = Math.max(...ys) - minY;
  const scale = BOX / Math.max(spanX, spanY);
  const width = Math.round(spanX * scale * 10) / 10;
  const height = Math.round(spanY * scale * 10) / 10;
  const scaled = points.map(([x, y]) => [(x - minX) * scale, (y - minY) * scale]);
  return { scaled, width, height };
}

function toPath(points) {
  const fmt = (n) => (Math.round(n * 10) / 10).toString();
  let d = `M${fmt(points[0][0])} ${fmt(points[0][1])}`;
  for (let i = 1; i < points.length; i++) d += `L${fmt(points[i][0])} ${fmt(points[i][1])}`;
  return d + 'Z';
}

const geo = await loadGeoJson();
const circuits = {};
for (const feature of geo.features) {
  if (feature.geometry.type !== 'LineString') continue;
  const p = feature.properties;
  const { scaled, width, height } = normalise(project(feature.geometry.coordinates));
  const simplified = simplify(scaled, TOLERANCE);
  circuits[p.id] = {
    id: p.id,
    name: p.Name,
    location: p.Location,
    lengthM: p.length,
    opened: p.opened,
    firstGp: p.firstgp,
    width,
    height,
    start: [Math.round(scaled[0][0] * 10) / 10, Math.round(scaled[0][1] * 10) / 10],
    d: toPath(simplified),
  };
}

const output = {
  attribution: 'Circuit outlines derived from bacinger/f1-circuits (MIT License, © Tomislav Bacinger).',
  source: SOURCE_URL,
  generatedAt: new Date().toISOString().slice(0, 10),
  circuits,
};

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify(output, null, 1) + '\n');
console.log(`Wrote ${Object.keys(circuits).length} circuits to ${OUT}`);
