import { describe, expect, it } from 'vitest';

import { safeRedirect } from './safe-redirect';

describe('safeRedirect', () => {
  it('keeps same-site paths', () => {
    expect(safeRedirect('/requests?tab=mine')).toBe('/requests?tab=mine');
  });
  it('falls back for empty, absolute and protocol-relative URLs', () => {
    expect(safeRedirect(undefined)).toBe('/');
    expect(safeRedirect('https://evil.example')).toBe('/');
    expect(safeRedirect('//evil.example')).toBe('/');
    expect(safeRedirect('/\\evil.example')).toBe('/');
  });
});
