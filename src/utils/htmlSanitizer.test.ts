import { describe, it, expect } from 'vitest';
import { isSafeUrl } from './htmlSanitizer';

describe('isSafeUrl', () => {
  it('should allow valid http/https URLs', () => {
    expect(isSafeUrl('http://example.com')).toBe(true);
    expect(isSafeUrl('https://example.com')).toBe(true);
  });
  
  it('should allow mailto and tel protocols', () => {
    expect(isSafeUrl('mailto:test@example.com')).toBe(true);
    expect(isSafeUrl('tel:+123456789')).toBe(true);
  });

  it('should allow relative URLs and anchors', () => {
    expect(isSafeUrl('/view')).toBe(true);
    expect(isSafeUrl('#section')).toBe(true);
  });

  it('should block javascript: URLs', () => {
    expect(isSafeUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeUrl('javascript:void(0)')).toBe(false);
  });

  it('should block javascript: URLs disguised with case, padding or control chars', () => {
    expect(isSafeUrl('JaVaScRiPt:alert(1)')).toBe(false);
    expect(isSafeUrl(' javascript:alert(1)')).toBe(false);
    expect(isSafeUrl('java\tscript:alert(1)')).toBe(false);
    expect(isSafeUrl('java\nscript:alert(1)')).toBe(false);
  });

  it('should block other script-capable or local protocols', () => {
    expect(isSafeUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isSafeUrl('vbscript:msgbox(1)')).toBe(false);
    expect(isSafeUrl('file:///etc/passwd')).toBe(false);
  });

  it('should block protocol-relative URLs that navigate off-site', () => {
    // '//evil.com' and '/\\evil.com' both resolve to https://evil.com in a browser,
    // so they must not pass as same-origin relative paths.
    expect(isSafeUrl('//evil.com')).toBe(false);
    expect(isSafeUrl('//evil.com/path')).toBe(false);
    expect(isSafeUrl('/\\evil.com')).toBe(false);
    // Genuine same-origin paths still pass.
    expect(isSafeUrl('/view')).toBe(true);
    expect(isSafeUrl('/edit?id=1')).toBe(true);
  });

  it('should block strings that are not parseable URLs', () => {
    expect(isSafeUrl('example.com')).toBe(false);
    expect(isSafeUrl('not a url')).toBe(false);
  });

  it('should return false for empty or undefined', () => {
    expect(isSafeUrl('')).toBe(false);
    expect(isSafeUrl(undefined)).toBe(false);
  });
});
