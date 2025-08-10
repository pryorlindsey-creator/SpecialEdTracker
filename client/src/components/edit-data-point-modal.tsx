import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const editDataPointSchema = z.object({
  date: z.string().min(1, "Date is required"),
  progressValue: z.string().min(1, "Progress value is required"),
  durationUnit: z.string().optional(),
  levelOfSupport: z.array(z.string()).optional(),
  anecdotalInfo: z.string().optional(),
  numerator: z.string().optional(),
  denominator: z.string().optional(),
});

type EditDataPointFormData = z.infer<typeof editDataPointSchema>;

interface DataPoint {
  id: number;
  goalId: number;
  goalTitle: string;
  date: string;
  progressValue: string;
  progressFormat: 'percentage' | 'frequency' | 'duration';
  numerator?: number;
  denominator?: number;
  durationUnit?: string;
  levelOfSupport?: string;
  anecdotalInfo?: string;
  dataCollectionType?: string;
}

interface EditDataPointModalProps {
  dataPoint: DataPoint;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const supportLevels = [
  "independent",
  "verbal",
  "visual",
  "written",
  "adult-model-of-task",
  "self-correction",
  "gesture"
];

const supportLevelLabels: Record<string, string> = {
  "independent": "Independent",
  "verbal": "Verbal",
  "visual": "Visual",
  "written": "Written",
  "adult-model-of-task": "Adult Model of Task",
  "self-correction": "Self-Correction",
  "gesture": "Gesture"
};

export default function EditDataPointModal({ dataPoint, isOpen, onClose, onSuccess }: EditDataPointModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSupport, setSelectedSupport] = useState<string[]>([]);

  const form = useForm<EditDataPointFormData>({
    resolver: zodResolver(editDataPointSchema),
    defaultValues: {
      date: dataPoint.date ? new Date(dataPoint.date).toISOString().split('T')[0] : '',
      progressValue: dataPoint.progressValue || '',
      durationUnit: dataPoint.durationUnit || 'minutes',
      levelOfSupport: [],
      anecdotalInfo: dataPoint.anecdotalInfo || '',
      numerator: dataPoint.numerator?.toString() || '',
      denominator: dataPoint.denominator?.toString() || '',
    },
  });

  // Parse level of support when component mounts or dataPoint changes
  useEffect(() => {
    if (dataPoint.levelOfSupport) {
      try {
        const parsed = JSON.parse(dataPoint.levelOfSupport);
        const supportArray = Array.isArray(parsed) ? parsed : [parsed];
        setSelectedSupport(supportArray);
        form.setValue('levelOfSupport', supportArray);
      } catch {
        // If not JSON, treat as single value
        const singleSupport = [dataPoint.levelOfSupport];
        setSelectedSupport(singleSupport);
        form.setValue('levelOfSupport', singleSupport);
      }
    }
  }, [dataPoint, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: EditDataPointFormData) => {
      const updateData = {
        date: data.date,
        progressValue: data.progressValue,
        durationUnit: data.durationUnit,
        levelOfSupport: JSON.stringify(selectedSupport),
        anecdotalInfo: data.anecdotalInfo,
        numerator: data.numerator ? parseInt(data.numerator) : null,
        denominator: data.denominator ? parseInt(data.denominator) : null,
      };

      return apiRequest('PATCH', `/api/data-points/${dataPoint.id}`, updateData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Data point updated successfully!",
      });
      
      // Invalidate and refetch relevant queries - use studentId from the data point
      queryClient.invalidateQueries({ queryKey: [`/api/students`] });
      queryClient.invalidateQueries({ queryKey: [`/api/goals/${dataPoint.goalId}/data-points`] });
      
      onSuccess?.();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update data point",
        variant: "destructive",
      });
    },
  });

  const handleSupportChange = (supportLevel: string, checked: boolean) => {
    const newSupport = checked 
      ? [...selectedSupport, supportLevel]
      : selectedSupport.filter(s => s !== supportLevel);
    
    setSelectedSupport(newSupport);
    form.setValue('levelOfSupport', newSupport);
  };

  const onSubmit = (data: EditDataPointFormData) => {
    updateMutation.mutate(data);
  };

  // Generate options for minutes dropdown (duration goals)
  const minutesOptions: { value: string; label: string }[] = [];
  for (let min = 0; min < 60; min++) {
    for (let sec = (min === 0 ? 1 : 1); sec < 60; sec++) {
      const decimalValue = min + (sec / 100);
      const label = `${min}m ${sec}s`;
      minutesOptions.push({ value: decimalValue.toFixed(2), label });
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Data Point</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Goal: {dataPoint.goalTitle}
          </p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Date Field */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Progress Value - Dynamic based on data collection type */}
            {dataPoint.progressFormat === 'duration' ? (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="progressValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration Value</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select duration..." />
                          </SelectTrigger>
                          <SelectContent className="max-h-[200px]">
                            {minutesOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label} ({option.value})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="durationUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time Unit</FormLabel>
                      <FormControl>
                        <select 
                          {...field} 
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="seconds">Seconds</option>
                          <option value="minutes">Minutes</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : dataPoint.progressFormat === 'frequency' ? (
              <FormField
                control={form.control}
                name="progressValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequency Count</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        step="1"
                        placeholder="Enter frequency count..." 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="progressValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Percentage Value</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          max="100" 
                          step="0.01"
                          placeholder="Enter percentage..." 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="numerator"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Correct Trials</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0"
                            placeholder="Correct..."
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="denominator"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Trials</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1"
                            placeholder="Total..."
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Level of Support */}
            <div className="space-y-3">
              <FormLabel>Level of Support</FormLabel>
              <div className="grid grid-cols-2 gap-2">
                {supportLevels.map((level) => (
                  <div key={level} className="flex items-center space-x-2">
                    <Checkbox
                      id={level}
                      checked={selectedSupport.includes(level)}
                      onCheckedChange={(checked) => handleSupportChange(level, checked as boolean)}
                    />
                    <label
                      htmlFor={level}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {supportLevelLabels[level]}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Anecdotal Info */}
            <FormField
              control={form.control}
              name="anecdotalInfo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional notes about this data point..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Updating..." : "Update Data Point"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}