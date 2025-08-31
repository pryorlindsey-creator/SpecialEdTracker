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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Save, Percent } from "lucide-react";

const dataEntrySchema = z.object({
  goalId: z.number().min(1, "Please select a goal"),
  objectiveId: z.number().optional(),
  date: z.string().min(1, "Date is required"),
  progressFormat: z.enum(["percentage", "fraction", "duration", "frequency"]),
  progressValue: z.number().min(0, "Value must be positive"),
  numerator: z.number().optional(),
  denominator: z.number().optional(),
  // noResponseCount: z.number().min(0).optional(), // pending database migration
  durationUnit: z.enum(["seconds", "minutes"]).optional(),
  levelOfSupport: z.array(z.string()).min(1, "At least one level of support is required"),
  anecdotalInfo: z.string().optional(),
}).refine((data) => {
  // For duration goals, durationUnit is required
  if (data.progressFormat === "duration" && (!data.durationUnit || data.durationUnit.trim() === "")) {
    return false;
  }
  
  // Validate duration values based on unit
  if (data.progressFormat === "duration" && data.durationUnit) {
    if (data.durationUnit === "seconds") {
      // Seconds must be whole numbers 0-59
      if (!Number.isInteger(data.progressValue) || data.progressValue < 0 || data.progressValue > 59) {
        return false;
      }
    } else if (data.durationUnit === "minutes") {
      // Minutes: whole number part 0-59, decimal part between .01-.59 if present
      const wholePart = Math.floor(data.progressValue);
      if (wholePart < 0 || wholePart > 59) {
        return false;
      }
      const decimalPart = Math.round((data.progressValue % 1) * 100) / 100; // Round to avoid floating point precision issues
      if (decimalPart !== 0 && (decimalPart < 0.01 || decimalPart > 0.59)) {
        return false;
      }
    }
  }
  
  return true;
}, {
  message: "Minutes: whole number 0-59, decimal .00 or .01-.59 only (e.g., 5.45 not 5.90)",
  path: ["progressValue"],
});

type DataEntryFormData = z.infer<typeof dataEntrySchema>;

interface Goal {
  id: number;
  title: string;
  description: string;
  dataCollectionType: string;
  levelOfSupport?: string;
  studentId: number;
}

interface Objective {
  id: number;
  goalId: number;
  studentId: number;
  description: string;
  targetCriteria?: string;
  status: string;
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
  const [trialCounter, setTrialCounter] = useState({
    correct: 0,
    total: 0,
    noResponse: 0
  });
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [durationUnit, setDurationUnit] = useState<string>("minutes");
  const [objectives, setObjectives] = useState<Objective[]>([]);

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
      objectiveId: undefined,
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

  // Fetch objectives for the selected goal
  const { data: objectivesData } = useQuery<Objective[]>({
    queryKey: [`/api/goals/${selectedGoalIdValue || selectedGoalId}/objectives`],
    enabled: !!(selectedGoalIdValue || selectedGoalId),
  });

  useEffect(() => {
    if (objectivesData) {
      setObjectives(objectivesData);
    }
  }, [objectivesData]);
  
  useEffect(() => {
    if (selectedGoalIdValue > 0) {
      const goal = goals.find(g => g.id === selectedGoalIdValue);
      setSelectedGoal(goal || null);
      
      // Update progress format based on goal's data collection type
      if (goal?.dataCollectionType) {
        const format = goal.dataCollectionType === "duration" ? "duration" : 
                      goal.dataCollectionType === "frequency" ? "frequency" : "percentage";
        form.setValue("progressFormat", format as any);
        
        // Set default duration unit for duration goals
        if (goal.dataCollectionType === "duration") {
          form.setValue("durationUnit", "minutes");
          setDurationUnit("minutes");
        }
      }
    }
  }, [selectedGoalIdValue, goals, form]);

  const addDataPointMutation = useMutation({
    mutationFn: async (data: DataEntryFormData) => {
      console.log("🔥 === MUTATION FUNCTION CALLED ===");
      console.log("🚀 === FRONTEND DATA SUBMISSION START ===");
      console.log("🚀 Form data being submitted:", data);
      console.log("🚀 Form validation status:", form.formState.isValid);
      console.log("🚀 Form errors (if any):", form.formState.errors);
      
      // Convert the date string to ISO format for the server
      const payload = {
        ...data,
        date: data.date, // Keep as string, server will parse it
      };
      
      console.log("🚀 Final payload being sent to server:", payload);
      console.log("🚀 API endpoint:", `/api/goals/${data.goalId}/data-points`);
      console.log("🚀 About to make API request...");
      
      console.log("🚀 Making API request now...");
      
      try {
        const result = await apiRequest("POST", `/api/goals/${data.goalId}/data-points`, payload);
        console.log("🚀 API request completed successfully");
        console.log("🚀 Result status:", result.status);
        
        if (!result.ok) {
          console.error("❌ API request failed with status:", result.status);
          throw new Error(`API request failed: ${result.status}`);
        }
        
        const responseData = await result.json();
        console.log("✅ API response data:", responseData);
        return responseData;
      } catch (apiError) {
        console.error("❌ API REQUEST FAILED:");
        console.error("❌ Error type:", typeof apiError);
        console.error("❌ Error message:", (apiError as Error).message);
        console.error("❌ Full error:", apiError);
        throw apiError;
      }

    },
    onSuccess: (savedDataPoint) => {
      const goalId = form.getValues().goalId;
      const studentId = form.getValues().goalId ? goals?.find(g => g.id === form.getValues().goalId)?.studentId : null;
      
      console.log("✅ Data point mutation succeeded with saved data:", savedDataPoint);
      
      // Clear all cache to force immediate refresh of all data
      queryClient.clear();
      
      // Force immediate refetch of critical data
      if (studentId) {
        queryClient.prefetchQuery({
          queryKey: [`/api/students/${studentId}/all-data-points`],
          staleTime: 0,
        });
        queryClient.prefetchQuery({
          queryKey: [`/api/goals/${goalId}/data-points`],
          staleTime: 0,
        });
      }
      
      console.log("✅ Data point successfully added and cache cleared");
      
      toast({
        title: "Data Added Successfully!",
        description: "Your data has been saved.",
      });
      
      form.reset();
      onSuccess?.();
    },
    onError: (error) => {
      console.error("❌ Error adding data point:", error);
      console.error("❌ Error message:", error.message);
      console.error("❌ Full error object:", error);
      console.error("❌ Data point failed to save to database");
      
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
      console.error("❌ FORM VALIDATION FAILED - submission blocked:", form.formState.errors);
      return;
    }
    
    console.log("✅ Form validation passed, proceeding with submission...");
    
    let finalData = { ...data };

    // Convert fraction to percentage if needed
    if (progressInputType === "fraction" && data.numerator && data.denominator) {
      finalData.progressValue = (data.numerator / data.denominator) * 100;
      console.log("Converted fraction to percentage:", finalData.progressValue);
    }

    console.log("🎯 Final data being sent to API:", finalData);
    console.log("🎯 API endpoint will be:", `/api/goals/${data.goalId}/data-points`);
    console.log("🎯 About to call addDataPointMutation.mutate...");
    console.log("🎯 Mutation isPending before call:", addDataPointMutation.isPending);
    console.log("🎯 Mutation isError before call:", addDataPointMutation.isError);
    console.log("🎯 Mutation error before call:", addDataPointMutation.error);
    
    try {
      addDataPointMutation.mutate(finalData);
      console.log("🎯 Mutation.mutate() called successfully");
    } catch (mutationError) {
      console.error("❌ MUTATION CALL FAILED:", mutationError);
    }
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

          {/* Objective Selection (Optional) */}
          {objectives.length > 0 && (
            <FormField
              control={form.control}
              name="objectiveId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Objective (Optional)</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(value === "general" ? undefined : parseInt(value))} 
                    value={field.value?.toString() || "general"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose an objective or leave blank for general goal data..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="general">General Goal (No specific objective)</SelectItem>
                      {objectives.map((objective) => (
                        <SelectItem key={objective.id} value={objective.id.toString()}>
                          {objective.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

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
                  <label className="block text-xs text-gray-600 mb-1">Time Unit</label>
                  <FormField
                    control={form.control}
                    name="durationUnit"
                    render={({ field }) => (
                      <div className="space-y-1">
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          value={field.value || durationUnit}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value);
                            setDurationUnit(value);
                            form.trigger("durationUnit");
                          }}
                        >
                          <option value="minutes">minutes</option>
                          <option value="seconds">seconds</option>
                        </select>
                      </div>
                    )}
                  />
                </div>
                
                <div className="flex-1">
                  <label className="block text-xs text-gray-600 mb-1">
                    {form.watch("durationUnit") === "seconds" ? "Seconds (0-59)" : "Minutes (0-59, decimal .01-.59)"}
                  </label>
                  <FormField
                    control={form.control}
                    name="progressValue"
                    render={({ field }) => (
                      <>
                        {form.watch("durationUnit") === "seconds" ? (
                          <div className="relative">
                            <Select onValueChange={(value) => field.onChange(Number(value))} value={field.value?.toString() || ""}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select seconds..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="h-60">
                                {Array.from({ length: 60 }, (_, i) => (
                                  <SelectItem key={i} value={i.toString()}>
                                    {i} {i === 1 ? 'second' : 'seconds'}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {field.value !== undefined && field.value !== null && (
                              <span className="absolute right-10 top-3 text-gray-500 text-sm pointer-events-none">
                                seconds
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="relative">
                            <select
                              value={field.value?.toString() || ""}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value);
                                field.onChange(value);
                                console.log(`✅ Selected: ${value} minutes`);
                              }}
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-20"
                            >
                              <option value="">Select minutes...</option>
                              {/* Generate options: whole minutes 0-59, then decimals .01-.59 for each */}
                              {Array.from({ length: 60 }, (_, wholeMinute) => {
                                const options = [];
                                
                                // Add exact whole minute (e.g., 1.00, 2.00, etc.)
                                if (wholeMinute > 0) {
                                  options.push(
                                    <option key={`${wholeMinute}.00`} value={wholeMinute}>
                                      {wholeMinute}.00 ({wholeMinute} minutes exactly)
                                    </option>
                                  );
                                }
                                
                                // Add decimal options .01-.59 for this whole minute
                                if (wholeMinute >= 1) {
                                  for (let decimal = 1; decimal <= 59; decimal++) {
                                    const value = wholeMinute + (decimal / 100);
                                    const formattedValue = value.toFixed(2);
                                    options.push(
                                      <option key={formattedValue} value={formattedValue}>
                                        {formattedValue} ({wholeMinute}m {decimal}s)
                                      </option>
                                    );
                                  }
                                }
                                
                                return options;
                              }).flat()}
                            </select>
                            {field.value !== undefined && field.value !== null && field.value > 0 && (
                              <span className="absolute right-3 top-3 text-gray-500 text-sm pointer-events-none">
                                minutes
                              </span>
                            )}
                          </div>
                        )}
                      </>
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
              /* Trial Counter Interface - matching live collection */
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Percent className="h-5 w-5 mr-2" />
                    Trial Counter
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center mb-6">
                    <div className="text-4xl font-bold text-purple-600 mb-2">
                      {trialCounter.total > 0 ? 
                        Math.round((trialCounter.correct / trialCounter.total) * 100) : 0}%
                    </div>
                    <div className="text-lg text-gray-600">
                      {trialCounter.correct} / {trialCounter.total} correct
                    </div>
                    {trialCounter.noResponse > 0 && (
                      <div className="text-sm text-gray-500 mt-1">
                        {trialCounter.noResponse} no response{trialCounter.noResponse !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-center space-x-2 mb-4">
                    <Button 
                      type="button"
                      size="lg" 
                      onClick={() => {
                        const newTrialCounter = {
                          ...trialCounter,
                          correct: trialCounter.correct + 1,
                          total: trialCounter.total + 1
                        };
                        setTrialCounter(newTrialCounter);
                        // Update form values
                        form.setValue("numerator", newTrialCounter.correct);
                        form.setValue("denominator", newTrialCounter.total);
                        form.setValue("progressValue", newTrialCounter.total > 0 ? 
                          Math.round((newTrialCounter.correct / newTrialCounter.total) * 100) : 0);
                        setProgressInputType("fraction");
                      }}
                      className="bg-green-600 hover:bg-green-700 h-16 px-6"
                    >
                      ✓ Correct
                    </Button>
                    <Button 
                      type="button"
                      size="lg" 
                      onClick={() => {
                        const newTrialCounter = {
                          ...trialCounter,
                          total: trialCounter.total + 1
                        };
                        setTrialCounter(newTrialCounter);
                        // Update form values
                        form.setValue("numerator", newTrialCounter.correct);
                        form.setValue("denominator", newTrialCounter.total);
                        form.setValue("progressValue", newTrialCounter.total > 0 ? 
                          Math.round((newTrialCounter.correct / newTrialCounter.total) * 100) : 0);
                        setProgressInputType("fraction");
                      }}
                      className="bg-red-600 hover:bg-red-700 h-16 px-6"
                    >
                      ✗ Incorrect
                    </Button>
                    <Button 
                      type="button"
                      size="lg" 
                      onClick={() => {
                        const newTrialCounter = {
                          ...trialCounter,
                          noResponse: trialCounter.noResponse + 1
                        };
                        setTrialCounter(newTrialCounter);
                        // For no response, we don't change total trials but track separately
                      }}
                      className="bg-gray-500 hover:bg-gray-600 h-16 px-6"
                    >
                      − No Response
                    </Button>
                  </div>
                  <div className="text-center">
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        // Remove the last trial
                        if (trialCounter.noResponse > 0) {
                          // Remove no response first
                          const newTrialCounter = {
                            ...trialCounter,
                            noResponse: trialCounter.noResponse - 1
                          };
                          setTrialCounter(newTrialCounter);
                        } else if (trialCounter.total > 0) {
                          // Remove last correct/incorrect trial
                          const wasLastCorrect = trialCounter.correct > 0 && 
                            (trialCounter.correct / trialCounter.total) > ((trialCounter.correct - 1) / (trialCounter.total - 1));
                          const newTrialCounter = {
                            correct: wasLastCorrect ? trialCounter.correct - 1 : trialCounter.correct,
                            total: trialCounter.total - 1,
                            noResponse: trialCounter.noResponse
                          };
                          setTrialCounter(newTrialCounter);
                          // Update form values
                          form.setValue("numerator", newTrialCounter.correct);
                          form.setValue("denominator", newTrialCounter.total);
                          form.setValue("progressValue", newTrialCounter.total > 0 ? 
                            Math.round((newTrialCounter.correct / newTrialCounter.total) * 100) : 0);
                        }
                      }}
                      disabled={trialCounter.total === 0 && trialCounter.noResponse === 0}
                    >
                      Remove Last Trial
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Level of Support */}
          <FormField
            control={form.control}
            name="levelOfSupport"
            render={({ field }) => {
              const baseSupportOptions = [
                { id: "independent", label: "Independent" },
                { id: "verbal", label: "Verbal" },
                { id: "visual", label: "Visual" },
                { id: "written", label: "Written" },
                { id: "model-of-task", label: "Model of Task" },
                { id: "self-correction", label: "Self-Correction" },
                { id: "gesture", label: "Gesture" },
              ];

              // Add custom level of support from the selected goal if it exists and isn't already in the list
              const supportOptions = [...baseSupportOptions];
              if (selectedGoal?.levelOfSupport && 
                  !baseSupportOptions.some(option => option.id === selectedGoal.levelOfSupport)) {
                supportOptions.push({ 
                  id: selectedGoal.levelOfSupport, 
                  label: selectedGoal.levelOfSupport.charAt(0).toUpperCase() + selectedGoal.levelOfSupport.slice(1)
                });
              }

              return (
                <FormItem>
                  <FormLabel className="text-base font-medium text-gray-900 mb-4 block">
                    Level of Support (Select all that apply)
                  </FormLabel>
                  <div className="space-y-4">
                    {supportOptions.map((option) => (
                      <div key={option.id} className="flex items-center space-x-3">
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
                          className="h-5 w-5"
                        />
                        <label 
                          htmlFor={option.id} 
                          className="text-base font-medium text-gray-900 cursor-pointer leading-none"
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
