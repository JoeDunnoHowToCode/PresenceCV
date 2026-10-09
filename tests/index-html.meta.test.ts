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
});
