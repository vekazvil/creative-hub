import { describe, expect, it } from 'vitest';

import { isEmailAllowed, parseAllowedDomains } from './email-allowlist';

describe('parseAllowedDomains', () => {
  it('splits, trims, lowercases and drops a leading @', () => {
    expect(parseAllowedDomains(' Vilore.com, @bloomteq.com ,,')).toEqual([
      'vilore.com',
      'bloomteq.com',
    ]);
  });
  it('treats empty or missing as no restriction', () => {
    expect(parseAllowedDomains('')).toEqual([]);
    expect(parseAllowedDomains(undefined)).toEqual([]);
  });
});

describe('isEmailAllowed', () => {
  const domains = ['vilore.com', 'bloomteq.com'];
  it('allows listed domains, case-insensitively', () => {
    expect(isEmailAllowed('ana@vilore.com', domains)).toBe(true);
    expect(isEmailAllowed('Edis@BloomTeq.com', domains)).toBe(true);
  });
  it('rejects other domains and look-alikes', () => {
    expect(isEmailAllowed('x@gmail.com', domains)).toBe(false);
    expect(isEmailAllowed('x@evil-vilore.com', domains)).toBe(false);
    expect(isEmailAllowed('x@vilore.com.evil.io', domains)).toBe(false);
  });
  it('rejects malformed addresses', () => {
    expect(isEmailAllowed('vilore.com', domains)).toBe(false);
    expect(isEmailAllowed('@vilore.com', domains)).toBe(false);
  });
  it('allows anyone when the list is empty', () => {
    expect(isEmailAllowed('x@gmail.com', [])).toBe(true);
  });
});
