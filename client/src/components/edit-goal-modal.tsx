import { useState } from "react";
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

const editGoalSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  targetCriteria: z.string().optional(),
  dataCollectionType: z.string().optional(),
  frequencyDirection: z.string().optional(),
  status: z.string().optional(),
});

type EditGoalFormData = z.infer<typeof editGoalSchema>;

interface Goal {
  id: number;
  title: string;
  description: string;
  targetCriteria: string | null;
  dataCollectionType: string | null;
  frequencyDirection: string | null;
  status: string;
  levelOfSupport: string | null;
}

interface EditGoalModalProps {
  goal: Goal;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const supportLevels = [
  "Independent",
  "Verbal",
  "Visual", 
  "Written",
  "Model of Task",
  "Self-Correction",
  "Gesture",
  "Custom"
];

export default function EditGoalModal({ goal, isOpen, onClose, onSuccess }: EditGoalModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSupport, setSelectedSupport] = useState<string[]>(() => {
    if (!goal.levelOfSupport) return [];
    try {
      return JSON.parse(goal.levelOfSupport);
    } catch {
      return [];
    }
  });
  const [customSupport, setCustomSupport] = useState<string>("");

  const form = useForm<EditGoalFormData>({
    resolver: zodResolver(editGoalSchema),
    defaultValues: {
      title: goal.title,
      description: goal.description,
      targetCriteria: goal.targetCriteria || "",
      dataCollectionType: goal.dataCollectionType || "percentage",
      frequencyDirection: goal.frequencyDirection || "",
      status: goal.status,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: EditGoalFormData) => {
      let finalSupport = [...selectedSupport];
      
      // If Custom is selected and customSupport has value, replace "Custom" with the custom value
      if (selectedSupport.includes("Custom") && customSupport.trim()) {
        finalSupport = finalSupport.filter(s => s !== "Custom");
        finalSupport.push(customSupport.trim());
      }
      
      const submitData = {
        ...data,
        levelOfSupport: finalSupport.length > 0 ? JSON.stringify(finalSupport) : null,
      };
      
      const response = await fetch(`/api/goals/${goal.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update goal");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Goal updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      form.reset();
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error", 
        description: "Failed to update goal. Please try again.",
        variant: "destructive",
      });
      console.error("Error updating goal:", error);
    },
  });

  const onSubmit = (data: EditGoalFormData) => {
    mutation.mutate(data);
  };

  const handleSupportChange = (level: string, checked: boolean) => {
    if (level === "Custom") {
      if (checked) {
        setSelectedSupport(prev => [...prev, level]);
      } else {
        setSelectedSupport(prev => prev.filter(l => l !== level));
        setCustomSupport("");
      }
    } else {
      if (checked) {
        setSelectedSupport(prev => [...prev, level]);
      } else {
        setSelectedSupport(prev => prev.filter(l => l !== level));
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Goal</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Goal Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter goal title" {...field} />
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the goal in detail"
                      className="min-h-[100px]"
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
                  <FormLabel>Target Criteria</FormLabel>
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
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="discontinued">Discontinued</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <label className="text-sm font-medium">Level of Support</label>
              <div className="space-y-2">
                {supportLevels.map((level) => (
                  <div key={level} className="flex items-center space-x-2">
                    <Checkbox
                      id={level}
                      checked={selectedSupport.includes(level)}
                      onCheckedChange={(checked) => 
                        handleSupportChange(level, checked as boolean)
                      }
                    />
                    <label htmlFor={level} className="text-sm font-medium">
                      {level}
                    </label>
                  </div>
                ))}
              </div>
              
              {/* Custom Support Input */}
              {selectedSupport.includes("Custom") && (
                <div className="mt-3">
                  <Input
                    placeholder="Enter your custom level of support..."
                    value={customSupport}
                    onChange={(e) => setCustomSupport(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Updating..." : "Update Goal"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}