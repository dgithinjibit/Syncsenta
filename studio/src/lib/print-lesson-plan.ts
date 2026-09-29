/**
 * Fills the lesson-plan print area with DOM calls only.
 *
 * Why: `components/scheme-wizard/lesson-plan-dialog.tsx` used to build this
 * document as one interpolated template string and assign it to
 * `printArea.innerHTML`. The values are model output and teacher input, and
 * because the area lives in the application's own document, any markup in them
 * executed with the app's session — the same class of defect as the scheme print
 * window, one notch worse.
 *
 * Rules held here: every caller-supplied value becomes `textContent` or a text
 * node; every style is a constant; and the area is replaced rather than appended
 * to, so printing twice yields one document.
 *
 * Typed against the real DOM for the same reason as `print-scheme.ts`; see the
 * header there for why the tests cast a fake instead of importing jsdom.
 */

export interface LessonPlanSectionContent {
  duration: string;
  activities: string[];
}

/** The lesson-plan shape the generator returns, narrowed to what prints. */
export interface LessonPlanContent {
  title: string;
  strand: string;
  subStrand: string;
  duration: string;
  keyInquiryQuestion: string;
  objectives: string[];
  introduction: LessonPlanSectionContent;
  development: LessonPlanSectionContent;
  conclusion: LessonPlanSectionContent;
  assessment: string[];
  differentiation: { advanced: string; struggling: string };
  resources: string[];
  teacherReflection: string;
}

const PAGE = 'font-family: serif; max-width: 800px; margin: 0 auto; padding: 20px;';
const CENTERED = 'text-align:center; font-size:18pt; margin-bottom:4px;';
const SUBTITLE = 'text-align:center; color:#666; font-size:10pt; margin-bottom:16px;';
const TABLE = 'width:100%; border-collapse:collapse; font-size:10pt; margin-bottom:16px;';
const CELL = 'border:1px solid #ccc; padding:6px;';
const CELL_LABEL = 'border:1px solid #ccc; padding:6px; font-weight:bold;';
const SECTION_HEADING = 'font-size:12pt; margin:12px 0 6px;';
const LIST = 'margin:0; padding-left:20px; font-size:10pt;';
const PARAGRAPH = 'font-size:10pt;';
const REFLECTION = 'font-size:10pt; border:1px dashed #ccc; padding:12px; min-height:60px;';

function element(
  doc: Document,
  tagName: string,
  style: string,
  text?: string,
): HTMLElement {
  const node = doc.createElement(tagName);
  node.setAttribute('style', style);
  if (text !== undefined) node.textContent = text;
  return node;
}

function labeledParagraph(
  doc: Document,
  label: string,
  value: string,
): HTMLElement {
  const paragraph = doc.createElement('p');
  paragraph.setAttribute('style', PARAGRAPH);
  const strong = doc.createElement('strong');
  strong.textContent = `${label}:`;
  paragraph.appendChild(strong);
  paragraph.appendChild(doc.createTextNode(` ${value}`));
  return paragraph;
}

function sectionHeading(doc: Document, text: string): HTMLElement {
  return element(doc, 'h3', SECTION_HEADING, text);
}

function unorderedList(doc: Document, items: string[]): HTMLElement {
  const list = element(doc, 'ul', LIST);
  for (const item of items) {
    list.appendChild(doc.createElement('li')).textContent = item;
  }
  return list;
}

function labeledRow(doc: Document, label: string, value: string): HTMLElement {
  const row = doc.createElement('tr');
  row.appendChild(element(doc, 'td', CELL_LABEL, label));
  row.appendChild(element(doc, 'td', CELL, value));
  return row;
}

/** Local append helper: `appendChild` returns the child, which we discard. */
function appendAll(parent: HTMLElement, ...children: Node[]): void {
  for (const child of children) parent.appendChild(child);
}

/**
 * Build the printable lesson plan and put it in `area`, replacing whatever the
 * previous print left behind.
 */
export function renderLessonPlanPrint(
  doc: Document,
  area: HTMLElement,
  plan: LessonPlanContent,
  meta: { grade: string; subject: string },
): void {
  const page = element(doc, 'div', PAGE);

  appendAll(
    page,
    element(doc, 'h1', CENTERED, plan.title),
    element(doc, 'p', SUBTITLE, `${meta.grade} — ${meta.subject} — ${plan.duration}`),
  );

  const facts = element(doc, 'table', TABLE);
  appendAll(
    facts,
    labeledRow(doc, 'Strand', plan.strand),
    labeledRow(doc, 'Sub-Strand', plan.subStrand),
    labeledRow(doc, 'Key Inquiry Question', plan.keyInquiryQuestion),
  );
  appendAll(page, facts);

  /** `<h3>` followed by its blocks, all inside the page. */
  const section = (heading: string, ...blocks: HTMLElement[]): void =>
    appendAll(page, sectionHeading(doc, heading), ...blocks);

  section('Learning Objectives', unorderedList(doc, plan.objectives));
  section(
    `Introduction (${plan.introduction.duration})`,
    unorderedList(doc, plan.introduction.activities),
  );
  section(
    `Lesson Development (${plan.development.duration})`,
    unorderedList(doc, plan.development.activities),
  );
  section(
    `Conclusion (${plan.conclusion.duration})`,
    unorderedList(doc, plan.conclusion.activities),
  );
  section('Assessment', unorderedList(doc, plan.assessment));
  section(
    'Differentiation',
    labeledParagraph(doc, 'Advanced learners', plan.differentiation.advanced),
    labeledParagraph(doc, 'Struggling learners', plan.differentiation.struggling),
  );
  section('Resources', unorderedList(doc, plan.resources));
  section(
    "Teacher's Reflection",
    element(doc, 'p', REFLECTION, plan.teacherReflection),
  );

  area.replaceChildren(page);
}
