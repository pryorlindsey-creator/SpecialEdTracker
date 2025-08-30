import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { Objective } from "@shared/schema";

const objectiveSchema = z.object({
  title: z.string().min(1, "Objective title is required"),
  description: z.string().min(1, "Objective description is required"),
  targetCriteria: z.string().optional(),
  status: z.enum(["active", "mastered"]).default("active"),
});

type ObjectiveFormData = z.infer<typeof objectiveSchema>;

interface ObjectivesListProps {
  goalId: number;
  studentId: number;
}

export default function ObjectivesList({ goalId, studentId }: ObjectivesListProps) {
  const { toast } = useToast();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingObjective, setEditingObjective] = useState<Objective | null>(null);

  const form = useForm<ObjectiveFormData>({
    resolver: zodResolver(objectiveSchema),
    defaultValues: {
      title: "",
      description: "",
      targetCriteria: "",
      status: "active",
    },
  });

  // Query to fetch objectives
  const { data: objectivesData, isLoading } = useQuery<Objective[]>({
    queryKey: ['/api/goals', goalId, 'objectives'],
    queryFn: () => apiRequest('GET', `/api/goals/${goalId}/objectives`),
  });

  // Ensure objectives is always an array
  const objectives = Array.isArray(objectivesData) ? objectivesData : [];

  // Mutation to create objective
  const createObjectiveMutation = useMutation({
    mutationFn: (data: ObjectiveFormData) =>
      apiRequest('POST', `/api/goals/${goalId}/objectives`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/goals', goalId, 'objectives'] });
      queryClient.invalidateQueries({ queryKey: ['/api/students', studentId, 'goals'] });
      toast({
        title: "Success",
        description: "Objective added successfully!",
      });
      form.reset();
      setIsAddModalOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add objective. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation to update objective
  const updateObjectiveMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ObjectiveFormData }) =>
      apiRequest('PUT', `/api/objectives/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/goals', goalId, 'objectives'] });
      queryClient.invalidateQueries({ queryKey: ['/api/students', studentId, 'goals'] });
      toast({
        title: "Success",
        description: "Objective updated successfully!",
      });
      form.reset();
      setEditingObjective(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update objective. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation to delete objective
  const deleteObjectiveMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/objectives/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/goals', goalId, 'objectives'] });
      queryClient.invalidateQueries({ queryKey: ['/api/students', studentId, 'goals'] });
      toast({
        title: "Success",
        description: "Objective deleted successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete objective. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ObjectiveFormData) => {
    if (editingObjective) {
      updateObjectiveMutation.mutate({ id: editingObjective.id, data });
    } else {
      createObjectiveMutation.mutate(data);
    }
  };

  const handleEdit = (objective: Objective) => {
    setEditingObjective(objective);
    form.reset({
      title: objective.title,
      description: objective.description,
      targetCriteria: objective.targetCriteria || "",
      status: objective.status as "active" | "mastered",
    });
    setIsAddModalOpen(true);
  };

  const handleAdd = () => {
    setEditingObjective(null);
    form.reset();
    setIsAddModalOpen(true);
  };

  const handleClose = () => {
    setIsAddModalOpen(false);
    setEditingObjective(null);
    form.reset();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Objectives</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Objectives ({objectives.length}/5)
            <Button
              onClick={handleAdd}
              size="sm"
              disabled={objectives.length >= 5}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Objective
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {objectives.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No objectives have been added for this goal yet.
            </p>
          ) : (
            <div className="space-y-3">
              {objectives.map((objective: Objective) => (
                <div
                  key={objective.id}
                  className="p-4 border rounded-lg space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {objective.title}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {objective.description}
                      </p>
                      {objective.targetCriteria && (
                        <p className="text-sm text-blue-600 mt-1">
                          <strong>Target:</strong> {objective.targetCriteria}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            objective.status === "active"
                              ? "bg-green-100 text-green-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {objective.status.charAt(0).toUpperCase() + objective.status.slice(1)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(objective)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (window.confirm("Are you sure you want to delete this objective?")) {
                            deleteObjectiveMutation.mutate(objective.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {objectives.length >= 5 && (
            <p className="text-sm text-amber-600 text-center mt-4">
              Maximum of 5 objectives per goal reached.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingObjective ? "Edit Objective" : "Add New Objective"}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Objective Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Answer who/what questions" {...field} />
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
                    <FormLabel>Objective Description</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder="e.g., Student will answer who/what questions about familiar stories with 80% accuracy"
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
                      <Input placeholder="e.g., 80% accuracy over 4 trials" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={handleClose}
                  disabled={createObjectiveMutation.isPending || updateObjectiveMutation.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createObjectiveMutation.isPending || updateObjectiveMutation.isPending}
                >
                  {(createObjectiveMutation.isPending || updateObjectiveMutation.isPending) && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  )}
                  {editingObjective ? "Update Objective" : "Add Objective"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}