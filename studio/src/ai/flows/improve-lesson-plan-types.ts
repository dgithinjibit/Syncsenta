/**
 * @fileOverview Types for the improve-lesson-plan flow.
 */
import {z} from 'genkit';

export const ImproveLessonPlanInputSchema = z.object({
  lessonPlan: z.string().describe('The current version of the lesson plan to be improved.'),
  request: z.string().describe("The user's request for how to improve the lesson plan (e.g., 'make it more interactive', 'add a section for special needs students')."),
});
export type ImproveLessonPlanInput = z.infer<typeof ImproveLessonPlanInputSchema>;

export const ImproveLessonPlanOutputSchema = z.object({
  revisedLessonPlan: z.string().describe('The newly revised lesson plan based on the user request.'),
});
export type ImproveLessonPlanOutput = z.infer<typeof ImproveLessonPlanOutputSchema>;
