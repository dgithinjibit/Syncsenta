/**
 * @fileOverview Types for the school-head-consultant flow.
 */
import {z} from 'genkit';

const SchoolDataSchema = z.object({
    teacherCount: z.number().describe("Total number of teachers in the school."),
    studentCount: z.number().describe("Total number of students in the school."),
    averageAttendance: z.number().describe("The school-wide average student attendance percentage."),
    classes: z.array(z.object({
        name: z.string().describe("The name of the class."),
        studentCount: z.number().describe("Number of students in the class."),
        averagePerformance: z.number().describe("The average performance score (out of 100) for the class."),
    })).describe("A list of all classes in the school."),
    resources: z.array(z.object({
        title: z.string().describe("The title of the resource."),
        type: z.string().describe("The type of resource (e.g., 'Lesson Plan', 'Textbook', 'Science Kit').")
    })).describe("A list of available educational resources.")
});

export const SchoolHeadConsultantInputSchema = z.object({
  question: z.string().describe("The strategic or operational question from the school head."),
  schoolData: SchoolDataSchema.describe("The operational data for the school."),
});
export type SchoolHeadConsultantInput = z.infer<typeof SchoolHeadConsultantInputSchema>;

export const SchoolHeadConsultantOutputSchema = z.object({
  response: z.string().describe('A data-driven, insightful response to the school head\'s question, acting as an expert educational consultant.'),
});
export type SchoolHeadConsultantOutput = z.infer<typeof SchoolHeadConsultantOutputSchema>;
