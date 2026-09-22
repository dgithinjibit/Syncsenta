
"use client";

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Database, UploadCloud } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ingestCurriculum } from '@/ai/flows/ingest-curriculum';
import { db, storage, app } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { curriculumStructure } from '@/lib/curriculum-structure';
import { getAuth } from 'firebase/auth';

export default function CurriculumIngestorPage() {
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    // State for the multi-step form
    const [selectedMajorLevel, setSelectedMajorLevel] = useState('');
    const [selectedSubLevel, setSelectedSubLevel] = useState('');
    const [selectedGrade, setSelectedGrade] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);


    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        
        const auth = getAuth(app);
        const user = auth.currentUser;

        if (!user) {
            toast({ variant: 'destructive', title: 'Auth Error', description: 'User session not found.' });
            return;
        }

        if (!selectedFiles || selectedFiles.length === 0) {
            toast({
                variant: 'destructive',
                title: 'No PDF selected',
                description: 'Please select one or more curriculum PDF files.'
            });
            return;
        }

        setLoading(true);

        try {
            for (const pdfFile of Array.from(selectedFiles)) {
                 // 1. Upload the original PDF for backup
                const storageRef = ref(storage, `curriculum_pdfs/${selectedGrade}/${selectedSubject}/${pdfFile.name}`);
                const uploadSnapshot = await uploadBytes(storageRef, pdfFile);
                const downloadURL = await getDownloadURL(uploadSnapshot.ref);

                // 2. Ingest the curriculum content.
                const documentText = `
                    Strand: 1.0 OUR NEIGHBOURHOOD
                    Sub Strand: 1.1 Sorting and Grouping
                    Learning Outcomes: identify different play objects, list similarities, group play objects.
                    Suggested Activities: collect objects, discuss similarities, sort by colour.
                    Key Inquiry Questions: How can we group objects?
                `;
                
                const result = await ingestCurriculum({ 
                    documentText, 
                    grade: selectedGrade, 
                    subject: selectedSubject,
                    majorLevel: selectedMajorLevel,
                    subLevel: selectedSubLevel
                });

                // 3. Save the structured data and a link to the original file to Firestore
                const curriculumCollection = collection(db, "curriculumData");
                await addDoc(curriculumCollection, {
                    majorLevel: selectedMajorLevel,
                    subLevel: selectedSubLevel,
                    grade: selectedGrade,
                    subject: selectedSubject,
                    createdAt: new Date().toISOString(),
                    originalFileUrl: downloadURL,
                    content: result.parsedCurriculum || [],
                    creatorId: user.uid
                });
            }


            toast({
                title: "Curriculum Ingested!",
                description: `Successfully uploaded and processed ${selectedFiles.length} file(s) for ${selectedGrade} ${selectedSubject}. The AI tutor is now trained on this content.`,
            });
            
            // Reset form
            (event.target as HTMLFormElement).reset();
            setSelectedMajorLevel('');
            setSelectedSubLevel('');
            setSelectedGrade('');
            setSelectedSubject('');
            setSelectedFiles(null);

        } catch (error) {
            console.error("Error ingesting curriculum:", error);
            toast({
                variant: "destructive",
                title: "Error During Ingestion",
                description: "An unexpected error occurred. Check the console for details."
            });
        } finally {
            setLoading(false);
        }
    }
    
    // Memoized selectors for dependent dropdowns
    const availableSubLevels = useMemo(() => {
        if (!selectedMajorLevel) return [];
        return curriculumStructure.find(m => m.name === selectedMajorLevel)?.subLevels || [];
    }, [selectedMajorLevel]);

    const availableGrades = useMemo(() => {
        if (!selectedSubLevel) return [];
        return availableSubLevels.find(s => s.name === selectedSubLevel)?.grades || [];
    }, [selectedSubLevel, availableSubLevels]);

    const availableSubjects = useMemo(() => {
        if (!selectedGrade) return [];
        const gradeData = availableGrades.find(g => g.name === selectedGrade);
        if (!gradeData) return [];

        const coreSubjects = gradeData.subjects.filter(s => s.type === 'Core');
        const optionalSubjects = gradeData.subjects.filter(s => s.type === 'Optional');
        
        return { core: coreSubjects, optional: optionalSubjects };

    }, [selectedGrade, availableGrades]);

    return (
        <Card className="w-full max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center gap-3 font-headline text-3xl">
                    <Database className="w-8 h-8 text-primary" />
                    Curriculum Ingestor
                </CardTitle>
                <CardDescription>
                   Follow these steps to upload curriculum documents. The AI will process them and store them in a structured format for other tools to use.
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-6">
                     <div className="grid md:grid-cols-2 gap-6">
                        {/* Step 1: Major Level */}
                        <div className="space-y-2">
                            <Label htmlFor="majorLevel">1. Select Major Level</Label>
                            <Select name="majorLevel" required value={selectedMajorLevel} onValueChange={v => { setSelectedMajorLevel(v); setSelectedSubLevel(''); setSelectedGrade(''); setSelectedSubject(''); }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select an education level" />
                                </SelectTrigger>
                                <SelectContent>
                                    {curriculumStructure.map(level => (
                                        <SelectItem key={level.name} value={level.name}>{level.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {/* Step 2: Sub Level */}
                        {selectedMajorLevel && (
                            <div className="space-y-2">
                                <Label htmlFor="subLevel">2. Select Sub-Level</Label>
                                <Select name="subLevel" required value={selectedSubLevel} onValueChange={v => { setSelectedSubLevel(v); setSelectedGrade(''); setSelectedSubject(''); }}>
                                    <SelectTrigger disabled={!availableSubLevels.length}>
                                        <SelectValue placeholder="Select a sub-level" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableSubLevels.map(level => (
                                            <SelectItem key={level.name} value={level.name}>{level.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                         {/* Step 3: Grade */}
                        {selectedSubLevel && (
                            <div className="space-y-2">
                                <Label htmlFor="grade">3. Select Grade</Label>
                                <Select name="grade" required value={selectedGrade} onValueChange={v => { setSelectedGrade(v); setSelectedSubject(''); }}>
                                    <SelectTrigger disabled={!availableGrades.length}>
                                        <SelectValue placeholder="Select a grade" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableGrades.map(grade => (
                                            <SelectItem key={grade.name} value={grade.name}>{grade.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        {/* Step 4: Subject */}
                        {selectedGrade && (
                            <div className="space-y-2">
                                <Label htmlFor="subject">4. Select Subject</Label>
                                <Select name="subject" required value={selectedSubject} onValueChange={setSelectedSubject}>
                                    <SelectTrigger disabled={!availableSubjects}>
                                        <SelectValue placeholder="Select a subject" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableSubjects && availableSubjects.core.length > 0 && (
                                            <>
                                                <Label className="px-2 py-1.5 text-xs font-semibold">Core Subjects</Label>
                                                {availableSubjects.core.map(subject => (
                                                    <SelectItem key={subject.name} value={subject.name}>{subject.name}</SelectItem>
                                                ))}
                                            </>
                                        )}
                                        {availableSubjects && availableSubjects.optional.length > 0 && (
                                             <>
                                                <Label className="px-2 py-1.5 text-xs font-semibold">Optional Subjects</Label>
                                                {availableSubjects.optional.map(subject => (
                                                    <SelectItem key={subject.name} value={subject.name}>{subject.name}</SelectItem>
                                                ))}
                                            </>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                     <div className="space-y-2 pt-4">
                        <Label htmlFor="pdfFile">5. Upload Curriculum PDF(s)</Label>
                        <Input 
                            id="pdfFile" 
                            name="pdfFile" 
                            type="file" 
                            accept=".pdf" 
                            required 
                            multiple
                            onChange={(e) => setSelectedFiles(e.target.files)}
                        />
                         <p className="text-sm text-muted-foreground">Select one or more official PDF documents for the chosen grade and subject.</p>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={loading || !selectedSubject || !selectedFiles} className="w-full md:w-auto">
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                        {loading ? 'Ingesting...' : 'Ingest Curriculum Data'}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    )
}
