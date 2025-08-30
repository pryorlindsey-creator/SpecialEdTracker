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
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

const addGoalSchema = z.object({
  title: z.string().min(1, "Goal title is required"),
  description: z.string().min(1, "Goal description is required"),
  targetCriteria: z.string().optional(),
  levelOfSupport: z.string().optional(),
  customLevelOfSupport: z.string().optional(),
  dataCollectionType: z.string().default("percentage"),
  frequencyDirection: z.string().optional(),
  status: z.string().default("active"),
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
    },
  });

  const addGoalMutation = useMutation({
    mutationFn: async (data: AddGoalFormData) => {
      // Use custom level of support if provided, otherwise use the selected option
      const finalLevelOfSupport = data.levelOfSupport === "custom" ? data.customLevelOfSupport : data.levelOfSupport;
      const { customLevelOfSupport, ...requestData } = data;
      const goalData = { ...requestData, levelOfSupport: finalLevelOfSupport };
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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New Goal</DialogTitle>
        </DialogHeader>
        
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
                      <SelectItem value="verbal-prompt">Verbal Prompt</SelectItem>
                      <SelectItem value="visual-prompt">Visual Prompt</SelectItem>
                      <SelectItem value="physical-prompt">Physical Prompt</SelectItem>
                      <SelectItem value="hand-over-hand">Hand-over-Hand</SelectItem>
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
      </DialogContent>
    </Dialog>
  );
}
