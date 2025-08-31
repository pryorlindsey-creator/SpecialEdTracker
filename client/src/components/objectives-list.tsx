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
import { Progress } from "@/components/ui/progress";

// Interface for objective progress data
interface ObjectiveProgress {
  objective: Objective;
  dataPoints: any[];
  currentProgress: number;
  averageScore: number;
  trend: number;
  lastScore: number;
  dataPointsCount: number;
}
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const objectiveSchema = z.object({
  description: z.string().min(1, "Objective description is required"),
  targetCriteria: z.string().optional(),
  targetDate: z.string().optional().transform((val) => val || undefined),
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
  const [deletingObjectiveId, setDeletingObjectiveId] = useState<number | null>(null);


  const form = useForm<ObjectiveFormData>({
    resolver: zodResolver(objectiveSchema),
    defaultValues: {
      description: "",
      targetCriteria: "",
      targetDate: "",
      status: "active",
    },
  });

  // Query to fetch objectives
  const { data: objectivesData, isLoading, error } = useQuery<Objective[]>({
    queryKey: [`/api/goals/${goalId}/objectives`],
    // Use the default query function which properly handles JSON parsing
  });

  // Ensure objectives is always an array
  const objectives = Array.isArray(objectivesData) ? objectivesData : [];
  
  // Fetch progress data for each objective
  const objectiveProgressQueries = objectives.map((objective: Objective) => ({
    queryKey: [`/api/objectives/${objective.id}/progress`],
    enabled: !!objective.id,
  }));

  const objectiveProgressData = objectiveProgressQueries.map(query => 
    useQuery<ObjectiveProgress>(query)
  );
  


  // Mutation to create objective
  const createObjectiveMutation = useMutation({
    mutationFn: (data: ObjectiveFormData) =>
      apiRequest('POST', `/api/goals/${goalId}/objectives`, data),
    onSuccess: () => {
      console.log('Objective created successfully, invalidating queries...');
      // Clear all cached data and force fresh fetch
      queryClient.clear();
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
      // Clear all cached data to force fresh fetch
      queryClient.clear();
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
      // Clear all cached data to force fresh fetch
      queryClient.clear();
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
      description: objective.description,
      targetCriteria: objective.targetCriteria || "",
      targetDate: objective.targetDate ? new Date(objective.targetDate).toISOString().split('T')[0] : "",
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
              {objectives.map((objective: Objective, index: number) => {
                const progressQuery = objectiveProgressData[index];
                const progressData = progressQuery?.data;
                const isLoadingProgress = progressQuery?.isLoading;
                
                const formatTrend = (trend: number) => {
                  if (trend > 0) return `+${trend.toFixed(1)}%`;
                  if (trend < 0) return `${trend.toFixed(1)}%`;
                  return '0%';
                };

                return (
                  <div
                    key={objective.id}
                    className="p-4 border rounded-lg space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-gray-900 font-medium">
                          {objective.description}
                        </p>
                        {objective.targetCriteria && (
                          <p className="text-sm text-blue-600 mt-1">
                            <strong>Target:</strong> {objective.targetCriteria}
                          </p>
                        )}
                        {objective.targetDate && (
                          <p className="text-sm text-purple-600 mt-1">
                            <strong>Target Date:</strong> {new Date(objective.targetDate).toLocaleDateString()}
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
                          onClick={() => setDeletingObjectiveId(objective.id)}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Objective Progress Bar */}
                    {isLoadingProgress ? (
                      <div className="animate-pulse">
                        <div className="flex justify-between items-center mb-2">
                          <div className="h-3 bg-gray-200 rounded w-24"></div>
                          <div className="h-3 bg-gray-200 rounded w-12"></div>
                        </div>
                        <div className="h-2 bg-gray-200 rounded"></div>
                      </div>
                    ) : progressData ? (
                      <>
                        <div className="mb-3">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-medium text-gray-600">Current Progress</span>
                            <span className="text-xs font-semibold text-gray-800">{progressData.currentProgress?.toFixed(0) || 0}%</span>
                          </div>
                          <Progress 
                            value={Math.min(Math.max(progressData.currentProgress || 0, 0), 100)} 
                            className="h-2 bg-gray-200"
                          />
                        </div>

                        {/* Objective Statistics - Only show for percentage goals with data */}
                        {progressData.dataPointsCount > 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="text-center p-2 bg-gray-50 rounded-lg">
                              <p className="text-lg font-bold text-gray-900">{progressData.dataPointsCount}</p>
                              <p className="text-xs text-gray-600">Data Points</p>
                            </div>
                            <div className="text-center p-2 bg-gray-50 rounded-lg">
                              <p className="text-lg font-bold text-gray-900">{progressData.averageScore?.toFixed(0) || 0}%</p>
                              <p className="text-xs text-gray-600">Average Score</p>
                            </div>
                            <div className="text-center p-2 bg-gray-50 rounded-lg">
                              <p className={`text-lg font-bold ${progressData.trend > 0 ? 'text-green-600' : progressData.trend < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                {formatTrend(progressData.trend || 0)}
                              </p>
                              <p className="text-xs text-gray-600">Trend</p>
                            </div>
                            <div className="text-center p-2 bg-gray-50 rounded-lg">
                              <p className="text-lg font-bold text-gray-900">{progressData.lastScore?.toFixed(0) || 0}%</p>
                              <p className="text-xs text-gray-600">Last Score</p>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="mb-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-medium text-gray-600">Current Progress</span>
                          <span className="text-xs font-semibold text-gray-800">0%</span>
                        </div>
                        <Progress 
                          value={0} 
                          className="h-2 bg-gray-200"
                        />
                        <p className="text-xs text-gray-500 mt-1">No data points yet</p>
                      </div>
                    )}

                  </div>
                );
              })}
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

              <FormField
                control={form.control}
                name="targetDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Date (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                      />
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

      {/* Delete Objective Confirmation Dialog */}
      <AlertDialog open={!!deletingObjectiveId} onOpenChange={() => setDeletingObjectiveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Objective</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this objective? This action cannot be undone and will permanently remove the objective and any associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingObjectiveId) {
                  deleteObjectiveMutation.mutate(deletingObjectiveId);
                  setDeletingObjectiveId(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Objective
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}