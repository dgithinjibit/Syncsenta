/**
 * The lesson-plan print area must not be an HTML sink either.
 *
 * `components/scheme-wizard/lesson-plan-dialog.tsx` used to do
 * `printArea.innerHTML = \`… ${plan.title} … ${plan.objectives.map(o => `<li>${o}</li>)} …\``.
 * Every interpolated value is model output or teacher input, and unlike the
 * scheme print window this one writes into the *application's own* document, so
 * a payload runs with the app's session, not a child window's copy of it.
 *
 * Same property as the scheme test: nothing a caller supplied is ever parsed.
 * Here the additional promise is that the area is *replaced*, not appended to,
 * so printing twice does not double the document.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  renderLessonPlanPrint,
  type LessonPlanContent,
} from '@/lib/print-lesson-plan';

// ─────────────────────────────────────────────────────────────────────────────
// Fakes: a document that reports every touch, and a container that reports
// whether it was replaced or appended to.
// ─────────────────────────────────────────────────────────────────────────────

type Touch = string;

class FakeNode {
  readonly childNodes: FakeNode[] = [];
  textContent = '';
  tagName: string;
  touches: Touch[];

  constructor(touches: Touch[], tagName: string) {
    this.touches = touches;
    this.tagName = tagName.toUpperCase();
  }

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
    return new FakeNode(this.touches, tagName);
  }

  createTextNode(text: string): FakeNode {
    this.touches.push('createTextNode');
    const node = new FakeNode(this.touches, '#text');
    node.textContent = text;
    return node;
  }

  importNode(node: FakeNode): FakeNode {
    this.touches.push('importNode');
    return node;
  }

  createdElements(): string[] {
    return createdElementsFrom(this.touches);
  }
}

class FakePrintArea {
  readonly touches: Touch[];
  children: FakeNode[] = [];

  constructor(touches: Touch[]) {
    this.touches = touches;
  }

  replaceChildren(...nodes: FakeNode[]): void {
    this.touches.push('replaceChildren');
    this.children = nodes;
  }

  /** Simulate the stale markup the old code left behind between prints. */
  seedStaleHtml(node: FakeNode): void {
    this.children = [node];
  }

  renderedText(): string {
    const out: string[] = [];
    const walk = (n: FakeNode) => {
      out.push(n.textContent);
      n.childNodes.forEach(walk);
    };
    this.children.forEach(walk);
    return out.filter(Boolean).join(' ');
  }

  /** Every element tag created anywhere in this document's trace. */
  createdElements(): string[] {
    return createdElementsFrom(this.touches);
  }
}

function createdElementsFrom(touches: Touch[]): string[] {
  return touches
    .filter((t) => t.startsWith('createElement:'))
    .map((t) => t.split(':')[1].toUpperCase());
}

const XSS = '<img src=x onerror=alert(1)>';
const SCRIPT = '<script>stealTheSession()</script>';

function planWithPayload(): LessonPlanContent {
  return {
    title: `Area Model Intro${XSS}`,
    strand: 'Number and Operations',
    subStrand: `Multiplication${SCRIPT}`,
    duration: '40 minutes',
    keyInquiryQuestion: 'How do arrays help us multiply?',
    objectives: [`Count arrays${XSS}`, 'Explain grouping'],
    introduction: { duration: '5 mins', activities: ['Warm-up chant'] },
    development: { duration: '20 mins', activities: ['Grid drawing'] },
    conclusion: { duration: '5 mins', activities: ['Exit ticket'] },
    assessment: ['Observation checklist'],
    differentiation: {
      advanced: 'Larger arrays with two digits',
      struggling: 'Use counters on the desk',
    },
    resources: ['Grid paper', 'Counters'],
    teacherReflection: `What worked${SCRIPT}`,
  };
}

/**
 * The fakes implement only the subset the module touches; casting once per call
 * keeps the production signature honest without adding jsdom to the suite.
 */
function asDocument(doc: FakeDocument): Document {
  return doc as unknown as Document;
}

function asElement(area: FakePrintArea): HTMLElement {
  return area as unknown as HTMLElement;
}

function renderOnce(): { doc: FakeDocument; area: FakePrintArea } {
  const doc = new FakeDocument();
  const area = new FakePrintArea(doc.touches);
  renderLessonPlanPrint(asDocument(doc), asElement(area), planWithPayload(), {
    grade: 'Grade 4',
    subject: 'Mathematics',
  });
  return { doc, area };
}

function renderTwice(): {
  doc: FakeDocument;
  area: FakePrintArea;
  text: string;
} {
  const doc = new FakeDocument();
  const area = new FakePrintArea(doc.touches);
  area.seedStaleHtml(new FakeNode(doc.touches, 'stale'));

  const plan = planWithPayload();
  renderLessonPlanPrint(asDocument(doc), asElement(area), plan, {
    grade: 'Grade 4',
    subject: 'Mathematics',
  });
  renderLessonPlanPrint(asDocument(doc), asElement(area), plan, {
    grade: 'Grade 4',
    subject: 'Mathematics',
  });

  return { doc, area, text: area.renderedText() };
}

describe('the lesson-plan print area parses nothing', () => {
  it('never touches a HTML-parsing sink on the document or the area', () => {
    const { doc } = renderTwice();

    const sinks = doc.touches.filter((t) =>
      /^(write|writeln|open)|innerHTML|outerHTML|insertAdjacentHTML/.test(t),
    );
    expect(sinks).toEqual([]);
  });

  it('replaces the area instead of appending, so printing twice is not doubled', () => {
    const { doc, area, text } = renderTwice();

    expect(doc.touches.filter((t) => t === 'replaceChildren')).toHaveLength(2);
    expect(text).not.toContain('stale');
    const objectiveCount = text.split('Count arrays').length - 1;
    expect(objectiveCount).toBe(1);
    expect(area.children).toHaveLength(1);
  });

  it('renders attacker-controlled plan fields as words', () => {
    const { doc, area } = renderOnce();
    const text = area.renderedText();

    expect(text).toContain(XSS);
    expect(text).toContain(SCRIPT);
    expect(doc.createdElements()).not.toContain('IMG');
    expect(doc.createdElements()).not.toContain('SCRIPT');
  });

  it('still prints every section a teacher marks up', () => {
    const { area } = renderOnce();
    const text = area.renderedText();

    for (const expected of [
      'Area Model Intro',
      'Grade 4',
      'Mathematics',
      'Number and Operations',
      '40 minutes',
      'How do arrays help us multiply?',
      'Explain grouping',
      'Warm-up chant',
      'Grid drawing',
      'Exit ticket',
      'Observation checklist',
      'Larger arrays with two digits',
      'Use counters on the desk',
      'Grid paper',
      'What worked',
    ]) {
      expect(text).toContain(expected);
    }
  });

  it('keeps the list shape: one LI per item, not one long string', () => {
    const { doc } = renderOnce();

    // objectives 2 + introduction 1 + development 1 + conclusion 1
    // + assessment 1 + resources 2
    expect(doc.touches.filter((t) => t === 'appendChild:LI')).toHaveLength(8);
  });
});

describe('the sink stays deleted, not merely avoided today', () => {
  it('the lesson-plan dialog no longer assigns innerHTML', () => {
    const source = readFileSync(
      join(process.cwd(), 'src', 'components', 'scheme-wizard', 'lesson-plan-dialog.tsx'),
      'utf8',
    );
    expect(source).not.toMatch(/\.innerHTML\s*=/);
    expect(source).not.toMatch(/document\.write\s*\(/);
  });
});
