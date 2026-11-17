import { Document, Packer, Table, TableRow, TableCell, Paragraph, TextRun, WidthType, AlignmentType, BorderStyle, HeadingLevel } from "docx";
// @ts-ignore - file-saver has no types
import { saveAs } from "file-saver";
import type { SchemeRow } from "@/data/curriculum/types";
import { columnHeaders, kiswahiliSubjects } from "@/data/curriculum";

export async function exportSchemeToDocx(
  rows: SchemeRow[],
  grade: string,
  subject: string,
  strand: string
) {
  const isSw = kiswahiliSubjects.includes(subject);
  const headers = isSw ? columnHeaders.sw : columnHeaders.en;

  const borderStyle = {
    style: BorderStyle.SINGLE,
    size: 1,
    color: "999999",
  };
  const cellBorders = {
    top: borderStyle,
    bottom: borderStyle,
    left: borderStyle,
    right: borderStyle,
  };

  // Column widths in percentage (total = 100)
  const colWidths = [4, 4, 9, 10, 18, 18, 12, 11, 9, 5];

  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map(
      (h, i) =>
        new TableCell({
          width: { size: colWidths[i], type: WidthType.PERCENTAGE },
          borders: cellBorders,
          shading: { fill: "1a5276" },
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: h, bold: true, color: "FFFFFF", size: 18, font: "Calibri" }),
              ],
            }),
          ],
        })
    ),
  });

  const dataRows = rows.map(
    (row, idx) =>
      new TableRow({
        children: [
          row.week,
          row.lesson,
          row.strand,
          row.subStrand,
          row.specificLearningOutcome,
          row.learningExperiences,
          row.keyInquiryQuestion,
          row.learningResources,
          row.assessmentMethods,
          row.reflection,
        ].map(
          (val, i) =>
            new TableCell({
              width: { size: colWidths[i], type: WidthType.PERCENTAGE },
              borders: cellBorders,
              shading: idx % 2 === 0 ? { fill: "FFFFFF" } : { fill: "F2F4F4" },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: String(val ?? ""),
                      size: 18,
                      font: "Calibri",
                    }),
                  ],
                }),
              ],
            })
        ),
      })
  );

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { orientation: "landscape" as const },
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: isSw ? "Mpango wa Kazi" : "Scheme of Work",
                bold: true,
                size: 28,
                font: "Calibri",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: `${grade} — ${subject} — ${strand}`,
                size: 22,
                font: "Calibri",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [
              new TextRun({
                text: isSw ? "Mtaala wa CBC - KICD Kenya" : "CBC Curriculum — KICD Kenya",
                size: 18,
                font: "Calibri",
                color: "666666",
              }),
            ],
          }),
          table,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const filename = `${grade}-${subject}-${strand}.docx`.replace(/\s+/g, "_");
  saveAs(blob, filename);
}
