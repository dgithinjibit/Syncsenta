
"use client";

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { HelpCircle, Bot, FlaskConical, Share2, Eye, ArrowLeft, ClipboardList, Info } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

function TeacherGuide() {
  const router = useRouter();

  return (
    <>
      <div className="flex justify-between items-center mb-6">
          <Card className="flex-grow">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 font-headline text-3xl">
                <HelpCircle className="w-8 h-8 text-primary" />
                SyncSenta Guide
              </CardTitle>
              <CardDescription>
                Your quick start guide to using the powerful AI tools at your fingertips. Keep it simple!
              </CardDescription>
            </CardHeader>
          </Card>
          <Button onClick={() => router.back()} variant="outline" className="ml-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
          </Button>
      </div>


      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Bot />
                1. Generating Resources
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-muted-foreground text-sm">
            <p>
              Navigate to the <strong>Teacher Tools</strong> page from the sidebar.
            </p>
            <p>
              Here you can instantly create high-quality, CBE-aligned resources like Lesson Plans, Schemes of Work, Worksheets, and Rubrics.
            </p>
            <p>
              Just fill in the details, and let the AI do the heavy lifting! You can save any generated resource to <strong>My Library</strong>.
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <FlaskConical />
                2. Creating a Study Bot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-muted-foreground text-sm">
            <p>
              Go to the <strong>Learning Lab</strong> in the sidebar. This is where you create custom AI tutors for your students.
            </p>
            <p>
              Paste any text—your lesson notes, an article, a story—into the box. The AI will *only* use this text to answer student questions.
            </p>
             <p>Click <strong>"Save to Room"</strong>. This creates a private learning environment for your students.</p>
          </CardContent>
        </Card>

         <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Share2 />
                3. Sharing with Students
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-muted-foreground text-sm">
            <p>
              After you save a room in the Learning Lab, a "Share Room" box will appear.
            </p>
            <p>
              This box contains a unique <strong>Join Code</strong>.
            </p>
            <p>
              Give this code to your students. When they log in, they can enter this code to join your custom Study Bot session.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Eye />
                4. Viewing Student Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-muted-foreground text-sm">
            <p>
              Go to the <strong>My Library</strong> page.
            </p>
            <p>
                Click on any "Study Bot Room" you've created.
            </p>
            <p>
              This will take you to the management dashboard for that room where you can see student activity and insights (feature coming soon).
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/20">
        <CardHeader className="bg-primary/5">
            <CardTitle className="flex items-center gap-2">
                <ClipboardList className="text-primary" />
                Understanding Your AI Documents
            </CardTitle>
            <CardDescription>
                A breakdown of what to expect when you generate a "Scheme of Work" or "Lesson Plan."
            </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="admin">
                    <AccordionTrigger className="font-bold">Administrative Details</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                        This is the header of your document. It includes your <strong>School Name</strong>, <strong>Teacher Name</strong>, <strong>Term</strong>, <strong>Year</strong>, and the <strong>Class Roll</strong> (number of boys/girls). The AI pre-fills this so your document is ready for official filing immediately.
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="strands">
                    <AccordionTrigger className="font-bold">Lesson Details (Strands & Sub-Strands)</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                        This part anchors your lesson in the Kenyan curriculum. The <strong>Strand</strong> is the broad learning area, while the <strong>Sub-Strand</strong> is the specific topic. The AI ensures these titles match the official KICD curriculum designs exactly.
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="outcomes">
                    <AccordionTrigger className="font-bold">Learning Outcomes & Inquiry Questions</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                        <p className="mb-2"><strong>Outcomes:</strong> These are the "I Can" statements. They define exactly what the learner should achieve by the end of the lesson.</p>
                        <p><strong>Key Inquiry Questions:</strong> These are Socratic, open-ended questions designed to stimulate the learner's mind and encourage them to explore the topic through reasoning rather than just listening.</p>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="org">
                    <AccordionTrigger className="font-bold">Organization of Learning (The Procedure)</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                        <p className="mb-2">This is your step-by-step teaching guide, broken into three phases:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Introduction (5 Mins):</strong> A "hook" or interactive activity to spark curiosity.</li>
                            <li><strong>Development (25 Mins):</strong> Practical, hands-on activities where learners explore materials, collaborate, and present findings.</li>
                            <li><strong>Conclusion (5 Mins):</strong> A summary where learners answer the inquiry questions and reflect on their progress.</li>
                        </ul>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="extended">
                    <AccordionTrigger className="font-bold">Extended Activity</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                        This section suggests a simple task for learners to perform outside of the classroom—at home or in their community—to reinforce what they learned during the lesson.
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="reflection">
                    <AccordionTrigger className="font-bold text-primary">Teacher's Reflection</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                        <div className="flex gap-3 bg-muted p-3 rounded-lg border">
                            <Info className="w-5 h-5 text-primary shrink-0" />
                            <p>This section is **always left blank** by the AI. It is reserved for YOU. After the lesson, use this space to note down what worked, what didn't, and how you will improve the next session. This is a critical part of professional teacher development in the CBC system.</p>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </CardContent>
      </Card>
    </>
  );
}

export default function GuidePage() {
    return (
        <div className="space-y-6">
            <TeacherGuide />
        </div>
    );
}
