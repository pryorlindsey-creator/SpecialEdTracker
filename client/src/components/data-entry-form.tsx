import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";

const dataEntrySchema = z.object({
  goalId: z.number().min(1, "Please select a goal"),
  date: z.string().min(1, "Date is required"),
  progressFormat: z.enum(["percentage", "fraction", "duration", "frequency"]),
  progressValue: z.number().min(0, "Value must be positive"),
  numerator: z.number().optional(),
  denominator: z.number().optional(),
  durationUnit: z.enum(["seconds", "minutes"]).optional(),
  levelOfSupport: z.array(z.string()).min(1, "At least one level of support is required"),
  anecdotalInfo: z.string().optional(),
}).refine((data) => {
  // For duration goals, durationUnit is required
  if (data.progressFormat === "duration" && (!data.durationUnit || data.durationUnit.trim() === "")) {
    return false;
  }
  return true;
}, {
  message: "Duration unit is required for duration goals",
  path: ["durationUnit"],
});

type DataEntryFormData = z.infer<typeof dataEntrySchema>;

interface Goal {
  id: number;
  title: string;
  description: string;
  dataCollectionType: string;
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
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  // Find the selected goal to get its data collection type
  useEffect(() => {
    if (selectedGoalId) {
      const goal = goals.find(g => g.id === selectedGoalId);
      setSelectedGoal(goal || null);
    }
  }, [selectedGoalId, goals]);

  const form = useForm<DataEntryFormData>({
    resolver: zodResolver(dataEntrySchema),
    defaultValues: {
      goalId: selectedGoalId || 0,
      date: new Date().toISOString().split('T')[0], // Today's date
      progressFormat: selectedGoal?.dataCollectionType === "duration" ? "duration" : 
                     selectedGoal?.dataCollectionType === "frequency" ? "frequency" : "percentage",
      progressValue: 0,
      durationUnit: "minutes", // Default to minutes for duration
      levelOfSupport: [],
      anecdotalInfo: "",
    },
  });

  // Watch for goal changes to update progress input type and selected goal
  const selectedGoalIdValue = form.watch("goalId");
  
  useEffect(() => {
    if (selectedGoalIdValue > 0) {
      const goal = goals.find(g => g.id === selectedGoalIdValue);
      setSelectedGoal(goal || null);
      
      // Update progress format based on goal's data collection type
      if (goal?.dataCollectionType) {
        const format = goal.dataCollectionType === "duration" ? "duration" : 
                      goal.dataCollectionType === "frequency" ? "frequency" : "percentage";
        form.setValue("progressFormat", format as any);
      }
    }
  }, [selectedGoalIdValue, goals, form]);

  const addDataPointMutation = useMutation({
    mutationFn: async (data: DataEntryFormData) => {
      console.log("=== API REQUEST PREPARATION ===");
      console.log("Submitting data point data:", data);
      
      // Convert the date string to ISO format for the server
      const payload = {
        ...data,
        date: data.date, // Keep as string, server will parse it
      };
      
      console.log("Final payload being sent:", payload);
      console.log("API endpoint:", `/api/goals/${data.goalId}/data-points`);
      console.log("About to make API request...");
      
      const result = await apiRequest("POST", `/api/goals/${data.goalId}/data-points`, payload);
      console.log("API request successful, result:", result);
      return result;
    },
    onSuccess: () => {
      const goalId = form.getValues().goalId;
      
      // Clear all cache to force immediate refresh of all data
      queryClient.clear();
      
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
      console.error("Full error object:", error);
      
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
      
      // Show detailed error message for debugging
      const errorDetails = error.message || "Unknown error";
      console.error("Detailed error for user:", errorDetails);
      
      toast({
        title: "Error Adding Data Point",
        description: `Failed to add data point: ${errorDetails}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: DataEntryFormData) => {
    console.log("=== DATA ENTRY FORM SUBMISSION ===");
    console.log("Form submitted with data:", data);
    console.log("Form validation errors:", form.formState.errors);
    console.log("Form is valid:", form.formState.isValid);
    console.log("Selected goal:", selectedGoal);
    console.log("Progress input type:", progressInputType);
    
    // Check if form has validation errors
    if (Object.keys(form.formState.errors).length > 0) {
      console.error("Form has validation errors - submission blocked:", form.formState.errors);
      return;
    }
    
    let finalData = { ...data };

    // Convert fraction to percentage if needed
    if (progressInputType === "fraction" && data.numerator && data.denominator) {
      finalData.progressValue = (data.numerator / data.denominator) * 100;
      console.log("Converted fraction to percentage:", finalData.progressValue);
    }

    console.log("Final data being sent to API:", finalData);
    console.log("API endpoint will be:", `/api/goals/${data.goalId}/data-points`);
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

          {/* Progress Value - Dynamic based on goal's data collection type */}
          <div className="space-y-4">
            <FormLabel>
              {selectedGoal?.dataCollectionType === "duration" ? "Duration" :
               selectedGoal?.dataCollectionType === "frequency" ? "Frequency Count" :
               "Progress Value"}
            </FormLabel>
            
            {selectedGoal?.dataCollectionType === "duration" ? (
              /* Duration Input with Time Unit Dropdown */
              <div className="flex space-x-3 items-end">
                <div className="flex-1">
                  <label className="block text-xs text-gray-600 mb-1">Time Value</label>
                  <FormField
                    control={form.control}
                    name="progressValue"
                    render={({ field }) => (
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="5"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    )}
                  />
                </div>
                
                <div className="flex-1">
                  <label className="block text-xs text-gray-600 mb-1">Time Unit</label>
                  <FormField
                    control={form.control}
                    name="durationUnit"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="seconds">Seconds</SelectItem>
                          <SelectItem value="minutes">Minutes</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
            ) : selectedGoal?.dataCollectionType === "frequency" ? (
              /* Frequency Count Input */
              <div className="flex-1">
                <label className="block text-xs text-gray-600 mb-1">Number of Occurrences</label>
                <FormField
                  control={form.control}
                  name="progressValue"
                  render={({ field }) => (
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="3"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  )}
                />
              </div>
            ) : (
              /* Default Percentage/Fraction Input */
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
            )}
          </div>

          {/* Level of Support */}
          <FormField
            control={form.control}
            name="levelOfSupport"
            render={({ field }) => {
              const supportOptions = [
                { id: "independent", label: "Independent" },
                { id: "verbal-prompt", label: "Verbal Prompt" },
                { id: "visual-prompt", label: "Visual Prompt" },
                { id: "physical-prompt", label: "Physical Prompt" },
                { id: "hand-over-hand", label: "Hand-over-Hand" },
              ];

              return (
                <FormItem>
                  <FormLabel>Level of Support (Select all that apply)</FormLabel>
                  <div className="space-y-3 pt-2">
                    {supportOptions.map((option) => (
                      <div key={option.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={option.id}
                          checked={field.value?.includes(option.id) || false}
                          onCheckedChange={(checked) => {
                            const currentValues = field.value || [];
                            if (checked) {
                              field.onChange([...currentValues, option.id]);
                            } else {
                              field.onChange(currentValues.filter((value) => value !== option.id));
                            }
                          }}
                        />
                        <label
                          htmlFor={option.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {option.label}
                        </label>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              );
            }}
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
