import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Plus, Trash2 } from "lucide-react";

const objectiveSchema = z.object({
  description: z.string().min(1, "Objective description is required"),
  targetCriteria: z.string().optional(),
  targetDate: z.string().optional(),
  status: z.string().default("active"),
});

const addGoalSchema = z.object({
  title: z.string().min(1, "Goal title is required"),
  description: z.string().min(1, "Goal description is required"),
  targetCriteria: z.string().optional(),
  levelOfSupport: z.string().optional(),
  customLevelOfSupport: z.string().optional(),
  dataCollectionType: z.string().default("percentage"),
  frequencyDirection: z.string().optional(),
  status: z.string().default("active"),
  objectives: z.array(objectiveSchema).max(5, "Maximum 5 objectives allowed per goal").optional().default([]),
});

type AddGoalFormData = z.infer<typeof addGoalSchema>;

interface AddGoalModalProps {
  studentId: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AddGoalModal({ studentId, isOpen, onClose, onSuccess }: AddGoalModalProps) {
  const { toast } = useToast();
  const [isCustomSupport, setIsCustomSupport] = useState(false);

  const form = useForm<AddGoalFormData>({
    resolver: zodResolver(addGoalSchema),
    defaultValues: {
      title: "",
      description: "",
      targetCriteria: "",
      levelOfSupport: "",
      customLevelOfSupport: "",
      dataCollectionType: "percentage",
      frequencyDirection: "",
      status: "active",
      objectives: [],
    },
  });

  const addGoalMutation = useMutation({
    mutationFn: async (data: AddGoalFormData) => {
      // Use custom level of support if provided, otherwise use the selected option
      const finalLevelOfSupport = data.levelOfSupport === "custom" ? data.customLevelOfSupport : data.levelOfSupport;
      const { customLevelOfSupport, objectives, ...requestData } = data;
      const goalData = { ...requestData, levelOfSupport: finalLevelOfSupport, objectives };
      await apiRequest("POST", `/api/students/${studentId}/goals`, goalData);
    },
    onSuccess: () => {
      // Clear all cache to force immediate refresh
      queryClient.clear();
      
      toast({
        title: "Success",
        description: "Goal added successfully!",
      });
      form.reset();
      setIsCustomSupport(false);
      onSuccess?.();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      toast({
        title: "Error",
        description: "Failed to add goal. Please try again.",
        variant: "destructive",
      });
      console.error("Error adding goal:", error);
    },
  });

  const onSubmit = (data: AddGoalFormData) => {
    addGoalMutation.mutate(data);
  };

  const handleClose = () => {
    form.reset();
    setIsCustomSupport(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="sm:max-w-4xl w-full"
        style={{
          maxHeight: '85vh',
          height: 'auto',
          overflow: 'visible'
        }}
      >
        <DialogHeader>
          <DialogTitle>Add New Goal</DialogTitle>
        </DialogHeader>
        
        <div 
          style={{
            maxHeight: 'calc(85vh - 80px)',
            overflow: 'auto',
            paddingRight: '4px',
            marginRight: '-4px'
          }}
        >
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Goal Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Reading Comprehension" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Goal Description</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="e.g., Student will read grade-level passages and answer comprehension questions with 80% accuracy over 3 consecutive trials."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="targetCriteria"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Criteria (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., 80% accuracy over 3 consecutive trials" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dataCollectionType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data Collection Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select data collection type..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="frequency">Frequency</SelectItem>
                      <SelectItem value="percentage">Attempts in Trials (Percentages)</SelectItem>
                      <SelectItem value="duration">Duration</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch("dataCollectionType") === "frequency" && (
              <FormField
                control={form.control}
                name="frequencyDirection"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequency Direction</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Is this goal to increase or decrease frequency?" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="increase">Increase Frequency</SelectItem>
                        <SelectItem value="decrease">Decrease Frequency</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="levelOfSupport"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Level of Support</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      setIsCustomSupport(value === "custom");
                      if (value !== "custom") {
                        form.setValue("customLevelOfSupport", "");
                      }
                    }} 
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select support level..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="independent">Independent</SelectItem>
                      <SelectItem value="verbal">Verbal</SelectItem>
                      <SelectItem value="visual">Visual</SelectItem>
                      <SelectItem value="written">Written</SelectItem>
                      <SelectItem value="model-of-task">Model of Task</SelectItem>
                      <SelectItem value="self-correction">Self-Correction</SelectItem>
                      <SelectItem value="gesture">Gesture</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Custom Level of Support Input */}
            {isCustomSupport && (
              <FormField
                control={form.control}
                name="customLevelOfSupport"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom Level of Support</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter your custom level of support..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Objectives Section */}
            <Card className="border-2 border-blue-200 bg-blue-50/30">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-blue-900">
                  📋 Goal Objectives ({form.watch("objectives")?.length || 0}/5)
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => {
                      const currentObjectives = form.getValues("objectives") || [];
                      if (currentObjectives.length < 5) {
                        form.setValue("objectives", [
                          ...currentObjectives,
                          { description: "", targetCriteria: "", targetDate: "", status: "active" }
                        ]);
                      }
                    }}
                    disabled={form.watch("objectives")?.length >= 5}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Objective
                  </Button>
                </CardTitle>
                <p className="text-sm text-blue-700 mt-2">
                  Add specific, measurable objectives that support this goal. You can add up to 5 objectives during goal creation.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {form.watch("objectives")?.map((_, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Objective {index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const currentObjectives = form.getValues("objectives") || [];
                          form.setValue("objectives", currentObjectives.filter((_, i) => i !== index));
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <FormField
                      control={form.control}
                      name={`objectives.${index}.description`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Objective Description</FormLabel>
                          <FormControl>
                            <Textarea
                              rows={2}
                              placeholder="e.g., Student will answer who/what questions about familiar stories with 80% accuracy"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name={`objectives.${index}.targetCriteria`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Target Criteria (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., 80% accuracy over 4 trials" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name={`objectives.${index}.targetDate`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Target Date (Optional)</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                ))}
                
                {(!form.watch("objectives") || form.watch("objectives")?.length === 0) && (
                  <div className="text-center py-6 px-4 border-2 border-dashed border-blue-300 rounded-lg bg-white">
                    <div className="text-blue-400 mb-2">📝</div>
                    <p className="text-sm text-blue-600 font-medium mb-1">
                      No objectives added yet
                    </p>
                    <p className="text-xs text-blue-500">
                      Click "Add Objective" above to create specific objectives for this goal. You can also add them later.
                    </p>
                  </div>
                )}
                
                {form.watch("objectives")?.length >= 5 && (
                  <div className="text-center py-2 px-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-700 font-medium">
                      ✅ Maximum of 5 objectives reached
                    </p>
                    <p className="text-xs text-amber-600">
                      You can edit or remove objectives after creating the goal if needed.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="mastered">Mastered</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-3 pt-4">
              <Button 
                type="button" 
                variant="outline"
                onClick={handleClose}
                disabled={addGoalMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={addGoalMutation.isPending}
              >
                {addGoalMutation.isPending && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                )}
                Add Goal
              </Button>
            </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
