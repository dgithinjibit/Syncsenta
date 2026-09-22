/**
 * @fileOverview Types and schemas for the generateLessonPlan flow.
 */
import {z} from 'genkit';

export const GenerateLessonPlanInputSchema = z.object({
  subject: z.string().describe('The subject of the lesson plan.'),
  topic: z.string().describe('The specific topic of the lesson plan.'),
  gradeLevel: z.string().describe('The grade level for the lesson plan.'),
  learningObjectives: z
    .string()
    .describe('The learning objectives for the lesson plan.'),
  strand: z.string().optional().describe('The main curriculum strand.'),
  subStrand: z.string().optional().describe('The curriculum sub-strand.'),
  teacherName: z.string().optional().describe("The teacher's name."),
  school: z.string().optional().describe('The name of the school.'),
  term: z.string().optional().describe('The school term.'),
  year: z.string().optional().describe('The academic year.'),
  roll: z
    .string()
    .optional()
    .describe('The number of students (e.g., "Boys: 20, Girls: 20").'),
  schemeOfWorkContext: z
    .string()
    .optional()
    .describe('The full Markdown content of the relevant Scheme of Work for context.'),
  omegaClawCurriculumContext: z
    .string()
    .optional()
    .describe('Teacher-approved Grade 6 or Senior School Omega Claw curriculum context when the topic is AI or blockchain.'),
});
export type GenerateLessonPlanInput = z.infer<typeof GenerateLessonPlanInputSchema>;

export const GenerateLessonPlanOutputSchema = z.object({
  lessonPlan: z.string().describe('The generated lesson plan in a document format.'),
});
export type GenerateLessonPlanOutput = z.infer<typeof GenerateLessonPlanOutputSchema>;
