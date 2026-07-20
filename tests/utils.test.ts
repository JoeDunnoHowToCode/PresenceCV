import { describe, it, expect } from 'vitest';
import { formatUrl } from '../src/lib/utils';

describe('formatUrl protocol whitelist', () => {
  it('allows https URLs', () => {
    expect(formatUrl('https://example.com')).toBe('https://example.com');
  });

  it('allows http URLs', () => {
    expect(formatUrl('http://example.com')).toBe('http://example.com');
  });

  it('allows mailto links', () => {
    expect(formatUrl('mailto:test@example.com')).toBe('mailto:test@example.com');
  });

  it('allows tel links', () => {
    expect(formatUrl('tel:+1234567890')).toBe('tel:+1234567890');
  });

  it('blocks javascript: protocol', () => {
    expect(formatUrl('javascript:alert(1)')).toBe('');
  });

  it('blocks data: protocol', () => {
    expect(formatUrl('data:text/html,<script>alert(1)</script>')).toBe('');
  });

  it('blocks vbscript: protocol', () => {
    expect(formatUrl('vbscript:msgbox("xss")')).toBe('');
  });

  it('blocks file: protocol', () => {
    expect(formatUrl('file:///etc/passwd')).toBe('');
  });

  it('blocks custom protocols', () => {
    expect(formatUrl('custom:payload')).toBe('');
  });

  it('adds mailto: to bare email', () => {
    expect(formatUrl('test@example.com')).toBe('mailto:test@example.com');
  });

  it('adds https:// to bare domain', () => {
    expect(formatUrl('example.com')).toBe('https://example.com');
  });

  it('adds https:// to bare URL with path', () => {
    expect(formatUrl('example.com/path')).toBe('https://example.com/path');
  });

  it('returns empty string for empty input', () => {
    expect(formatUrl('')).toBe('');
    expect(formatUrl('   ')).toBe('');
  });

  it('trims whitespace', () => {
    expect(formatUrl('  https://example.com  ')).toBe('https://example.com');
  });
});