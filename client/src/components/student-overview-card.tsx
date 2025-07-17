import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, ArrowRight, Clock } from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";

interface Student {
  id: number;
  name: string;
  grade?: string;
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  totalDataPoints: number;
  lastDataPoint?: {
    date: string;
    progressValue: string;
  };
}

interface StudentOverviewCardProps {
  student: Student;
}

export default function StudentOverviewCard({ student }: StudentOverviewCardProps) {
  const [, navigate] = useLocation();

  const lastUpdatedText = student.lastDataPoint 
    ? format(new Date(student.lastDataPoint.date), "MMM d")
    : "No data";

  const recentActivityText = student.lastDataPoint 
    ? format(new Date(student.lastDataPoint.date), "h:mm a")
    : "No activity";

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer group">
      <CardContent 
        className="p-6"
        onClick={() => {
          console.log(`[NAVIGATION] Clicking on student card: ${student.name} (ID: ${student.id})`);
          console.log(`[NAVIGATION] Navigating to: /students/${student.id}`);
          navigate(`/students/${student.id}`);
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900 group-hover:text-primary transition-colors">
            {student.name}
          </h3>
          <div className="p-2 bg-blue-100 rounded-lg">
            <GraduationCap className="h-5 w-5 text-primary" />
          </div>
        </div>
        
        {/* Student Stats */}
        <div className="space-y-3 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm">Active Goals</span>
            <span className="font-medium text-gray-900">{student.activeGoals || 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm">Total Data Points</span>
            <span className="font-medium text-gray-900">{student.totalDataPoints || 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm">Last Updated</span>
            <span className="font-medium text-gray-900">{lastUpdatedText}</span>
          </div>
        </div>

        {/* Recent Activity Indicator */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center text-sm text-gray-600">
            <Clock className="h-4 w-4 text-gray-400 mr-1" />
            <span>{recentActivityText}</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            className="text-primary hover:text-blue-700 font-medium p-0"
            onClick={(e) => {
              e.stopPropagation();
              console.log(`[NAVIGATION] Clicking View Details button for: ${student.name} (ID: ${student.id})`);
              console.log(`[NAVIGATION] Navigating to: /students/${student.id}`);
              navigate(`/students/${student.id}`);
            }}
          >
            View Details <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
