'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, MessageCircle, User, TrendingUp, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

export default function TestPersonalizationPage() {
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const [testMessage, setTestMessage] = useState('I want to learn about fractions');
  const [testSubject, setTestSubject] = useState('Mathematics');

  const runTest = async (testName: string, url: string, options?: RequestInit) => {
    setIsLoading(prev => ({ ...prev, [testName]: true }));
    
    try {
      const response = await fetch(url, options);
      const data = await response.json();
      
      setResults(prev => ({
        ...prev,
        [testName]: {
          success: response.ok && data.success !== false,
          data,
          timestamp: new Date().toISOString()
        }
      }));
    } catch (error) {
      setResults(prev => ({
        ...prev,
        [testName]: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      }));
    } finally {
      setIsLoading(prev => ({ ...prev, [testName]: false }));
    }
  };

  const testProfile = () => {
    runTest('profile', '/api/test-personalization?action=profile&userId=user1');
  };

  const testProgress = () => {
    runTest('progress', `/api/test-personalization?action=progress&userId=user1&subject=${testSubject}`);
  };

  const testProviders = () => {
    runTest('providers', '/api/test-personalization?action=providers');
  };

  const testPersonalizedPrompt = () => {
    runTest('personalizedPrompt', '/api/test-personalization', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'testPersonalizedPrompt',
        userId: 'user1',
        subject: testSubject,
        message: testMessage
      })
    });
  };

  const testFullConversation = () => {
    runTest('conversation', '/api/test-personalization', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'simulateConversation',
        userId: 'user1',
        subject: testSubject,
        message: testMessage
      })
    });
  };

  const testMwalimuAPI = () => {
    runTest('mwalimuAPI', '/api/mwalimu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentMessage: testMessage,
        subject: testSubject,
        grade: 'g4',
        userId: 'user1',
        responseTime: 3
      })
    });
  };

  const ResultCard = ({ testName, title, description }: { testName: string; title: string; description: string }) => {
    const result = results[testName];
    const loading = isLoading[testName];

    return (
      <Card className="relative">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{title}</CardTitle>
            {result && (
              <Badge variant={result.success ? 'default' : 'destructive'}>
                {result.success ? <CheckCircle className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
                {result.success ? 'Success' : 'Failed'}
              </Badge>
            )}
          </div>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Running test...
            </div>
          )}
          
          {result && !loading && (
            <div className="space-y-3">
              {result.success ? (
                <div className="space-y-2">
                  <p className="text-sm text-green-600 font-medium">✅ Test passed</p>
                  {result.data && (
                    <div className="bg-muted p-3 rounded text-xs">
                      <pre className="whitespace-pre-wrap overflow-auto max-h-40">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-red-600 font-medium">❌ Test failed</p>
                  <p className="text-xs text-muted-foreground">
                    {result.error || 'Unknown error occurred'}
                  </p>
                  {result.data && (
                    <div className="bg-muted p-3 rounded text-xs">
                      <pre className="whitespace-pre-wrap overflow-auto max-h-40">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Tested at {new Date(result.timestamp).toLocaleTimeString()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Personalized Learning System Test</h1>
        <p className="text-muted-foreground">
          Test the AI personalization features and multi-provider system
        </p>
      </div>

      {/* Test Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Test Configuration</CardTitle>
          <CardDescription>Configure the test parameters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Test Subject</label>
              <Input
                value={testSubject}
                onChange={(e) => setTestSubject(e.target.value)}
                placeholder="Mathematics"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Test Message</label>
              <Input
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="I want to learn about fractions"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Tests</CardTitle>
          <CardDescription>Run individual tests to verify functionality</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Button onClick={testProfile} disabled={isLoading.profile} variant="outline">
              <User className="h-4 w-4 mr-2" />
              Test Profile
            </Button>
            <Button onClick={testProgress} disabled={isLoading.progress} variant="outline">
              <TrendingUp className="h-4 w-4 mr-2" />
              Test Progress
            </Button>
            <Button onClick={testProviders} disabled={isLoading.providers} variant="outline">
              <Brain className="h-4 w-4 mr-2" />
              Test Providers
            </Button>
            <Button onClick={testPersonalizedPrompt} disabled={isLoading.personalizedPrompt} variant="outline">
              <MessageCircle className="h-4 w-4 mr-2" />
              Test Prompt
            </Button>
            <Button onClick={testFullConversation} disabled={isLoading.conversation} variant="outline">
              <MessageCircle className="h-4 w-4 mr-2" />
              Test Conversation
            </Button>
            <Button onClick={testMwalimuAPI} disabled={isLoading.mwalimuAPI} variant="default">
              <Brain className="h-4 w-4 mr-2" />
              Test Mwalimu API
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      <div className="grid gap-6 md:grid-cols-2">
        <ResultCard
          testName="profile"
          title="Student Profile"
          description="Test personalized student profile creation and retrieval"
        />
        
        <ResultCard
          testName="progress"
          title="Learning Progress"
          description="Test learning progress tracking and analytics"
        />
        
        <ResultCard
          testName="providers"
          title="AI Providers"
          description="Test multi-provider AI system (Groq + AISA.one)"
        />
        
        <ResultCard
          testName="personalizedPrompt"
          title="Personalized Prompt"
          description="Test AI prompt personalization based on student profile"
        />
        
        <ResultCard
          testName="conversation"
          title="Full Conversation"
          description="Test complete personalized conversation simulation"
        />
        
        <ResultCard
          testName="mwalimuAPI"
          title="Mwalimu API"
          description="Test the main Mwalimu API with personalization"
        />
      </div>

      {/* Summary */}
      {Object.keys(results).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total Tests Run:</span>
                <span className="font-medium">{Object.keys(results).length}</span>
              </div>
              <div className="flex justify-between">
                <span>Passed:</span>
                <span className="font-medium text-green-600">
                  {Object.values(results).filter(r => r.success).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Failed:</span>
                <span className="font-medium text-red-600">
                  {Object.values(results).filter(r => !r.success).length}
                </span>
              </div>
              <Progress 
                value={(Object.values(results).filter(r => r.success).length / Object.keys(results).length) * 100}
                className="mt-2"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}