/**
 * Quick Actions Component
 * 
 * Provides quick action buttons for teacher interventions.
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Lightbulb, Heart, Navigation, MessageSquare } from 'lucide-react';
import { sendIntervention } from '@/lib/teacher/teacher-dashboard';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

interface QuickActionsProps {
  studentId: string;
  studentName: string;
  sessionId?: string;
  competencyCode?: string;
  onSuccess?: () => void;
}

export function QuickActions({
  studentId,
  studentName,
  sessionId,
  competencyCode,
  onSuccess,
}: QuickActionsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [interventionType, setInterventionType] = useState<
    'hint' | 'encouragement' | 'redirect' | 'clarification'
  >('hint');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleQuickAction = async (
    type: 'hint' | 'encouragement' | 'redirect',
    quickMessage: string
  ) => {
    if (!user) return;

    try {
      setSending(true);
      await sendIntervention(
        user.id,
        studentId,
        type,
        quickMessage,
        sessionId,
        competencyCode
      );

      toast({
        title: 'Intervention sent',
        description: `Your ${type} has been sent to ${studentName}`,
      });

      onSuccess?.();
    } catch (error) {
      console.error('Error sending intervention:', error);
      toast({
        title: 'Error',
        description: 'Failed to send intervention. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleCustomMessage = async () => {
    if (!user || !message.trim()) return;

    try {
      setSending(true);
      await sendIntervention(
        user.id,
        studentId,
        interventionType,
        message,
        sessionId,
        competencyCode
      );

      toast({
        title: 'Message sent',
        description: `Your message has been sent to ${studentName}`,
      });

      setMessage('');
      setDialogOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            handleQuickAction(
              'hint',
              'I noticed you might be stuck. Try breaking down the problem into smaller steps. What do you know so far?'
            )
          }
          disabled={sending}
        >
          <Lightbulb className="h-4 w-4 mr-1" />
          Send Hint
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            handleQuickAction(
              'encouragement',
              "Great effort! You're making progress. Keep going, you've got this!"
            )
          }
          disabled={sending}
        >
          <Heart className="h-4 w-4 mr-1" />
          Encourage
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            handleQuickAction(
              'redirect',
              "Let's refocus on the current topic. What specific part would you like help with?"
            )
          }
          disabled={sending}
        >
          <Navigation className="h-4 w-4 mr-1" />
          Redirect
        </Button>

        <Button
          size="sm"
          variant="default"
          onClick={() => setDialogOpen(true)}
          disabled={sending}
        >
          <MessageSquare className="h-4 w-4 mr-1" />
          Custom Message
        </Button>
      </div>

      {/* Custom Message Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Message to {studentName}</DialogTitle>
            <DialogDescription>
              Send a personalized intervention or guidance message
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="intervention-type">Intervention Type</Label>
              <Select
                value={interventionType}
                onValueChange={(value: any) => setInterventionType(value)}
              >
                <SelectTrigger id="intervention-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hint">Hint</SelectItem>
                  <SelectItem value="encouragement">Encouragement</SelectItem>
                  <SelectItem value="redirect">Redirect</SelectItem>
                  <SelectItem value="clarification">Clarification</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Type your message here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCustomMessage} disabled={!message.trim() || sending}>
              {sending ? 'Sending...' : 'Send Message'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
