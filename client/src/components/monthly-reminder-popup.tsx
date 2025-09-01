import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Calendar, Clock, GraduationCap, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import moment from 'moment';

interface Student {
  id: number;
  name: string;
  iepDueDate: string | null;
  grade?: string;
}

interface ReportingPeriod {
  periodNumber: number;
  startDate: string;
  endDate: string;
}

interface ReportingPeriodsData {
  periodLength: string;
  periods: ReportingPeriod[];
  savedAt: string;
}

interface ReminderEvent {
  id: string;
  title: string;
  date: Date;
  type: 'iep-due' | 'period-start' | 'period-end';
  studentName?: string;
  periodNumber?: number;
  daysUntil: number;
}

export default function MonthlyReminderPopup() {
  const [showReminder, setShowReminder] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<ReminderEvent[]>([]);

  const { data: students } = useQuery({
    queryKey: ["/api/students"],
  });

  const { data: reportingPeriodsFromDB } = useQuery({
    queryKey: ["/api/reporting-periods"],
  });

  useEffect(() => {
    checkForUpcomingEvents();
  }, [students, reportingPeriodsFromDB]);

  const checkForUpcomingEvents = () => {
    // Use UTC to avoid timezone issues
    const currentDate = moment.utc();
    const currentMonth = currentDate.format('YYYY-MM');
    const lastShownMonth = localStorage.getItem('lastReminderMonth');
    
    // Only show reminder once per month or if it's a new month
    if (lastShownMonth === currentMonth) {
      return;
    }

    const events: ReminderEvent[] = [];
    const startOfMonth = moment.utc().startOf('month');
    const endOfMonth = moment.utc().endOf('month');

    // Check for IEP due dates in current month
    if (students && Array.isArray(students)) {
      students.forEach((student: Student) => {
        if (student.iepDueDate) {
          const dueDate = moment.utc(student.iepDueDate);
          if (dueDate.isBetween(startOfMonth, endOfMonth, 'day', '[]')) {
            const daysUntil = dueDate.diff(currentDate, 'days');
            if (daysUntil >= 0) { // Only show future or today's events
              events.push({
                id: `iep-${student.id}`,
                title: `IEP Due - ${student.name}`,
                date: dueDate.toDate(),
                type: 'iep-due',
                studentName: student.name,
                daysUntil
              });
            }
          }
        }
      });
    }

    // Check for reporting period events in current month
    let reportingData: ReportingPeriodsData | null = null;
    
    if (reportingPeriodsFromDB && 
        typeof reportingPeriodsFromDB === 'object' && 
        'periods' in reportingPeriodsFromDB &&
        Array.isArray((reportingPeriodsFromDB as any).periods) &&
        (reportingPeriodsFromDB as any).periods.length > 0) {
      reportingData = reportingPeriodsFromDB as ReportingPeriodsData;
    } else {
      // Fallback to localStorage if database doesn't have data
      const savedData = localStorage.getItem('reportingPeriods');
      if (savedData) {
        try {
          const parsedData = JSON.parse(savedData);
          if (parsedData && Array.isArray(parsedData.periods)) {
            reportingData = parsedData as ReportingPeriodsData;
          }
        } catch (e) {
          console.error('Error parsing reporting periods from localStorage:', e);
        }
      }
    }

    if (reportingData && reportingData.periods && Array.isArray(reportingData.periods)) {
      reportingData.periods.forEach((period: ReportingPeriod) => {
        const startDate = moment.utc(period.startDate);
        const endDate = moment.utc(period.endDate);

        // Check if period start is in current month
        if (startDate.isBetween(startOfMonth, endOfMonth, 'day', '[]')) {
          const daysUntil = startDate.diff(currentDate, 'days');
          if (daysUntil >= 0) {
            events.push({
              id: `period-start-${period.periodNumber}`,
              title: `Reporting Period ${period.periodNumber} Begins`,
              date: startDate.toDate(),
              type: 'period-start',
              periodNumber: period.periodNumber,
              daysUntil
            });
          }
        }

        // Check if period end is in current month
        if (endDate.isBetween(startOfMonth, endOfMonth, 'day', '[]')) {
          const daysUntil = endDate.diff(currentDate, 'days');
          if (daysUntil >= 0) {
            events.push({
              id: `period-end-${period.periodNumber}`,
              title: `Reporting Period ${period.periodNumber} Ends`,
              date: endDate.toDate(),
              type: 'period-end',
              periodNumber: period.periodNumber,
              daysUntil
            });
          }
        }
      });
    }

    // Sort events by date
    events.sort((a, b) => a.date.getTime() - b.date.getTime());

    if (events.length > 0) {
      setUpcomingEvents(events);
      setShowReminder(true);
    }
  };

  const handleDismiss = () => {
    setShowReminder(false);
    // Mark this month as shown
    const currentMonth = moment().format('YYYY-MM');
    localStorage.setItem('lastReminderMonth', currentMonth);
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'iep-due':
        return <GraduationCap className="h-4 w-4" />;
      case 'period-start':
        return <Calendar className="h-4 w-4" />;
      case 'period-end':
        return <Clock className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'iep-due':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'period-start':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'period-end':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDaysUntil = (days: number) => {
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `${days} days`;
  };

  return (
    <AlertDialog open={showReminder} onOpenChange={setShowReminder}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Monthly Reminders
          </AlertDialogTitle>
          <AlertDialogDescription>
            You have {upcomingEvents.length} upcoming event{upcomingEvents.length !== 1 ? 's' : ''} this month:
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 max-h-64 overflow-y-auto">
          {upcomingEvents.map((event) => (
            <Card key={event.id} className="border border-gray-200">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 flex-1">
                    <div className={`p-1 rounded-full ${getEventColor(event.type)}`}>
                      {getEventIcon(event.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {event.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {moment(event.date).format('MMM D, YYYY')}
                      </p>
                      {event.studentName && (
                        <p className="text-xs text-gray-600 mt-1">
                          Student: {event.studentName}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`text-xs whitespace-nowrap ${
                      event.daysUntil <= 7 ? 'border-red-300 text-red-700' : 'border-gray-300 text-gray-700'
                    }`}
                  >
                    {formatDaysUntil(event.daysUntil)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <AlertDialogFooter>
          <AlertDialogAction onClick={handleDismiss}>
            Got it, thanks!
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}