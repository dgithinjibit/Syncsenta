/**
 * Alerts Panel
 * 
 * Displays real-time alerts for students needing attention.
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  X,
  MessageSquare,
  Clock,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { acknowledgeAlert, resolveAlert, dismissAlert } from '@/lib/teacher/teacher-dashboard';
import { useAuth } from '@/hooks/use-auth';

interface StudentAlert {
  alert_id: string;
  student_id: string;
  student_name: string;
  alert_type: 'stuck' | 'frustrated' | 'off_topic' | 'struggling' | 'inactive' | 'breakthrough' | 'mastery';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string | null;
  session_id: string | null;
  competency_code: string | null;
  created_at: string;
}

interface AlertsPanelProps {
  alerts: StudentAlert[];
  onAlertAction: () => void;
}

export function AlertsPanel({ alerts, onAlertAction }: AlertsPanelProps) {
  const { user } = useAuth();
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [processingAlerts, setProcessingAlerts] = useState<Set<string>>(new Set());

  const filteredAlerts = alerts.filter((alert) =>
    filterSeverity === 'all' ? true : alert.severity === filterSeverity
  );

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'high':
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      case 'medium':
        return <Info className="h-5 w-5 text-yellow-500" />;
      case 'low':
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'high':
        return <Badge className="bg-orange-500">High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500">Medium</Badge>;
      case 'low':
        return <Badge variant="secondary">Low</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const getAlertTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      stuck: 'Student Stuck',
      frustrated: 'Frustrated',
      off_topic: 'Off Topic',
      struggling: 'Struggling',
      inactive: 'Inactive',
      breakthrough: 'Breakthrough! 🎉',
      mastery: 'Mastery Achieved! ⭐',
    };
    return labels[type] || type;
  };

  const handleAcknowledge = async (alertId: string) => {
    if (!user) return;

    setProcessingAlerts((prev) => new Set(prev).add(alertId));
    try {
      await acknowledgeAlert(alertId, user.id);
      onAlertAction();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    } finally {
      setProcessingAlerts((prev) => {
        const next = new Set(prev);
        next.delete(alertId);
        return next;
      });
    }
  };

  const handleResolve = async (alertId: string) => {
    setProcessingAlerts((prev) => new Set(prev).add(alertId));
    try {
      await resolveAlert(alertId);
      onAlertAction();
    } catch (error) {
      console.error('Error resolving alert:', error);
    } finally {
      setProcessingAlerts((prev) => {
        const next = new Set(prev);
        next.delete(alertId);
        return next;
      });
    }
  };

  const handleDismiss = async (alertId: string) => {
    setProcessingAlerts((prev) => new Set(prev).add(alertId));
    try {
      await dismissAlert(alertId);
      onAlertAction();
    } catch (error) {
      console.error('Error dismissing alert:', error);
    } finally {
      setProcessingAlerts((prev) => {
        const next = new Set(prev);
        next.delete(alertId);
        return next;
      });
    }
  };

  // Group alerts by severity
  const criticalAlerts = filteredAlerts.filter((a) => a.severity === 'critical');
  const highAlerts = filteredAlerts.filter((a) => a.severity === 'high');
  const otherAlerts = filteredAlerts.filter(
    (a) => a.severity !== 'critical' && a.severity !== 'high'
  );

  const sortedAlerts = [...criticalAlerts, ...highAlerts, ...otherAlerts];

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Student Alerts</h3>
          <p className="text-sm text-muted-foreground">
            {filteredAlerts.length} active alert{filteredAlerts.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="critical">Critical Only</SelectItem>
            <SelectItem value="high">High Only</SelectItem>
            <SelectItem value="medium">Medium Only</SelectItem>
            <SelectItem value="low">Low Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {sortedAlerts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">All Clear!</h3>
              <p className="text-sm text-muted-foreground text-center">
                No active alerts. Your students are doing great!
              </p>
            </CardContent>
          </Card>
        ) : (
          sortedAlerts.map((alert) => (
            <Card
              key={alert.alert_id}
              className={`${
                alert.severity === 'critical'
                  ? 'border-red-500 border-2'
                  : alert.severity === 'high'
                  ? 'border-orange-500'
                  : ''
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getSeverityIcon(alert.severity)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {getSeverityBadge(alert.severity)}
                          <Badge variant="outline">
                            {getAlertTypeLabel(alert.alert_type)}
                          </Badge>
                        </div>
                        <h4 className="font-semibold">{alert.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          Student: {alert.student_name}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(alert.created_at), {
                          addSuffix: true,
                        })}
                      </div>
                    </div>

                    {alert.description && (
                      <p className="text-sm">{alert.description}</p>
                    )}

                    {alert.competency_code && (
                      <p className="text-xs text-muted-foreground">
                        Competency: {alert.competency_code}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => handleAcknowledge(alert.alert_id)}
                        disabled={processingAlerts.has(alert.alert_id)}
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Send Message
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResolve(alert.alert_id)}
                        disabled={processingAlerts.has(alert.alert_id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Resolve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDismiss(alert.alert_id)}
                        disabled={processingAlerts.has(alert.alert_id)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
