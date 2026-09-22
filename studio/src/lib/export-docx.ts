/**
 * DOCX Export Utility
 * Exports CBC scheme of work to Microsoft Word format
 */

import {
  Document,
  Packer,
  Table,
  TableRow,
  TableCell,
  Paragraph,
  TextRun,
  WidthType,
  AlignmentType,
  BorderStyle,
  HeadingLevel,
} from 'docx';
import { saveAs } from 'file-saver';

// SchemeRow type matching backend
export interface SchemeRow {
  week: number;
  lesson: number;
  strand: string;
  subStrand: string;
  specificLearningOutcome: string;
  learningExperiences: string;
  keyInquiryQuestion: string;
  learningResources: string;
  assessmentMethods: string;
  reflection: string;
}

// Column headers
const COLUMN_HEADERS_EN = [
  'Week',
  'Lesson',
  'Strand',
  'Sub-Strand',
  'Specific Learning Outcome',
  'Learning Experiences',
  'Key Inquiry Question',
  'Learning Resources',
  'Assessment Methods',
  'Reflection',
];

const COLUMN_HEADERS_SW = [
  'Wiki',
  'Somo',
  'Mada',
  'Mada Ndogo',
  'Matokeo Maalum',
  'Shughuli za Ujifunzaji',
  'Swali Dadisi',
  'Vifaa vya Kujifunzia',
  'Tathmini',
  'Tafakari',
];

// Kiswahili subjects (for language detection)
const KISWAHILI_SUBJECTS = [
  'Kiswahili',
  'Kusoma na Kuandika',
  'Kusikiliza na Kuzungumza',
  'Sarufi',
  'Insha',
];

/**
 * Export scheme of work to DOCX format
 */
export async function exportSchemeToDocx(
  rows: SchemeRow[],
  grade: string,
  subject: string,
  term: string,
  teacherName?: string,
  schoolName?: string
): Promise<void> {
  // Determine language
  const isKiswahili = KISWAHILI_SUBJECTS.some((sw) =>
    subject.toLowerCase().includes(sw.toLowerCase())
  );
  const headers = isKiswahili ? COLUMN_HEADERS_SW : COLUMN_HEADERS_EN;

  // Border styling
  const borderStyle = {
    style: BorderStyle.SINGLE,
    size: 1,
    color: '999999',
  };
  const cellBorders = {
    top: borderStyle,
    bottom: borderStyle,
    left: borderStyle,
    right: borderStyle,
  };

  // Column widths in percentage (total = 100)
  const colWidths = [4, 4, 9, 10, 18, 18, 12, 11, 9, 5];

  // Create header row
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map(
      (h, i) =>
        new TableCell({
          width: { size: colWidths[i], type: WidthType.PERCENTAGE },
          borders: cellBorders,
          shading: { fill: '1a5276' },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: h,
                  bold: true,
                  color: 'FFFFFF',
                  size: 18,
                  font: 'Calibri',
                }),
              ],
            }),
          ],
        })
    ),
  });

  // Create data rows
  const dataRows = rows.map(
    (row, idx) =>
      new TableRow({
        children: [
          String(row.week),
          String(row.lesson),
          row.strand,
          row.subStrand,
          row.specificLearningOutcome,
          row.learningExperiences,
          row.keyInquiryQuestion,
          row.learningResources,
          row.assessmentMethods,
          row.reflection || '-',
        ].map(
          (val, i) =>
            new TableCell({
              width: { size: colWidths[i], type: WidthType.PERCENTAGE },
              borders: cellBorders,
              shading: idx % 2 === 0 ? { fill: 'FFFFFF' } : { fill: 'F2F4F4' },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: String(val ?? ''),
                      size: 18,
                      font: 'Calibri',
                    }),
                  ],
                }),
              ],
            })
        ),
      })
  );

  // Create table
  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  });

  // Build document sections
  const documentChildren: (Paragraph | Table)[] = [
    // Title
    new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.HEADING_1,
      children: [
        new TextRun({
          text: isKiswahili ? 'Mpango wa Kazi' : 'Scheme of Work',
          bold: true,
          size: 28,
          font: 'Calibri',
        }),
      ],
    }),
    // Subtitle
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: `${grade} — ${subject} — ${term}`,
          size: 22,
          font: 'Calibri',
        }),
      ],
    }),
  ];

  // Add teacher/school metadata if provided
  if (teacherName || schoolName) {
    const metadataLines: string[] = [];
    if (teacherName) metadataLines.push(`Teacher: ${teacherName}`);
    if (schoolName) metadataLines.push(`School: ${schoolName}`);

    documentChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [
          new TextRun({
            text: metadataLines.join(' • '),
            size: 18,
            font: 'Calibri',
            color: '666666',
          }),
        ],
      })
    );
  }

  // Add CBC footer
  documentChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: isKiswahili
            ? 'Mtaala wa CBC - KICD Kenya'
            : 'CBC Curriculum — KICD Kenya',
          size: 18,
          font: 'Calibri',
          color: '666666',
        }),
      ],
    })
  );

  // Add table
  documentChildren.push(table);

  // Create document
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { orientation: 'landscape' as const },
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
          },
        },
        children: documentChildren,
      },
    ],
  });

  // Generate and download
  const blob = await Packer.toBlob(doc);
  const filename = `${grade}-${subject}-${term}.docx`.replace(/\s+/g, '_');
  saveAs(blob, filename);
}
