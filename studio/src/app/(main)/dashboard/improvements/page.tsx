
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Lightbulb, BookOpen, Users, BrainCircuit } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";


const PedagogyModule = () => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2"><Lightbulb className="text-primary"/> Advanced Pedagogy</CardTitle>
      <CardDescription>Explore modern teaching strategies to enhance student engagement and outcomes.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-6">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="item-1">
          <AccordionTrigger>Project-Based Learning (PBL)</AccordionTrigger>
          <AccordionContent>
            <p className="mb-2 text-muted-foreground">Shift from teacher-centered instruction to student-centered projects where students gain knowledge and skills by working for an extended period to investigate and respond to an authentic, engaging, and complex question, problem, or challenge.</p>
            <Button>Get AI Suggestions for a PBL Project</Button>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>Flipped Classroom</AccordionTrigger>
          <AccordionContent>
            <p className="mb-2 text-muted-foreground">Instructional strategy and a type of blended learning that reverses the traditional learning environment by delivering instructional content, often online, outside of the classroom. It moves activities, including those that may have traditionally been considered homework, into the classroom.</p>
             <Button variant="secondary">Plan a Flipped Lesson</Button>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </CardContent>
  </Card>
);

const ManagementModule = () => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2"><Users className="text-primary"/> Classroom Management</CardTitle>
      <CardDescription>Develop techniques for a more organized, efficient, and positive learning environment.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-6">
        <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">Scenario Solver</h4>
            <p className="text-muted-foreground mb-4 text-sm">Describe a classroom challenge you're facing, and get AI-driven, evidence-based strategies to address it.</p>
            <textarea placeholder="For example: 'Two students are constantly talking while I'm teaching. What are some positive interventions I can try?'" className="w-full h-24 p-2 border rounded-md bg-muted/50"></textarea>
            <Button className="mt-2">Get AI Advice</Button>
        </div>
    </CardContent>
  </Card>
);

const DigitalToolsModule = () => (
    <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2"><BrainCircuit className="text-primary"/> Digital Tool Mastery</CardTitle>
      <CardDescription>Master the AI tools within SyncSenta to save time and enhance your teaching.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-6">
        <div>
            <h3 className="font-semibold mb-2">Your Tool Proficiency</h3>
            <div className="space-y-4">
                <div>
                    <Label>Lesson Plan Generator</Label>
                    <Progress value={80} className="w-full" />
                </div>
                 <div>
                    <Label>AI Tutor Configuration</Label>
                    <Progress value={50} className="w-full" />
                </div>
                 <div>
                    <Label>Rubric Creation</Label>
                    <Progress value={65} className="w-full" />
                </div>
            </div>
        </div>
        <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">Quick Challenge: Differentiate a Text</h4>
            <p className="text-sm text-muted-foreground mb-4">Use the Differentiation Station tool to adapt a short paragraph for a struggling reader. This will improve your "AI Tutor Configuration" score.</p>
            <Button>Start Challenge</Button>
        </div>
    </CardContent>
  </Card>
);

export default function ImprovementsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-3xl">🧑‍🏫 Teacher Improvement Hub</CardTitle>
          <CardDescription>
            A personalized space for professional growth. Explore new strategies, master digital tools, and solve classroom challenges with AI assistance.
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="pedagogy">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pedagogy">Advanced Pedagogy</TabsTrigger>
          <TabsTrigger value="management">Classroom Management</TabsTrigger>
          <TabsTrigger value="tools">Digital Tool Mastery</TabsTrigger>
        </TabsList>
        <TabsContent value="pedagogy">
          <PedagogyModule />
        </TabsContent>
        <TabsContent value="management">
          <ManagementModule />
        </TabsContent>
        <TabsContent value="tools">
          <DigitalToolsModule />
        </TabsContent>
      </Tabs>
    </div>
  );
}
