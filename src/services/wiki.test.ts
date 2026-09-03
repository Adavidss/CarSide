import { describe, expect, it } from 'vitest';
import { dayIndex, fileTitleFromUploadUrl, wikiTitleFromUrl } from './wiki';

describe('wiki helpers', () => {
  it('extracts article titles from Wikipedia URLs', () => {
    expect(wikiTitleFromUrl('https://en.wikipedia.org/wiki/Monza_Circuit')).toBe('Monza_Circuit');
    expect(wikiTitleFromUrl('http://en.wikipedia.org/wiki/George_Russell_(racing_driver)')).toBe('George_Russell_(racing_driver)');
    expect(wikiTitleFromUrl('https://en.wikipedia.org/wiki/Circuit_de_Spa-Francorchamps#History')).toBe('Circuit_de_Spa-Francorchamps');
    expect(wikiTitleFromUrl(undefined)).toBeNull();
  });

  it('turns an upload URL into a Commons file title', () => {
    expect(fileTitleFromUploadUrl('https://upload.wikimedia.org/wikipedia/commons/9/90/Some_File%2C_x.jpg?utm_source=x')).toBe('File:Some_File,_x.jpg');
    expect(fileTitleFromUploadUrl(null)).toBeNull();
  });

  it('gives a stable day index', () => {
    expect(dayIndex(new Date('2026-09-02T23:00:00Z'))).toBe(dayIndex(new Date('2026-09-02T01:00:00Z')));
    expect(dayIndex(new Date('2026-09-03T01:00:00Z'))).toBe(dayIndex(new Date('2026-09-02T01:00:00Z')) + 1);
  });
});
