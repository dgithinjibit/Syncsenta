'use client';

import { useEffect, useState } from 'react';
import { Flame, Zap, Award, Trophy, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { getStudentStats } from '@/lib/progress-tracking';
import {
  getWeeklyPointsBreakdown,
  getStudentRank,
  type WeeklyPointsBreakdown,
} from '@/lib/gamification/points-system';
import { kenyanBadgeCatalog } from '@/lib/gamification/badges';

interface GamificationOverviewProps {
  userId: string;
  userName?: string;
}

export function GamificationOverview({ userId, userName = 'Student' }: GamificationOverviewProps) {
  const [stats, setStats] = useState<any>(null);
  const [weeklyPoints, setWeeklyPoints] = useState<WeeklyPointsBreakdown | null>(null);
  const [userRank, setUserRank] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      const emptyStats = {
        totalSessions: 0,
        totalMessages: 0,
        totalTimeMinutes: 0,
        currentStreak: 0,
        competenciesMastered: 0,
        achievementsEarned: 0,
      };
      const withTimeout = <T,>(promise: Promise<T>, ms = 5000) => Promise.race([
        promise,
        new Promise<T>((_, reject) => window.setTimeout(() => reject(new Error('Gamification request timed out')), ms)),
      ]);

      try {
        setLoading(true);

        // Get student stats
        const studentStats = await withTimeout(getStudentStats(userId)).catch((error) => {
          console.warn('Using empty achievement stats:', error);
          return emptyStats;
        });
        setStats(studentStats);

        // Get weekly points
        const weeklyData = await withTimeout(getWeeklyPointsBreakdown(userId)).catch((error) => {
          console.warn('Weekly points unavailable:', error);
          return null;
        });
        setWeeklyPoints(weeklyData);

        // Get rank
        const rank = await withTimeout(getStudentRank(userId)).catch((error) => {
          console.warn('Leaderboard rank unavailable:', error);
          return 0;
        });
        setUserRank(rank);
      } catch (error) {
        console.error('Error loading gamification stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
    
    // Refresh every minute
    const interval = setInterval(loadStats, 60000);
    return () => clearInterval(interval);
  }, [userId]);

  if (loading || !stats) {
    return (
      <Card className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="text-center text-gray-500">Loading achievements...</div>
      </Card>
    );
  }

  const earnedBadges = kenyanBadgeCatalog.filter((badge) => badge.earned);

  return (
    <Card className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">Your Achievements</h3>
        <Trophy className="w-5 h-5 text-amber-500" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Streak */}
        <div className="bg-white rounded-lg p-3 border border-red-200">
          <div className="flex items-center gap-2 mb-1">
            <Flame className="w-4 h-4 text-red-500" />
            <span className="text-xs font-medium text-gray-600">Current Streak</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{stats.currentStreak}</p>
          <p className="text-xs text-gray-500">days in a row</p>
        </div>

        {/* Rank */}
        <div className="bg-white rounded-lg p-3 border border-amber-200">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-medium text-gray-600">Rank</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">#{userRank}</p>
          <p className="text-xs text-gray-500">in leaderboard</p>
        </div>

        {/* Competencies Mastered */}
        <div className="bg-white rounded-lg p-3 border border-green-200">
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-4 h-4 text-green-500" />
            <span className="text-xs font-medium text-gray-600">Mastered</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.competenciesMastered}</p>
          <p className="text-xs text-gray-500">competencies</p>
        </div>

        {/* Achievements */}
        <div className="bg-white rounded-lg p-3 border border-purple-200">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-medium text-gray-600">Achievements</span>
          </div>
          <p className="text-2xl font-bold text-purple-600">{stats.achievementsEarned}</p>
          <p className="text-xs text-gray-500">earned so far</p>
        </div>
      </div>

      {/* Weekly Breakdown */}
      {weeklyPoints && Object.keys(weeklyPoints.breakdown).length > 0 && (
        <div className="bg-white rounded-lg p-3 border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-bold text-gray-700">This Week</span>
            <span className="ml-auto text-sm font-bold text-blue-600">
              +{weeklyPoints.totalWeeklyPoints} pts
            </span>
          </div>
          <div className="space-y-1 text-xs">
            {Object.entries(weeklyPoints.breakdown).map(([type, points]) => (
              <div key={type} className="flex justify-between text-gray-600">
                <span className="capitalize">{type.replace(/_/g, ' ')}</span>
                <span className="font-medium">+{points}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Badges */}
      {earnedBadges.length > 0 && (
        <div className="bg-white rounded-lg p-3 border border-yellow-200">
          <p className="text-xs font-bold text-gray-700 mb-2">Recently Earned</p>
          <div className="flex gap-2 flex-wrap">
            {earnedBadges.slice(-3).map((badge) => (
              <div
                key={badge.id}
                className="flex flex-col items-center text-center text-xs"
                title={badge.description}
              >
                <div className="text-xl mb-1">{badge.icon}</div>
                <span className="text-gray-600 font-medium line-clamp-2 max-w-[60px]">
                  {badge.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Motivational Message */}
      <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg p-3 border border-purple-300 text-sm text-center">
        <p className="font-medium text-gray-700">
          {stats.currentStreak >= 7 ? (
            <>🔥 Amazing streak! Keep it up!</>
          ) : stats.currentStreak >= 3 ? (
            <>🌟 You're on fire! 3+ day streak!</>
          ) : (
            <>💪 Start your learning streak today!</>
          )}
        </p>
      </div>
    </Card>
  );
}
