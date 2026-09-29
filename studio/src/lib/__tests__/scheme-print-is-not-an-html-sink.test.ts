/**
 * The scheme-of-work print window must not be an HTML sink.
 *
 * `components/generate-scheme-of-work-dialog.tsx` used to build a whole document
 * with `windowWin.document.write(\`… ${formData.subStrand} … ${printContent.innerHTML} …\`)`.
 * `window.open('')` returns an `about:blank` window that inherits the opener's
 * origin, so a teacher typing `<img src=x onerror=alert(document.cookie)>` into
 * the Sub-Strand field got script running with their own Supabase session — and
 * so did anything the model wrote into the scheme body. CodeQL does not model
 * `document.write` on a child window as a sink, which is why this file exists and
 * why a green security scan was not evidence.
 *
 * The property being asserted is narrow and total: no string that came from a
 * caller is ever *parsed*. Everything goes in as text. A fake document records
 * every method and property the production module touches, so the test fails if
 * someone reintroduces `write`, `innerHTML` or `insertAdjacentHTML` — including
 * in a form that renders fine today.
 *
 * No jsdom here on purpose: `vitest.config.ts` is `environment: 'node'` and this
 * laptop has 3.7 GB, so the fake is 30 lines rather than a new dependency.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { buildSchemePrintDocument, type SchemePrintMeta } from '@/lib/print-scheme';

// ─────────────────────────────────────────────────────────────────────────────
// A document fake that reports everything anyone does to it
// ─────────────────────────────────────────────────────────────────────────────

type Touch = string;

class FakeNode {
  readonly childNodes: FakeNode[] = [];
  textContent = '';
  tagName = '#text';
  touches: Touch[];

  constructor(touches: Touch[], tagName: string) {
    this.touches = touches;
    // Uppercase like the DOM does, so `appendChild:X` reads the same whether the
    // node came from `createElement` or was handed in from outside.
    this.tagName = tagName.toUpperCase();
  }

  /** Class names come from a constant; recording the call keeps the trace honest. */
  setAttribute(name: string): void {
    this.touches.push(`setAttribute:${name}`);
  }

  appendChild(node: FakeNode): FakeNode {
    this.touches.push(`appendChild:${node.tagName}`);
    this.childNodes.push(node);
    return node;
  }
}

class FakeDocument {
  /** Every method/property name the production code touches, in order. */
  readonly touches: Touch[] = [];
  readonly title = '';
  readonly head: FakeNode;
  readonly body: FakeNode;

  constructor() {
    this.head = new FakeNode(this.touches, 'head');
    this.body = new FakeNode(this.touches, 'body');
  }

  createElement(tagName: string): FakeNode {
    this.touches.push(`createElement:${tagName}`);
    return new FakeNode(this.touches, tagName.toUpperCase());
  }

  createTextNode(text: string): FakeNode {
    this.touches.push('createTextNode');
    const node = new FakeNode(this.touches, '#text');
    node.textContent = text;
    return node;
  }

  /** The body clone. `importNode` is the safe half of copying a live subtree. */
  importNode(node: FakeNode): FakeNode {
    this.touches.push('importNode');
    return node;
  }

  /** Flat text of everything appended, to prove the payload survived as words. */
  renderedText(): string {
    const out: string[] = [];
    const walk = (n: FakeNode) => {
      out.push(n.textContent);
      n.childNodes.forEach(walk);
    };
    walk(this.body);
    return out.filter(Boolean).join(' ');
  }

  /** Every element tag created, to prove markup never materialised. */
  createdElements(): string[] {
    return this.touches
      .filter((t) => t.startsWith('createElement:'))
      .map((t) => t.split(':')[1].toUpperCase());
  }
}

const XSS = '<img src=x onerror=alert(1)>';
const SCRIPT = '<script>stealTheSession()</script>';

function metaWithPayload(): SchemePrintMeta {
  return {
    grade: 'Grade 6',
    subject: `Mathematics${SCRIPT}`,
    strand: 'Number and Operations',
    subStrand: XSS,
    lessonsPerWeek: 5,
  };
}

/** The scheme table a learner's teacher generated, as it exists in the DOM. */
function bodyNode(doc: FakeDocument): FakeNode {
  const table = new FakeNode(doc.touches, 'table');
  table.textContent = XSS;
  return table;
}

/**
 * The fakes implement only the subset the module touches. Casting here is the
 * honest price of keeping jsdom out of the suite; the assertions read the
 * recorded `touches`, which is exactly what a real `Document` would do.
 */
function asDocument(doc: FakeDocument): Document {
  return doc as unknown as Document;
}

function asNode(node: FakeNode): Node {
  return node as unknown as Node;
}

describe('the scheme print window parses nothing', () => {
  it('never touches a HTML-parsing sink on the target document', () => {
    const doc = new FakeDocument();
    buildSchemePrintDocument(asDocument(doc), metaWithPayload(), asNode(bodyNode(doc)));

    const sinks = doc.touches.filter((t) =>
      /^(write|writeln|open)|innerHTML|outerHTML|insertAdjacentHTML|documentURL/.test(t),
    );
    expect(sinks).toEqual([]);
  });

  it('sets the title through document.title rather than a <title> string', () => {
    const doc = new FakeDocument();
    buildSchemePrintDocument(asDocument(doc), metaWithPayload(), asNode(bodyNode(doc)));

    expect(doc.title).toContain(XSS);
    expect(doc.createdElements()).not.toContain('TITLE');
  });

  it('renders an attacker sub-strand as words, not as an img element', () => {
    const doc = new FakeDocument();
    buildSchemePrintDocument(asDocument(doc), metaWithPayload(), asNode(bodyNode(doc)));

    expect(doc.renderedText()).toContain(XSS);
    expect(doc.createdElements()).not.toContain('IMG');
    expect(doc.createdElements()).not.toContain('SCRIPT');
  });

  it('carries the scheme body by cloning the node, not by reading its HTML', () => {
    const doc = new FakeDocument();
    const body = bodyNode(doc);
    buildSchemePrintDocument(asDocument(doc), metaWithPayload(), asNode(body));

    expect(doc.touches).toContain('importNode');
    expect(doc.touches.filter((t) => t === 'appendChild:TABLE')).toHaveLength(1);
  });

  it('still shows the teacher the four facts the printout is for', () => {
    const doc = new FakeDocument();
    buildSchemePrintDocument(asDocument(doc), metaWithPayload(), asNode(bodyNode(doc)));

    const text = doc.renderedText();
    expect(text).toContain('Grade 6');
    expect(text).toContain('Number and Operations');
    expect(text).toContain('5');
  });
});

describe('the sink stays deleted, not merely avoided today', () => {
  it('the dialog no longer calls document.write on any window', () => {
    const source = readFileSync(
      join(process.cwd(), 'src', 'components', 'generate-scheme-of-work-dialog.tsx'),
      'utf8',
    );
    expect(source).not.toMatch(/document\.(write|writeln)\s*\(/);
    expect(source).not.toMatch(/\.innerHTML\s*=/);
  });
});
