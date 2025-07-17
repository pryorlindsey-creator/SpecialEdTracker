import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Edit } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

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
  const [editingPeriod, setEditingPeriod] = useState<ReportingPeriod | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const { toast } = useToast();

  // Load reporting periods from database
  useEffect(() => {
    const fetchReportingPeriods = async () => {
      try {
        const response = await fetch('/api/reporting-periods');
        if (response.ok) {
          const data = await response.json();
          if (data.periods && data.periods.length > 0) {
            setReportingData({
              periodLength: data.periodLength,
              periods: data.periods,
              savedAt: new Date().toISOString()
            });
          }
        }
      } catch (error) {
        console.error('Error fetching reporting periods:', error);
      }
    };

    fetchReportingPeriods();
  }, []);

  const handleEditPeriod = (period: ReportingPeriod) => {
    setEditingPeriod(period);
    setEditStartDate(period.startDate);
    setEditEndDate(period.endDate);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingPeriod || !reportingData) return;

    if (!editStartDate || !editEndDate) {
      toast({
        title: "Error",
        description: "Please fill in both start and end dates.",
        variant: "destructive",
      });
      return;
    }

    if (new Date(editStartDate) >= new Date(editEndDate)) {
      toast({
        title: "Error",
        description: "Start date must be before end date.",
        variant: "destructive",
      });
      return;
    }

    const updatedPeriods = reportingData.periods.map(period =>
      period.periodNumber === editingPeriod.periodNumber
        ? { ...period, startDate: editStartDate, endDate: editEndDate }
        : period
    );

    // Save to database
    try {
      const response = await fetch('/api/reporting-periods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          periods: updatedPeriods,
          periodLength: reportingData.periodLength
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save to database');
      }

      const updatedData = {
        ...reportingData,
        periods: updatedPeriods,
        savedAt: new Date().toISOString()
      };
      setReportingData(updatedData);
    } catch (error) {
      console.error('Error saving updated period:', error);
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      });
      return;
    }
    setIsEditModalOpen(false);
    setEditingPeriod(null);

    toast({
      title: "Success",
      description: `Period ${editingPeriod.periodNumber} has been updated successfully.`,
    });

    // Trigger a page refresh to update the calendar
    window.location.reload();
  };

  const handleCancelEdit = () => {
    setIsEditModalOpen(false);
    setEditingPeriod(null);
    setEditStartDate("");
    setEditEndDate("");
  };

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
                <Button
                  key={period.periodNumber}
                  variant="ghost"
                  onClick={() => handleEditPeriod(period)}
                  className={`p-2 h-auto text-left justify-start hover:opacity-80 ${
                    isActive 
                      ? 'bg-blue-50 border-blue-200 text-blue-900 hover:bg-blue-100'
                      : isPast
                      ? 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                      : 'bg-green-50 border-green-200 text-green-900 hover:bg-green-100'
                  }`}
                >
                  <div className="w-full">
                    <div className="font-medium text-sm flex items-center justify-between">
                      Period {period.periodNumber}
                      <Edit className="h-3 w-3" />
                    </div>
                    <div className="text-xs">
                      {format(new Date(period.startDate), "MMM d")} - {format(new Date(period.endDate), "MMM d")}
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        </div>
        
        <div className="text-xs text-gray-500 pt-2 border-t">
          Configured on {format(new Date(reportingData.savedAt), "MMM d, yyyy 'at' h:mm a")}
        </div>
      </CardContent>

      {/* Edit Period Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Edit className="h-4 w-4 mr-2" />
              Edit Period {editingPeriod?.periodNumber}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-start-date">Start Date</Label>
              <Input
                id="edit-start-date"
                type="date"
                value={editStartDate}
                onChange={(e) => setEditStartDate(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-end-date">End Date</Label>
              <Input
                id="edit-end-date"
                type="date"
                value={editEndDate}
                onChange={(e) => setEditEndDate(e.target.value)}
              />
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}