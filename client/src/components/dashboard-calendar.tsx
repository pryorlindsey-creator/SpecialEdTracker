import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarIcon, GraduationCap, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";

const localizer = momentLocalizer(moment);

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

interface CalendarEvent {
  id: number | string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    studentId?: number;
    studentName?: string;
    periodNumber?: number;
    type: 'iep-due' | 'period-start' | 'period-end';
  };
}

export default function DashboardCalendar() {
  const [, navigate] = useLocation();
  const [reportingData, setReportingData] = useState<ReportingPeriodsData | null>(null);

  const { data: students, isLoading } = useQuery({
    queryKey: ["/api/students"],
  });

  // Load reporting periods from localStorage
  useEffect(() => {
    const savedData = localStorage.getItem('reportingPeriods');
    if (savedData) {
      try {
        setReportingData(JSON.parse(savedData));
      } catch (error) {
        console.error('Error parsing reporting periods data:', error);
      }
    }
  }, []);

  // Convert student IEP due dates to calendar events
  const iepEvents: CalendarEvent[] = (students as Student[] || [])
    .filter(student => student.iepDueDate)
    .map(student => ({
      id: student.id,
      title: `${student.name} - IEP Due`,
      start: new Date(student.iepDueDate!),
      end: new Date(student.iepDueDate!),
      resource: {
        studentId: student.id,
        studentName: student.name,
        type: 'iep-due' as const,
      },
    }));

  // Convert reporting periods to calendar events
  const reportingEvents: CalendarEvent[] = reportingData ? reportingData.periods.flatMap(period => [
    {
      id: `period-${period.periodNumber}-start`,
      title: `Period ${period.periodNumber} Starts`,
      start: new Date(period.startDate),
      end: new Date(period.startDate),
      resource: {
        periodNumber: period.periodNumber,
        type: 'period-start' as const,
      },
    },
    {
      id: `period-${period.periodNumber}-end`,
      title: `Period ${period.periodNumber} Ends`,
      start: new Date(period.endDate),
      end: new Date(period.endDate),
      resource: {
        periodNumber: period.periodNumber,
        type: 'period-end' as const,
      },
    },
  ]) : [];

  // Combine all events
  const events: CalendarEvent[] = [...iepEvents, ...reportingEvents];

  const handleSelectEvent = (event: CalendarEvent) => {
    if (event.resource.type === 'iep-due' && event.resource.studentId) {
      navigate(`/students/${event.resource.studentId}`);
    }
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = '#3b82f6'; // Default blue for IEP events
    
    if (event.resource.type === 'period-start') {
      backgroundColor = '#10b981'; // Green for period starts
    } else if (event.resource.type === 'period-end') {
      backgroundColor = '#f59e0b'; // Orange for period ends
    }
    
    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block',
      },
    };
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CalendarIcon className="h-5 w-5 mr-2" />
            IEP Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <CalendarIcon className="h-5 w-5 mr-2" />
          IEP Calendar
        </CardTitle>
        <p className="text-sm text-gray-600">
          IEP due dates and reporting periods
        </p>
        {reportingData && (
          <div className="flex flex-wrap gap-2 mt-2">
            <div className="flex items-center text-xs">
              <div className="w-3 h-3 bg-blue-500 rounded mr-1"></div>
              <span>IEP Due Dates</span>
            </div>
            <div className="flex items-center text-xs">
              <div className="w-3 h-3 bg-green-500 rounded mr-1"></div>
              <span>Period Starts</span>
            </div>
            <div className="flex items-center text-xs">
              <div className="w-3 h-3 bg-orange-500 rounded mr-1"></div>
              <span>Period Ends</span>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div style={{ height: '500px' }}>
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            onSelectEvent={handleSelectEvent}
            eventPropGetter={eventStyleGetter}
            views={['month', 'agenda']}
            defaultView="month"
            popup
            messages={{
              next: "Next",
              previous: "Previous", 
              today: "Today",
              month: "Month",
              agenda: "Agenda",
              noEventsInRange: "No IEP due dates in this range",
            }}
            components={{
              event: ({ event }) => (
                <div className="flex items-center text-xs">
                  {event.resource.type === 'iep-due' ? (
                    <>
                      <GraduationCap className="h-3 w-3 mr-1" />
                      <span className="truncate">{event.resource.studentName}</span>
                    </>
                  ) : (
                    <>
                      <Clock className="h-3 w-3 mr-1" />
                      <span className="truncate">P{event.resource.periodNumber}</span>
                    </>
                  )}
                </div>
              ),
            }}
          />
        </div>
        {events.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <CalendarIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>No events scheduled</p>
            <p className="text-sm">Add IEP due dates to students and configure reporting periods to see them here</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}