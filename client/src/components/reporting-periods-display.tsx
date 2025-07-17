import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock } from "lucide-react";
import { format } from "date-fns";

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

export default function ReportingPeriodsDisplay() {
  const [reportingData, setReportingData] = useState<ReportingPeriodsData | null>(null);

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

  if (!reportingData) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">No reporting periods configured</p>
          <p className="text-sm text-gray-500">Use the Configure Reporting Periods button to set up your school's schedule</p>
        </CardContent>
      </Card>
    );
  }

  const getCurrentPeriod = () => {
    const today = new Date();
    return reportingData.periods.find(period => {
      const start = new Date(period.startDate);
      const end = new Date(period.endDate);
      return today >= start && today <= end;
    });
  };

  const currentPeriod = getCurrentPeriod();
  const periodLengthLabel = reportingData.periodLength === "4.5-weeks" ? "4.5 weeks" : "3 weeks";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Reporting Periods
          </div>
          <Badge variant="outline">
            {periodLengthLabel} ({reportingData.periods.length} periods)
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentPeriod && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <span className="font-medium text-blue-900">Current Period {currentPeriod.periodNumber}</span>
              <Badge className="bg-blue-500">Active</Badge>
            </div>
            <p className="text-sm text-blue-700 mt-1">
              {format(new Date(currentPeriod.startDate), "MMM d")} - {format(new Date(currentPeriod.endDate), "MMM d, yyyy")}
            </p>
          </div>
        )}
        
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">All Periods</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
            {reportingData.periods.map((period) => {
              const isActive = currentPeriod?.periodNumber === period.periodNumber;
              const isPast = new Date() > new Date(period.endDate);
              
              return (
                <div
                  key={period.periodNumber}
                  className={`p-2 rounded border text-sm ${
                    isActive 
                      ? 'bg-blue-50 border-blue-200 text-blue-900'
                      : isPast
                      ? 'bg-gray-50 border-gray-200 text-gray-600'
                      : 'bg-green-50 border-green-200 text-green-900'
                  }`}
                >
                  <div className="font-medium">Period {period.periodNumber}</div>
                  <div className="text-xs">
                    {format(new Date(period.startDate), "MMM d")} - {format(new Date(period.endDate), "MMM d")}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="text-xs text-gray-500 pt-2 border-t">
          Configured on {format(new Date(reportingData.savedAt), "MMM d, yyyy 'at' h:mm a")}
        </div>
      </CardContent>
    </Card>
  );
}