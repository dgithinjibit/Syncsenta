"use client"

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar, FileText, ClipboardList, Users, 
  MessageSquare, Award, Brain, TrendingUp, AlertCircle, FileUp,
  BarChart3, Target, Lightbulb, GraduationCap, Sparkles
} from 'lucide-react'

// Import sub-components
import { SchemeWizard } from '@/components/scheme-wizard/scheme-wizard'
import { MaterialLessonGenerator } from './material-lesson-generator'
import { LessonPlanFromScheme } from './lesson-plan-from-scheme'
import { AssessmentGenerator } from './assessment-generator'
import { StudentMonitoring } from './student-monitoring'
import { InterventionCenter } from './intervention-center'
import { AnalyticsDashboard } from './analytics-dashboard'
import { ProfessionalDevelopment } from './professional-development'
import { AssessmentRecordsPanel } from './assessment-records-panel'

export function EnhancedTeacherDashboard() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="container mx-auto p-6 max-w-[1600px]">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-4xl font-bold">Your teaching workspace</h1>
              <p className="text-muted-foreground">
                Plan lessons, assess learning, and support each learner with Kenyan CBC guidance.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
              <GraduationCap className="h-3 w-3" />
              CBC teaching tools
            </Badge>
            <Badge variant="secondary">Choose a class to begin</Badge>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2 h-auto p-2">
          <TabsTrigger value="overview" className="flex-col gap-1 min-h-16 h-auto py-2">
            <BarChart3 className="h-4 w-4" />
            <span className="text-xs text-center leading-tight">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="scheme-of-work" className="flex-col gap-1 min-h-16 h-auto py-2">
            <Calendar className="h-4 w-4" />
            <span className="text-xs text-center leading-tight">
              Schemes<br />of work
            </span>
          </TabsTrigger>
          <TabsTrigger value="material-to-lesson" className="flex-col gap-1 min-h-16 h-auto py-2">
            <FileUp className="h-4 w-4" />
            <span className="text-xs text-center leading-tight">
              Material<br />to lesson
            </span>
          </TabsTrigger>
          <TabsTrigger value="lesson-plans" className="flex-col gap-1 min-h-16 h-auto py-2">
            <FileText className="h-4 w-4" />
            <span className="text-xs text-center leading-tight">
              Lesson<br />plans
            </span>
          </TabsTrigger>
          <TabsTrigger value="assessments" className="flex-col gap-1 min-h-16 h-auto py-2">
            <ClipboardList className="h-4 w-4" />
            <span className="text-xs text-center leading-tight">Assessments</span>
          </TabsTrigger>
          <TabsTrigger value="students" className="flex-col gap-1 min-h-16 h-auto py-2">
            <Users className="h-4 w-4" />
            <span className="text-xs text-center leading-tight">Students</span>
          </TabsTrigger>
          <TabsTrigger value="interventions" className="flex-col gap-1 min-h-16 h-auto py-2">
            <Target className="h-4 w-4" />
            <span className="text-xs text-center leading-tight">Interventions</span>
          </TabsTrigger>
          <TabsTrigger value="professional-dev" className="flex-col gap-1 min-h-16 h-auto py-2">
            <Lightbulb className="h-4 w-4" />
            <span className="text-xs text-center leading-tight">Prof. Dev</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <AnalyticsDashboard />
        </TabsContent>

        {/* Scheme of Work Tab */}
        <TabsContent value="scheme-of-work">
          <SchemeWizard />
        </TabsContent>

        {/* Material-to-lesson workflow */}
        <TabsContent value="material-to-lesson">
          <MaterialLessonGenerator />
        </TabsContent>

        {/* Lesson Plans Tab */}
        <TabsContent value="lesson-plans">
          <LessonPlanFromScheme />
        </TabsContent>

        {/* Assessments Tab */}
        <TabsContent value="assessments" className="space-y-6">
          <AssessmentGenerator />
          <AssessmentRecordsPanel />
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students">
          <StudentMonitoring />
        </TabsContent>

        {/* Interventions Tab */}
        <TabsContent value="interventions">
          <InterventionCenter />
        </TabsContent>

        {/* Professional Development Tab */}
        <TabsContent value="professional-dev">
          <ProfessionalDevelopment />
        </TabsContent>
      </Tabs>
    </div>
  )
}
