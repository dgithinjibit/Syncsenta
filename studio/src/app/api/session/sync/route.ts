/**
 * Session Sync API - Cross-device learning continuity
 * 
 * POST /api/session/sync - Update session state
 * GET /api/session/sync - Get current session state
 */

import { NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { 
  getLearningSession, 
  updateLearningSession, 
  syncActivityProgress,
  syncCompetencyProgress,
  unlockAchievement,
  getDeviceSyncInfo
} from '@/lib/session/session-persistence';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    if (action === 'info') {
      // Get sync debug info
      const syncInfo = await getDeviceSyncInfo(user.id);
      return Response.json({ syncInfo });
    }
    
    // Get full session
    const session = await getLearningSession(user.id);
    return Response.json({ 
      session,
      synced: !!session,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Session sync GET error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { type, data, deviceId } = body;
    
    let success = false;
    let result: any = {};
    
    switch (type) {
      case 'activity_progress':
        success = await syncActivityProgress(
          user.id,
          data.activityId,
          {
            name: data.name,
            subject: data.subject,
            progressPercent: data.progress,
            timeSpent: data.timeSpent,
            isCompleted: data.completed,
            score: data.score,
            data: data.activityData,
          },
          deviceId || 'unknown'
        );
        break;
        
      case 'competency_progress':
        success = await syncCompetencyProgress(
          user.id,
          data.competencyId,
          data.level,
          data.activityId
        );
        break;
        
      case 'achievement':
        success = await unlockAchievement(
          user.id,
          data.achievementId,
          data.name,
          data.type
        );
        break;
        
      case 'session_update':
        success = await updateLearningSession(user.id, data, deviceId);
        break;
        
      case 'preferences':
        const session = await getLearningSession(user.id);
        if (session) {
          success = await updateLearningSession(user.id, {
            preferences: { ...session.preferences, ...data }
          }, deviceId);
        }
        break;
        
      default:
        return Response.json({ error: 'Invalid sync type' }, { status: 400 });
    }
    
    if (success) {
      // Return updated session for immediate client sync
      const updatedSession = await getLearningSession(user.id);
      result = { session: updatedSession };
    }
    
    return Response.json({ 
      success, 
      timestamp: new Date().toISOString(),
      ...result
    });
    
  } catch (error) {
    console.error('Session sync POST error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}