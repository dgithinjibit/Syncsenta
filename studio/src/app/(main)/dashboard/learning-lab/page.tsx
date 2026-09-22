
"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, FlaskConical } from "lucide-react";
import type { TeacherResource } from "@/lib/types";
import { useRouter } from "next/navigation";
import { ShareRoomDialog } from "@/components/share-room-dialog";
import { storage, db, app } from '@/lib/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { collection, addDoc } from 'firebase/firestore';
import { getAuth } from "firebase/auth";


function generateJoinCode() {
    // Generate a reasonably unique 7-char alphanumeric code
    return Math.random().toString(36).substring(2, 9).toUpperCase();
}

export default function LearningLabPage() {
    const [loading, setLoading] = useState(false);
    const [context, setContext] = useState("");
    const { toast } = useToast();
    const router = useRouter();
    const [isShareDialogOpen, setShareDialogOpen] = useState(false);
    const [shareCode, setShareCode] = useState("");

    const onResourceSaved = () => {
        window.dispatchEvent(new CustomEvent('resource-update'));
    }

    const handleSaveToRoom = async () => {
        const auth = getAuth(app);
        const user = auth.currentUser;

        if (!user) {
            toast({
                variant: "destructive",
                title: "Authentication Required",
                description: "You must be signed in to create a Learning Lab.",
            });
            return;
        }

        if (!context.trim()) {
            toast({
                variant: "destructive",
                title: "Content is empty",
                description: "Please provide some content for the Study Bot before saving.",
            });
            return;
        }

        setLoading(true);

        try {
            const resourceId = generateJoinCode();
            const fileName = `ai_tutor_contexts/${resourceId}.txt`;
            const storageRef = ref(storage, fileName);

            await uploadString(storageRef, context, 'raw');
            const downloadURL = await getDownloadURL(storageRef);

            const newResource: Omit<TeacherResource, 'id'> = {
              title: `Study Bot - ${new Date().toLocaleDateString()}`,
              url: downloadURL,
              createdAt: new Date().toISOString(),
              type: 'AI Tutor Context',
              joinCode: resourceId,
              creatorId: user.uid
            };
            
            await addDoc(collection(db, "teacherResources"), newResource);
            
            toast({
              title: "Study Bot Room Saved!",
              description: "Your new learning room is ready to be shared.",
            });

            setShareCode(resourceId);
            setShareDialogOpen(true);
            onResourceSaved();

        } catch (error) {
            console.error("Error saving AI Tutor context:", error);
            toast({
                variant: "destructive",
                title: "Error Saving Room",
                description: "Could not save the room to the cloud. Please try again."
            })
        } finally {
            setLoading(false);
        }
    };
    
    const handleDialogClose = () => {
        setShareDialogOpen(false);
        router.push('/dashboard/reports');
    }

  return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline text-2xl flex items-center gap-2">
                        <FlaskConical className="w-6 h-6 text-primary" />
                        Learning Lab: Create a Study Bot
                    </CardTitle>
                    <CardDescription>
                        Create a custom AI study partner for your students. Provide the text, article, or notes you want the bot to use as its only source of knowledge.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="grid w-full gap-1.5">
                        <Label htmlFor="message">Study Bot Knowledge Base</Label>
                        <Textarea 
                            placeholder="Paste your lesson notes, an article, or any text here. The AI will only use this content to answer student questions." 
                            id="message" 
                            className="h-64"
                            value={context}
                            onChange={(e) => setContext(e.target.value)}
                        />
                        <p className="text-sm text-muted-foreground">You can paste up to 75,000 words.</p>
                    </div>
                </CardContent>
                <CardFooter>
                     <Button onClick={handleSaveToRoom} disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save to Room
                    </Button>
                </CardFooter>
            </Card>
             <ShareRoomDialog 
                open={isShareDialogOpen}
                onOpenChange={setShareDialogOpen}
                joinCode={shareCode}
                onDialogClose={handleDialogClose}
            />
        </>
  );
}
