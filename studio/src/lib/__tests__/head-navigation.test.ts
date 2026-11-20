import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const headLayoutPath = join(process.cwd(), 'src', 'app', 'head', 'layout.tsx');

describe('head workspace navigation', () => {
  it('mounts the role-aware sidebar and header around the head workspace', () => {
    expect(existsSync(headLayoutPath)).toBe(true);

    const source = readFileSync(headLayoutPath, 'utf8');
    expect(source).toContain('SidebarProvider');
    expect(source).toContain('SidebarInset');
    expect(source).toContain('AppSidebar');
    expect(source).toContain('AppHeader');
  });
});
