/**
 * Live Teacher Feedback Component - Student Dashboard
 * 
 * Displays real-time teacher feedback, encouragements, and interventions
 * in a child-friendly, non-intrusive way for Grade 2 students.
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStudentFeedback } from '@/hooks/use-realtime-feedback';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  MessageCircle, 
  Heart, 
  Lightbulb, 
  AlertCircle, 
  Sparkles,
  X,
  ThumbsUp,
  MessageSquare
} from 'lucide-react';
import type { TeacherFeedback } from '@/lib/teacher/realtime-feedback';

const FEEDBACK_ICONS = {
  encouragement: Heart,
  hint: Lightbulb,
  intervention: AlertCircle,
  redirect: MessageCircle,
  celebration: Sparkles,
};

const FEEDBACK_COLORS = {
  encouragement: 'bg-pink-100 border-pink-300 text-pink-800',
  hint: 'bg-yellow-100 border-yellow-300 text-yellow-800',
  intervention: 'bg-orange-100 border-orange-300 text-orange-800',
  redirect: 'bg-blue-100 border-blue-300 text-blue-800',
  celebration: 'bg-purple-100 border-purple-300 text-purple-800',
};

interface FeedbackCardProps {
  feedback: TeacherFeedback;
  onMarkRead: (id: string) => void;
  onRespond: (id: string, response: string) => Promise<boolean | TeacherFeedback | null>;
}

function FeedbackCard({ feedback, onMarkRead, onRespond }: FeedbackCardProps) {
  const [showResponse, setShowResponse] = useState(false);
  const [response, setResponse] = useState('');
  const [isResponding, setIsResponding] = useState(false);
  
  const Icon = FEEDBACK_ICONS[feedback.type];
  const colorClass = FEEDBACK_COLORS[feedback.type];
  const isUnread = !feedback.readAt;
  const hasResponded = !!feedback.respondedAt;
  
  useEffect(() => {
    if (isUnread) {
      // Auto-mark as read after 3 seconds of display
      const timer = setTimeout(() => {
        onMarkRead(feedback.id);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback.id, isUnread, onMarkRead]);
  
  const handleRespond = async () => {
    if (!response.trim()) return;
    
    setIsResponding(true);
    const success = await onRespond(feedback.id, response);
    if (success) {
      setShowResponse(false);
      setResponse('');
    }
    setIsResponding(false);
  };
  
  const quickResponses = [
    "👍 Got it!",
    "❤️ Thank you!",
    "🤔 I need more help",
    "✨ I understand now!",
  ];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.3, type: "spring", stiffness: 200 }}
      className="relative"
    >
      <Card className={`relative overflow-hidden ${colorClass} ${isUnread ? 'ring-2 ring-blue-400 ring-opacity-50 shadow-lg' : ''}`}>
        {isUnread && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-blue-200/30 to-purple-200/30"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
        
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 p-2 rounded-full bg-white/70">
              <Icon className="h-5 w-5" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    From Teacher
                  </Badge>
                  {feedback.priority === 'high' && (
                    <Badge variant="destructive" className="text-xs animate-pulse">
                      Important
                    </Badge>
                  )}
                  {isUnread && (
                    <Badge variant="default" className="text-xs bg-blue-500">
                      New!
                    </Badge>
                  )}
                </div>
                <span className="text-xs opacity-60">
                  {new Date(feedback.createdAt).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
              
              <p className="text-sm font-medium mb-3 leading-relaxed">
                {feedback.message}
              </p>
              
              {!hasResponded && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowResponse(!showResponse)}
                    className="h-7 text-xs"
                  >
                    <MessageSquare className="h-3 w-3 mr-1" />
                    Reply
                  </Button>
                  
                  {!showResponse && (
                    <>
                      {quickResponses.map((quickResponse) => (
                        <Button
                          key={quickResponse}
                          size="sm"
                          variant="ghost"
                          onClick={() => onRespond(feedback.id, quickResponse)}
                          className="h-7 text-xs hover:bg-white/50"
                        >
                          {quickResponse}
                        </Button>
                      ))}
                    </>
                  )}
                </div>
              )}
              
              {hasResponded && (
                <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-md">
                  <ThumbsUp className="h-3 w-3" />
                  You replied to teacher
                </div>
              )}
            </div>
          </div>
          
          {showResponse && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 pt-3 border-t border-white/30"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="Type your message to teacher..."
                  className="flex-1 px-3 py-2 text-sm border border-white/50 rounded-md bg-white/70 placeholder-gray-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleRespond()}
                />
                <Button
                  size="sm"
                  onClick={handleRespond}
                  disabled={!response.trim() || isResponding}
                  className="px-3"
                >
                  Send
                </Button>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface LiveTeacherFeedbackProps {
  className?: string;
  maxMessages?: number;
}

export default function LiveTeacherFeedback({ 
  className, 
  maxMessages = 5 
}: LiveTeacherFeedbackProps) {
  const { 
    feedback, 
    unreadCount, 
    isConnected, 
    markAsRead, 
    respondToFeedback, 
    clearFeedback 
  } = useStudentFeedback();
  
  const [isMinimized, setIsMinimized] = useState(false);
  const [showAll, setShowAll] = useState(false);
  
  const displayedFeedback = showAll ? feedback : feedback.slice(0, maxMessages);
  const hasMoreMessages = feedback.length > maxMessages;
  
  if (feedback.length === 0) {
    return null; // Don't show anything if no messages
  }
  
  return (
    <div className={`fixed top-4 right-4 z-50 w-80 max-w-[90vw] ${className}`}>
      <AnimatePresence>
        {!isMinimized && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ duration: 0.3 }}
            className="space-y-3"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-gray-400'}`} />
                <h3 className="font-semibold text-sm text-gray-700">
                  Teacher Messages
                  {unreadCount > 0 && (
                    <Badge className="ml-2 bg-blue-500 text-white text-xs">
                      {unreadCount} new
                    </Badge>
                  )}
                </h3>
              </div>
              
              <div className="flex items-center gap-1">
                {feedback.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={clearFeedback}
                    className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsMinimized(true)}
                  className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Feedback Messages */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              <AnimatePresence>
                {displayedFeedback.map((fb) => (
                  <FeedbackCard
                    key={fb.id}
                    feedback={fb}
                    onMarkRead={markAsRead}
                    onRespond={respondToFeedback}
                  />
                ))}
              </AnimatePresence>
            </div>
            
            {/* Show More Button */}
            {hasMoreMessages && !showAll && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAll(true)}
                className="w-full text-xs"
              >
                Show {feedback.length - maxMessages} more messages
              </Button>
            )}
            
            {showAll && hasMoreMessages && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAll(false)}
                className="w-full text-xs"
              >
                Show less
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Minimized State */}
      {isMinimized && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative"
        >
          <Button
            onClick={() => setIsMinimized(false)}
            className="rounded-full w-12 h-12 bg-blue-500 hover:bg-blue-600 shadow-lg relative"
          >
            <MessageCircle className="h-5 w-5 text-white" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs min-w-[1.25rem] h-5 rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Button>
        </motion.div>
      )}
    </div>
  );
}