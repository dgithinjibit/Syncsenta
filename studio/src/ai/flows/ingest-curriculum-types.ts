/**
 * @fileOverview Types and schemas for the ingestCurriculum flow.
 */
import {z} from 'genkit';

const CurriculumStructureSchema = z.object({
    strand: z.string(),
    subStrand: z.string(),
    learningOutcomes: z.array(z.string()),
    learningExperiences: z.array(z.string()),
    keyInquiryQuestions: z.array(z.string()),
});

export const IngestCurriculumInputSchema = z.object({
  documentText: z.string().describe("The raw text copied from a curriculum PDF document."),
  majorLevel: z.string().describe("The major educational level, e.g., 'Early Years Education'."),
  subLevel: z.string().describe("The sub-level, e.g., 'Lower Primary'."),
  grade: z.string().describe("The grade level for the curriculum, e.g., 'Grade 3'."),
  subject: z.string().describe("The subject for the curriculum, e.g., 'English Language Activities'."),
});
export type IngestCurriculumInput = z.infer<typeof IngestCurriculumInputSchema>;

export const IngestCurriculumOutputSchema = z.object({
  parsedCurriculum: z.array(CurriculumStructureSchema).describe("An array of structured curriculum objects extracted from the document."),
});
export type IngestCurriculumOutput = z.infer<typeof IngestCurriculumOutputSchema>;
