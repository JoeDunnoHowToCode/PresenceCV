import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Every route serves index.html, so these tags are what crawlers and chat apps see for any shared link.
const html = new DOMParser().parseFromString(readFileSync(resolve(__dirname, '../index.html'), 'utf8'), 'text/html');
const meta = (attribute: string) => html.querySelector(`meta[${attribute}]`)?.getAttribute('content') ?? null;

describe('index.html link-preview meta', () => {
  it('gives search results a short description', () => {
    const description = meta('name="description"');

    expect(description).toBeTruthy();
    expect(description!.length).toBeLessThanOrEqual(160);
  });

  it('gives link previews a title, description and absolute image, without pinning share links to the home page', () => {
    expect(meta('property="og:type"')).toBe('website');
    expect(meta('property="og:site_name"')).toBe('PresenceCV');
    expect(meta('property="og:title"')).toBe(html.title);
    expect(meta('property="og:description"')).toBe(meta('name="description"'));
    expect(meta('property="og:image"')).toMatch(/^https:\/\//);
    // A fixed og:url would make every shared resume link resolve to the home page.
    expect(meta('property="og:url"')).toBeNull();
  });

  it('asks X/Twitter for a summary card', () => {
    expect(meta('name="twitter:card"')).toBe('summary');
  });
});
