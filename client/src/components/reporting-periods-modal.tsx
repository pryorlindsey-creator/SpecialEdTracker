import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Plus, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ReportingPeriod {
  periodNumber: number;
  startDate: string;
  endDate: string;
}

interface ReportingPeriodsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (periods: ReportingPeriod[], periodLength: string) => void;
}

export default function ReportingPeriodsModal({ isOpen, onClose, onSave }: ReportingPeriodsModalProps) {
  const { toast } = useToast();
  const [periodLength, setPeriodLength] = useState<string>("");
  const [periods, setPeriods] = useState<ReportingPeriod[]>([]);

  const periodOptions = [
    { value: "4.5-weeks", label: "4.5 weeks (8 reporting periods)", count: 8 },
    { value: "3-weeks", label: "3 weeks (12 reporting periods)", count: 12 }
  ];

  const handlePeriodLengthChange = (value: string) => {
    setPeriodLength(value);
    const selectedOption = periodOptions.find(opt => opt.value === value);
    if (selectedOption) {
      const newPeriods: ReportingPeriod[] = Array.from({ length: selectedOption.count }, (_, index) => ({
        periodNumber: index + 1,
        startDate: "",
        endDate: ""
      }));
      setPeriods(newPeriods);
    }
  };

  const updatePeriod = (index: number, field: 'startDate' | 'endDate', value: string) => {
    const updatedPeriods = [...periods];
    updatedPeriods[index] = { ...updatedPeriods[index], [field]: value };
    setPeriods(updatedPeriods);
  };

  const handleSave = async () => {
    if (!periodLength) {
      toast({
        title: "Error",
        description: "Please select a reporting period length.",
        variant: "destructive",
      });
      return;
    }

    const incompletePeriods = periods.filter(p => !p.startDate || !p.endDate);
    if (incompletePeriods.length > 0) {
      toast({
        title: "Error",
        description: "Please fill in all start and end dates for all reporting periods.",
        variant: "destructive",
      });
      return;
    }

    // Validate date order
    for (const period of periods) {
      if (new Date(period.startDate) >= new Date(period.endDate)) {
        toast({
          title: "Error",
          description: `Period ${period.periodNumber}: Start date must be before end date.`,
          variant: "destructive",
        });
        return;
      }
    }

    try {
      await onSave(periods, periodLength);
      toast({
        title: "Success",
        description: "Reporting periods have been saved successfully.",
      });
      
      // Trigger a page refresh to update the calendar
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save reporting periods. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleReset = () => {
    setPeriodLength("");
    setPeriods([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Configure Reporting Periods
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Period Length Selection */}
          <div className="space-y-2">
            <Label htmlFor="period-length">Reporting Period Length</Label>
            <Select value={periodLength} onValueChange={handlePeriodLengthChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select reporting period length" />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Input Fields */}
          {periods.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Reporting Period Dates</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {periods.map((period, index) => (
                  <Card key={period.periodNumber} className="p-4">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Period {period.periodNumber}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label htmlFor={`start-${index}`} className="text-xs">Start Date</Label>
                        <Input
                          id={`start-${index}`}
                          type="date"
                          value={period.startDate}
                          onChange={(e) => updatePeriod(index, 'startDate', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`end-${index}`} className="text-xs">End Date</Label>
                        <Input
                          id={`end-${index}`}
                          type="date"
                          value={period.endDate}
                          onChange={(e) => updatePeriod(index, 'endDate', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={handleReset}>
              Reset
            </Button>
            <div className="space-x-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={periods.length === 0}>
                <Save className="h-4 w-4 mr-2" />
                Save Reporting Periods
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ReportingPeriodsButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  const handleSavePeriods = async (periods: any[], periodLength: string) => {
    const dataToSave = {
      periodLength,
      periods,
    };
    
    console.log("Saving reporting periods to database:", dataToSave);
    
    try {
      const response = await fetch('/api/reporting-periods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSave),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save: ${response.statusText}`);
      }
      
      console.log("Successfully saved reporting periods to database");
    } catch (error) {
      console.error("Error saving reporting periods:", error);
      throw error;
    }
  };

  return (
    <>
      <Button 
        variant="outline" 
        onClick={() => setIsModalOpen(true)}
        className="w-full justify-start"
      >
        <Calendar className="h-4 w-4 mr-2" />
        Configure Reporting Periods
      </Button>
      
      <ReportingPeriodsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSavePeriods}
      />
    </>
  );
}