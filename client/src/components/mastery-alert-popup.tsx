import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  AlertDialog, 
  AlertDialogContent, 
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader, 
  AlertDialogTitle,
  AlertDialogAction
} from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Target, Calendar, CheckCircle } from 'lucide-react';
import { detectMastery, type MasteryAlert } from '@/lib/masteryDetection';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import moment from 'moment';

interface MasteryAlertPopupProps {
  studentId: number;
  studentName?: string;
}

export default function MasteryAlertPopup({ studentId, studentName }: MasteryAlertPopupProps) {
  const [showAlert, setShowAlert] = useState(false);
  const [masteryAlerts, setMasteryAlerts] = useState<MasteryAlert[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const { toast } = useToast();

  // Fetch goals, objectives, and data points
  const { data: goals = [] } = useQuery({
    queryKey: [`/api/students/${studentId}/goals`],
    enabled: !!studentId,
  });

  const { data: allDataPoints = [] } = useQuery({
    queryKey: [`/api/students/${studentId}/all-data-points`],
    enabled: !!studentId,
  });

  const { data: objectivesData = {} } = useQuery({
    queryKey: [`/api/students/${studentId}/objectives`],
    queryFn: async () => {
      const objectivesByGoal: { [goalId: number]: any[] } = {};
      
      for (const goal of goals) {
        try {
          const objectives = await apiRequest('GET', `/api/goals/${goal.id}/objectives`);
          objectivesByGoal[goal.id] = Array.isArray(objectives) ? objectives : [];
        } catch (error) {
          console.error(`Failed to fetch objectives for goal ${goal.id}:`, error);
          objectivesByGoal[goal.id] = [];
        }
      }
      
      return objectivesByGoal;
    },
    enabled: goals.length > 0,
  });

  // Check for mastery when data changes
  useEffect(() => {
    if (!goals.length || !allDataPoints.length) return;

    const alerts = detectMastery(goals, objectivesData, allDataPoints, studentId);
    
    // Filter out previously dismissed alerts for this session
    const sessionKey = `masteryAlerts_dismissed_${studentId}`;
    const sessionDismissed = JSON.parse(sessionStorage.getItem(sessionKey) || '[]');
    
    const newAlerts = alerts.filter(alert => 
      !sessionDismissed.includes(alert.id) && !dismissedAlerts.includes(alert.id)
    );

    if (newAlerts.length > 0) {
      setMasteryAlerts(newAlerts);
      setShowAlert(true);
    }
  }, [goals, allDataPoints, objectivesData, studentId, dismissedAlerts]);

  const handleDismiss = async () => {
    setShowAlert(false);
    
    // Mark these alerts as dismissed for this session
    const sessionKey = `masteryAlerts_dismissed_${studentId}`;
    const currentDismissed = JSON.parse(sessionStorage.getItem(sessionKey) || '[]');
    const newDismissed = [...currentDismissed, ...masteryAlerts.map(a => a.id)];
    sessionStorage.setItem(sessionKey, JSON.stringify(newDismissed));
    
    setDismissedAlerts(prev => [...prev, ...masteryAlerts.map(a => a.id)]);
  };

  const handleMarkAsMastered = async (alert: MasteryAlert) => {
    try {
      const endpoint = alert.type === 'goal' 
        ? `/api/goals/${alert.itemId}` 
        : `/api/objectives/${alert.itemId}`;
      
      await apiRequest('PATCH', endpoint, { status: 'mastered' });
      
      toast({
        title: "Marked as Mastered",
        description: `${alert.type === 'goal' ? 'Goal' : 'Objective'} has been marked as mastered.`,
      });
      
      // Remove this alert from the list
      setMasteryAlerts(prev => prev.filter(a => a.id !== alert.id));
      
      // If no more alerts, close the dialog
      if (masteryAlerts.length === 1) {
        setShowAlert(false);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getAlertIcon = (type: string) => {
    return type === 'goal' ? (
      <Target className="h-5 w-5 text-blue-600" />
    ) : (
      <CheckCircle className="h-5 w-5 text-green-600" />
    );
  };

  const getAlertColor = (type: string) => {
    return type === 'goal' 
      ? 'bg-blue-50 border-blue-200 text-blue-800'
      : 'bg-green-50 border-green-200 text-green-800';
  };

  if (masteryAlerts.length === 0) return null;

  return (
    <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
      <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            Mastery Achieved! 🎉
          </AlertDialogTitle>
          <AlertDialogDescription>
            {studentName && `${studentName} has`} achieved mastery on {masteryAlerts.length} item{masteryAlerts.length !== 1 ? 's' : ''}:
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {masteryAlerts.map((alert) => (
            <Card key={alert.id} className={`border-2 ${getAlertColor(alert.type)}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    {getAlertIcon(alert.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900 truncate">
                          {alert.title}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          {alert.type === 'goal' ? 'Goal' : 'Objective'}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-gray-700 mb-2">
                        {alert.description}
                      </p>
                      
                      <div className="space-y-1 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          <span>Target: {alert.targetCriteria}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Achieved: {moment(alert.masteryDate).format('MMM D, YYYY')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          <span>Based on {alert.dataPointsUsed.length} data points</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    size="sm"
                    onClick={() => handleMarkAsMastered(alert)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Mark as Mastered
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <AlertDialogFooter>
          <AlertDialogAction onClick={handleDismiss}>
            I'll Review Later
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}