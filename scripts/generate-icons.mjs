#!/usr/bin/env node
/**
 * Renders the PWA / touch icons from public/icons/icon.svg.
 * Uses macOS QuickLook (qlmanage) so there are no image dependencies — run on a Mac:
 *   npm run icons
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const iconsDir = join(root, 'public/icons');
const base = readFileSync(join(iconsDir, 'icon.svg'), 'utf8');
const ring = base.match(/<path[\s\S]*<\/svg>/)[0].replace('</svg>', '');

const variants = {
  'icon-192.png': { size: 192, svg: base },
  'icon-512.png': { size: 512, svg: base },
  // iOS applies its own corner mask, so the touch icon is a plain square tile.
  'apple-touch-icon.png': { size: 180, svg: base.replace('rx="6"', 'rx="0"') },
  // Maskable icons must keep their content inside the central 80%.
  'icon-maskable-512.png': {
    size: 512,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="512" height="512"><rect width="32" height="32" fill="#17181a"/><g transform="translate(16 16) scale(0.72) translate(-16 -16)">${ring}</g></svg>`,
  },
};

const tmp = mkdtempSync(join(tmpdir(), 'carside-icons-'));
try {
  for (const [name, { size, svg }] of Object.entries(variants)) {
    const svgPath = join(tmp, name.replace('.png', '.svg'));
    writeFileSync(svgPath, svg);
    execFileSync('qlmanage', ['-t', '-s', String(size), '-o', tmp, svgPath], { stdio: 'ignore' });
    copyFileSync(`${svgPath}.png`, join(iconsDir, name));
    console.log(`wrote ${name} (${size}px)`);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
