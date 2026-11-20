import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const STUDIO = process.cwd();

describe('Studio PWA wiring', () => {
  it('exposes the web manifest from page metadata', () => {
    const layout = readFileSync(join(STUDIO, 'src/app/layout.tsx'), 'utf8');
    expect(layout).toContain("manifest: '/manifest.json'");
  });

  it('mounts a PWA bootstrap that registers the service worker', () => {
    const providers = readFileSync(join(STUDIO, 'src/components/client-providers.tsx'), 'utf8');
    expect(providers).toContain('PWABootstrap');

    const bootstrap = readFileSync(join(STUDIO, 'src/components/pwa-bootstrap.tsx'), 'utf8');
    expect(bootstrap).toMatch(/navigator\.serviceWorker\.register\(["']\/sw\.js["']\)/);
  });

  it('keeps service-worker updates and offline state explicit', () => {
    const bootstrap = readFileSync(join(STUDIO, 'src/components/pwa-bootstrap.tsx'), 'utf8');
    expect(bootstrap).toMatch(/addEventListener\(["']updatefound["']/);
    expect(bootstrap).toMatch(/addEventListener\(["']offline["']/);
  });

  it('defines an installable manifest and offline fallback', () => {
    const manifest = JSON.parse(readFileSync(join(STUDIO, 'public/manifest.json'), 'utf8')) as {
      start_url?: string;
      display?: string;
    };
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');

    const serviceWorker = readFileSync(join(STUDIO, 'public/sw.js'), 'utf8');
    expect(serviceWorker).toContain("const OFFLINE_URL = '/offline'");
    expect(serviceWorker).toContain("cache.put(request, responseToCache)");
  });
});
