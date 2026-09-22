
'use server';

/**
 * @fileOverview AI agent to act as an operational consultant for a school head.
 *
 * - schoolHeadConsultant - A function that handles the analysis.
 */

import {ai} from '@/ai/genkit';
import {
    SchoolHeadConsultantInput,
    SchoolHeadConsultantInputSchema,
    SchoolHeadConsultantOutput,
    SchoolHeadConsultantOutputSchema
} from './school-head-consultant-types';


export async function schoolHeadConsultant(
  input: SchoolHeadConsultantInput
): Promise<SchoolHeadConsultantOutput> {
  return schoolHeadConsultantFlow(input);
}

const prompt = ai.definePrompt({
  name: 'schoolHeadConsultantPrompt',
  input: {schema: SchoolHeadConsultantInputSchema},
  output: {schema: SchoolHeadConsultantOutputSchema},
  prompt: `You are an expert AI Operational Consultant for a Kenyan school headteacher. Your role is to analyze the provided school data to answer their strategic questions. Provide clear, data-driven insights and actionable recommendations.

**School Operational Data:**
---
- **Total Teachers:** {{schoolData.teacherCount}}
- **Total Students:** {{schoolData.studentCount}}
- **School-Wide Average Attendance:** {{schoolData.averageAttendance}}%

**Class Details:**
{{#each schoolData.classes}}
- **{{name}}:** {{studentCount}} students, {{averagePerformance}}% average performance.
{{/each}}

**Available Resources:**
{{#if schoolData.resources}}
{{#each schoolData.resources}}
- {{title}} (Type: {{type}})
{{/each}}
{{else}}
- No specific resources logged.
{{/if}}
---

**Headteacher's Question:**
"{{{question}}}"

Based *only* on the data provided above, analyze the situation and provide a concise, insightful response. Connect different data points to form your analysis (e.g., connect resource availability to class performance). Start your response with a direct answer, then explain your reasoning based on the data.
`,
});

const schoolHeadConsultantFlow = ai.defineFlow(
  {
    name: 'schoolHeadConsultantFlow',
    inputSchema: SchoolHeadConsultantInputSchema,
    outputSchema: SchoolHeadConsultantOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
