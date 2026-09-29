"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmojiFilter } from '@/lib/emoji-filter';
import {
  getSubjectsForGrade,
  getHardcodedStrands,
  getCurriculumData,
  getAllGrades,
} from '@/data/curriculum';
import { parseGradeLevel } from '@/data/curriculum/grade-level';
import type { GradeLevel } from '@/types/curriculum';

interface StrandSummary {
  name: string;
  subStrands: string[];
}

interface CurriculumSummary {
  grade: GradeLevel;
  subjects: string[];
  strands: StrandSummary[];
}

export default function TestSchemerPage() {
  const [emojiInput, setEmojiInput] = useState('Hello 👋 World 🌍! This is a test 😊');
  const [emojiOutput, setEmojiOutput] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>('Grade4');
  const [curriculumData, setCurriculumData] = useState<CurriculumSummary | null>(null);

  const handleEmojiTest = () => {
    const filtered = EmojiFilter.strip(emojiInput);
    setEmojiOutput(filtered);
  };

  const handleGradeChange = (value: string) => {
    // `<select>` yields `string`. `getAllGrades()` feeds it, so the parse passes
    // today; parsing rather than casting keeps the type honest if the option list
    // ever grows a label that is not a registry key.
    const grade = parseGradeLevel(value);
    if (grade) setSelectedGrade(grade);
  };

  const handleCurriculumTest = () => {
    const subjects = getSubjectsForGrade(selectedGrade);
    const mathData = getCurriculumData(selectedGrade, 'Mathematics');
    setCurriculumData({
      grade: selectedGrade,
      subjects: subjects.map(s => s.name),
      strands: (mathData?.strands ?? []).map(s => ({
        name: s.name,
        subStrands: s.subStrands.map(ss => ss.name),
      })),
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Schemer Integration Test Page</h1>

      {/* Emoji Filter Test */}
      <Card>
        <CardHeader>
          <CardTitle>1. Emoji Filter Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Input (with emojis):</label>
            <Input
              value={emojiInput}
              onChange={(e) => setEmojiInput(e.target.value)}
              placeholder="Type text with emojis..."
            />
          </div>
          <Button onClick={handleEmojiTest}>Strip Emojis</Button>
          {emojiOutput && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Output (no emojis):</p>
              <p>{emojiOutput}</p>
            </div>
          )}
          <div className="text-sm text-muted-foreground">
            <p><strong>Test Cases:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>Contains emojis: {EmojiFilter.containsEmojis(emojiInput) ? '✅ Yes' : '❌ No'}</li>
              <li>Extracted emojis: {EmojiFilter.extractEmojis(emojiInput).join(', ') || 'None'}</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Curriculum Data Test */}
      <Card>
        <CardHeader>
          <CardTitle>2. Curriculum Data Layer Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Select Grade:</label>
            <select
              value={selectedGrade}
              onChange={(e) => handleGradeChange(e.target.value)}
              className="w-full p-2 border rounded"
            >
              {getAllGrades().map(grade => (
                <option key={grade} value={grade}>{grade}</option>
              ))}
            </select>
          </div>
          <Button onClick={handleCurriculumTest}>Load Curriculum Data</Button>
          {curriculumData && (
            <div className="p-4 bg-muted rounded-lg space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Grade: {curriculumData.grade}</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Available Subjects:</p>
                <ul className="list-disc list-inside text-sm">
                  {curriculumData.subjects.map((subject: string) => (
                    <li key={subject}>{subject}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Mathematics Strands:</p>
                {curriculumData.strands.map((strand) => (
                  <div key={strand.name} className="ml-4 mb-2">
                    <p className="font-medium">{strand.name}</p>
                    <ul className="list-disc list-inside text-sm ml-4">
                      {strand.subStrands.map((ss) => (
                        <li key={ss}>{ss}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gikuyu Agent Test */}
      <Card>
        <CardHeader>
          <CardTitle>3. Gikuyu Agent Emoji Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Go to the student chat and select "Indigenous Language" to test the Gikuyu agent with emoji filtering.
          </p>
          <Button onClick={() => window.location.href = '/student/journey'}>
            Go to Student Journey
          </Button>
        </CardContent>
      </Card>

      {/* Status Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Implementation Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-green-600">✅</span>
              <span>Emoji Filter - Implemented and working</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">✅</span>
              <span>Curriculum Data Types - Defined</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">✅</span>
              <span>Curriculum Accessor Functions - Implemented</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-yellow-600">🔄</span>
              <span>Quiz Generation - TODO</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-yellow-600">🔄</span>
              <span>MeTTa Feedback - TODO</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-yellow-600">🔄</span>
              <span>Interactive Quiz Modal - TODO</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
