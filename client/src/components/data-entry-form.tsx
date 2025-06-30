import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";

const dataEntrySchema = z.object({
  goalId: z.number().min(1, "Please select a goal"),
  date: z.string().min(1, "Date is required"),
  progressFormat: z.enum(["percentage", "fraction"]),
  progressValue: z.number().min(0).max(100, "Progress must be between 0 and 100"),
  numerator: z.number().optional(),
  denominator: z.number().optional(),
  levelOfSupport: z.string().optional(),
  anecdotalInfo: z.string().optional(),
});

type DataEntryFormData = z.infer<typeof dataEntrySchema>;

interface Goal {
  id: number;
  title: string;
  description: string;
}

interface DataEntryFormProps {
  studentId: number;
  goals: Goal[];
  selectedGoalId?: number;
  onSuccess?: () => void;
}

export default function DataEntryForm({ studentId, goals, selectedGoalId, onSuccess }: DataEntryFormProps) {
  const { toast } = useToast();
  const [progressInputType, setProgressInputType] = useState<"percentage" | "fraction">("percentage");

  const form = useForm<DataEntryFormData>({
    resolver: zodResolver(dataEntrySchema),
    defaultValues: {
      goalId: selectedGoalId || 0,
      date: new Date().toISOString().split('T')[0], // Today's date
      progressFormat: "percentage",
      progressValue: 0,
      levelOfSupport: "",
      anecdotalInfo: "",
    },
  });

  const addDataPointMutation = useMutation({
    mutationFn: async (data: DataEntryFormData) => {
      console.log("Submitting data point data:", data);
      
      // Convert the date string to ISO format for the server
      const payload = {
        ...data,
        date: data.date, // Keep as string, server will parse it
      };
      
      console.log("Final payload:", payload);
      console.log("API endpoint:", `/api/goals/${data.goalId}/data-points`);
      
      await apiRequest("POST", `/api/goals/${data.goalId}/data-points`, payload);
    },
    onSuccess: () => {
      // Invalidate all related caches to refresh dashboard and progress data
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      queryClient.invalidateQueries({ queryKey: [`/api/goals/${form.getValues().goalId}/data-points`] });
      queryClient.invalidateQueries({ queryKey: [`/api/goals/${form.getValues().goalId}`] });
      
      toast({
        title: "Success",
        description: "Data point added successfully!",
      });
      form.reset();
      onSuccess?.();
    },
    onError: (error) => {
      console.error("Error adding data point:", error);
      console.error("Error message:", error.message);
      
      // Handle unauthorized errors
      if (error.message.includes("401") || error.message.includes("Unauthorized")) {
        toast({
          title: "Session Expired",
          description: "Please log in again to continue.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 2000);
        return;
      }
      
      toast({
        title: "Error",
        description: `Failed to add data point: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: DataEntryFormData) => {
    console.log("Form submitted with data:", data);
    console.log("Form validation errors:", form.formState.errors);
    
    let finalData = { ...data };

    // Convert fraction to percentage if needed
    if (progressInputType === "fraction" && data.numerator && data.denominator) {
      finalData.progressValue = (data.numerator / data.denominator) * 100;
      console.log("Converted fraction to percentage:", finalData.progressValue);
    }

    console.log("Final data being sent:", finalData);
    addDataPointMutation.mutate(finalData);
  };

  const handleFractionChange = (numerator: string, denominator: string) => {
    const num = parseFloat(numerator) || 0;
    const den = parseFloat(denominator) || 1;
    const percentage = (num / den) * 100;
    
    form.setValue("numerator", num);
    form.setValue("denominator", den);
    form.setValue("progressValue", Math.min(100, Math.max(0, percentage)));
  };

  if (!goals || goals.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 mb-4">No goals available for data entry.</p>
        <p className="text-sm text-gray-500">Please add some goals first before entering data.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h3 className="text-xl font-semibold text-gray-900 mb-6">Add New Data Point</h3>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Goal Selection */}
          <FormField
            control={form.control}
            name="goalId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Select Goal</FormLabel>
                <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a goal..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {goals.map((goal) => (
                      <SelectItem key={goal.id} value={goal.id.toString()}>
                        {goal.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Date */}
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

          {/* Progress Value */}
          <div className="space-y-4">
            <FormLabel>Progress Value</FormLabel>
            <div className="flex space-x-4 items-end">
              <div className="flex-1">
                <label className="block text-xs text-gray-600 mb-1">Percentage</label>
                <FormField
                  control={form.control}
                  name="progressValue"
                  render={({ field }) => (
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        placeholder="85"
                        {...field}
                        onChange={(e) => {
                          field.onChange(parseFloat(e.target.value) || 0);
                          setProgressInputType("percentage");
                        }}
                        className="pr-8"
                      />
                      <span className="absolute right-3 top-3 text-gray-500">%</span>
                    </div>
                  )}
                />
              </div>
              
              <div className="flex items-center justify-center px-4 pb-3">
                <span className="text-gray-400">OR</span>
              </div>
              
              <div className="flex-1">
                <label className="block text-xs text-gray-600 mb-1">Attempts Format</label>
                <div className="flex space-x-1">
                  <Input
                    type="number"
                    min="0"
                    placeholder="8"
                    onChange={(e) => {
                      setProgressInputType("fraction");
                      handleFractionChange(e.target.value, form.getValues("denominator")?.toString() || "10");
                    }}
                    className="w-20"
                  />
                  <span className="self-center text-gray-500">/</span>
                  <Input
                    type="number"
                    min="1"
                    placeholder="10"
                    onChange={(e) => {
                      setProgressInputType("fraction");
                      handleFractionChange(form.getValues("numerator")?.toString() || "0", e.target.value);
                    }}
                    className="w-20"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Level of Support */}
          <FormField
            control={form.control}
            name="levelOfSupport"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Level of Support</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select support level..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="independent">Independent</SelectItem>
                    <SelectItem value="verbal-prompt">Verbal Prompt</SelectItem>
                    <SelectItem value="visual-prompt">Visual Prompt</SelectItem>
                    <SelectItem value="physical-prompt">Physical Prompt</SelectItem>
                    <SelectItem value="hand-over-hand">Hand-over-Hand</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Anecdotal Information */}
          <FormField
            control={form.control}
            name="anecdotalInfo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Anecdotal Information</FormLabel>
                <FormControl>
                  <Textarea
                    rows={4}
                    placeholder="Additional notes about the student's performance, behavior, or any relevant observations..."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4 pt-6">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => form.reset()}
              disabled={addDataPointMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={addDataPointMutation.isPending}
            >
              {addDataPointMutation.isPending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Data Point
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
