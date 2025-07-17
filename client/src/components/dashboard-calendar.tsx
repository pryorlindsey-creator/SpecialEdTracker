import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarIcon, GraduationCap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

const localizer = momentLocalizer(moment);

interface Student {
  id: number;
  name: string;
  iepDueDate: string | null;
  grade?: string;
}

interface CalendarEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  resource: {
    studentId: number;
    studentName: string;
    type: 'iep-due';
  };
}

export default function DashboardCalendar() {
  const [, navigate] = useLocation();

  const { data: students, isLoading } = useQuery({
    queryKey: ["/api/students"],
  });

  // Convert student IEP due dates to calendar events
  const events: CalendarEvent[] = (students as Student[] || [])
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

  const handleSelectEvent = (event: CalendarEvent) => {
    navigate(`/students/${event.resource.studentId}`);
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    return {
      style: {
        backgroundColor: '#3b82f6',
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
          Upcoming IEP due dates for all students
        </p>
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
                  <GraduationCap className="h-3 w-3 mr-1" />
                  <span className="truncate">{event.resource.studentName}</span>
                </div>
              ),
            }}
          />
        </div>
        {events.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <CalendarIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>No IEP due dates scheduled</p>
            <p className="text-sm">Add IEP due dates to students to see them here</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}