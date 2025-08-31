import { useState, useEffect } from "react";
import React from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import type { students, goals, dataPoints } from "@/../../shared/schema";

type Student = typeof students.$inferSelect;
type Goal = typeof goals.$inferSelect;
type DataPoint = typeof dataPoints.$inferSelect;
import { ArrowLeft, Plus, Printer, ChartLine, Target, Edit, Table, BarChart3, RefreshCw, Timer, Zap, Trash2, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import GoalProgressCard from "@/components/goal-progress-card";
import DataEntryForm from "@/components/data-entry-form";
import GoalChart from "@/components/goal-chart";
import AddGoalModal from "@/components/add-goal-modal";
import EditGoalModal from "@/components/edit-goal-modal";
import StudentInfoCard from "@/components/student-info-card";
import StudentScatterplot from "@/components/student-scatterplot";
import RawDataTable from "@/components/raw-data-table";
import LiveCollectionTools from "@/components/live-collection-tools";
import ObjectivesList from "@/components/objectives-list";
import ObjectiveChartsForGoal from "@/components/objective-charts-for-goal";
import { ClearDataModal } from "@/components/clear-data-modal";
import { format } from "date-fns";
import { PDFGenerator, type PDFStudentData, type PDFGoalData, type PDFDataPoint } from "@/lib/pdf-generator";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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

export default function StudentDetail() {
  const params = useParams();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [isAddGoalModalOpen, setIsAddGoalModalOpen] = useState(false);
  const [isEditGoalModalOpen, setIsEditGoalModalOpen] = useState(false);
  const [isClearStudentDataModalOpen, setIsClearStudentDataModalOpen] = useState(false);
  const [isRemoveStudentModalOpen, setIsRemoveStudentModalOpen] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<number | null>(null);
  const [editingGoal, setEditingGoal] = useState<any>(null);
  const [deletingGoalId, setDeletingGoalId] = useState<number | null>(null);

  const studentId = params.id ? parseInt(params.id) : null;
  


  const { data: student, isLoading: studentLoading, error: studentError, refetch: refetchStudent } = useQuery<Student>({
    queryKey: [`/api/students/${studentId}`],
    enabled: !!studentId,
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: 'always',
  });

  const { data: goals = [], isLoading: goalsLoading, error: goalsError, refetch: refetchGoals } = useQuery<Goal[]>({
    queryKey: [`/api/students/${studentId}/goals`],
    enabled: !!studentId,
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: 'always',
  });

  const { data: dataPoints = [], isLoading: dataPointsLoading, refetch: refetchDataPoints } = useQuery<DataPoint[]>({
    queryKey: [`/api/goals/${selectedGoalId}/data-points`],
    enabled: !!selectedGoalId,
  });

  // Query for ALL data points for PDF generation
  const { data: allDataPoints = [], isLoading: allDataPointsLoading, refetch: refetchAllDataPoints } = useQuery<DataPoint[]>({
    queryKey: [`/api/students/${studentId}/all-data-points`],
    enabled: !!studentId,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Query for objectives of the selected goal
  const { data: objectives = [], isLoading: objectivesLoading, refetch: refetchObjectives } = useQuery({
    queryKey: [`/api/goals/${selectedGoalId}/objectives`],
    enabled: !!selectedGoalId,
    staleTime: 0,
    refetchOnMount: 'always',
  });
  


  // Force refresh all data when component mounts to prevent cache issues
  React.useEffect(() => {
    if (studentId) {
      queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}/goals`] });
      queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}/all-data-points`] });
    }
  }, [studentId]);

  // Mutation to delete goal
  const deleteGoalMutation = useMutation({
    mutationFn: (goalId: number) => apiRequest('DELETE', `/api/goals/${goalId}`),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Goal deleted successfully!",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}/goals`] });
      queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}/all-data-points`] });
      setDeletingGoalId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete goal. Please try again.",
        variant: "destructive",
      });
      setDeletingGoalId(null);
    },
  });

  // No auth handling needed in development mode

  if (studentLoading) {
    return (
      <div className="min-h-screen bg-surface">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (studentError) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Card className="p-8 text-center">
          <CardContent>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Student</h2>
            <p className="text-gray-600 mb-4">There was an error loading the student data: {studentError.message}</p>
            <Button onClick={() => navigate("/")} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Students
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Card className="p-8 text-center">
          <CardContent>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Student Not Found</h2>
            <p className="text-gray-600 mb-4">The student you're looking for doesn't exist.</p>
            <Button onClick={() => navigate("/")} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Students
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }



  const lastUpdateText = (student as any)?.lastDataPoint 
    ? format(new Date((student as any).lastDataPoint.date), "MMM d, yyyy")
    : "No data yet";

  // PDF Generation Function
  const generatePDF = async () => {
    try {
      
      // Ensure we have all the data needed
      if (!student || !goals || !allDataPoints || 
          goals.length === 0 || allDataPoints.length === 0 ||
          !student.name || !student.id) {

        toast({
          title: "Error",
          description: "Unable to generate PDF. Missing or invalid student data.",
          variant: "destructive",
        });
        return;
      }

      // Transform student data for PDF
      const pdfStudent: PDFStudentData = {
        id: student.id,
        name: student.name,
        grade: student.grade || "",
        iepDueDate: student.iepDueDate?.toISOString().split('T')[0] || "",
        relatedServices: student.relatedServices || "",
        totalGoals: (student as any).totalGoals || goals.length,
        activeGoals: (student as any).activeGoals || goals.filter(g => g.status === 'active').length,
        completedGoals: (student as any).completedGoals || goals.filter(g => g.status === 'completed').length,
        totalDataPoints: (student as any).totalDataPoints || allDataPoints.length,
      };

      // Transform goals data for PDF
      const pdfGoals: PDFGoalData[] = goals.map(goal => ({
        id: goal.id,
        title: goal.title,
        description: goal.description,
        targetCriteria: goal.targetCriteria || "",
        dataCollectionType: goal.dataCollectionType,
        status: goal.status,
        currentProgress: (goal as any).currentProgress || 0,
        dataPointsCount: allDataPoints.filter(dp => dp.goalId === goal.id).length,
        lastDataDate: allDataPoints.filter(dp => dp.goalId === goal.id).sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        )[0]?.date || null,
      }));

      // Transform data points for PDF
      const pdfDataPoints: PDFDataPoint[] = allDataPoints.map(dp => {
        const goal = goals.find(g => g.id === dp.goalId);
        return {
          id: dp.id,
          date: dp.date.toISOString().split('T')[0],
          goalTitle: goal?.title || 'Unknown Goal',
          progressValue: dp.progressValue.toString(),
          progressFormat: dp.progressFormat,
          levelOfSupport: dp.levelOfSupport || '[]',
          anecdotalInfo: dp.anecdotalInfo || '',
          createdAt: dp.createdAt?.toISOString().split('T')[0] || "",
        };
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Generate PDF
      console.log('Creating PDF generator...');
      const pdfGenerator = new PDFGenerator();
      console.log('Calling generateStudentReport...');
      pdfGenerator.generateStudentReport(pdfStudent, pdfGoals, pdfDataPoints);
      console.log('PDF generation completed successfully');

      toast({
        title: "Success",
        description: "PDF report has been generated and downloaded.",
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      console.error('Error message:', (error as any)?.message);
      console.error('Error stack:', (error as any)?.stack);
      toast({
        title: "Error",
        description: `Failed to generate PDF report: ${(error as any)?.message || 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const generateChartsPDF = async () => {
    try {
      if (!student || !goals || goals.length === 0) {
        toast({
          title: "No Data",
          description: "No student or goals data available to generate charts PDF.",
          variant: "destructive",
        });
        return;
      }

      // Check if we're on the Reports tab (where charts are visible)
      const isOnReportsTab = activeTab === 'reports';
      const visibleCharts = document.querySelectorAll('[data-goal-id]');
      
      if (!isOnReportsTab || visibleCharts.length === 0) {
        toast({
          title: "Charts Not Visible",
          description: "Please navigate to the Reports tab first, then click Print Charts to capture the visual charts.",
          variant: "destructive",
        });
        return;
      }

      console.log('Student data:', student);
      console.log('Goals data:', goals);
      console.log(`Found ${visibleCharts.length} visible charts`);

      const pdfStudent: PDFStudentData = {
        id: (student as any).id,
        name: (student as any).name,
        grade: (student as any).grade || 'Not specified',
        iepDueDate: (student as any).iepDueDate,
        relatedServices: (student as any).relatedServices || 'None specified',
        totalGoals: (student as any).totalGoals || 0,
        activeGoals: (student as any).activeGoals || 0,
        completedGoals: (student as any).completedGoals || 0,
        totalDataPoints: (student as any).totalDataPoints || 0
      };

      const pdfGoals: PDFGoalData[] = (goals || []).map((goal: any) => ({
        id: goal.id,
        title: goal.title,
        description: goal.description,
        targetCriteria: goal.targetCriteria,
        dataCollectionType: goal.dataCollectionType,
        status: goal.status,
        currentProgress: goal.currentProgress || 0,
        dataPointsCount: goal.dataPointsCount || 0,
        lastDataDate: null // Not needed for charts PDF
      }));

      console.log('Creating PDF generator...');
      const pdfGenerator = new PDFGenerator();
      console.log('Calling generateChartsReport...');
      await pdfGenerator.generateChartsReport(pdfStudent, pdfGoals);
      console.log('Charts PDF generation completed successfully');

      toast({
        title: "Success",
        description: "Charts PDF has been generated and downloaded.",
      });
    } catch (error) {
      console.error('Charts PDF generation error:', error);
      console.error('Error message:', (error as any)?.message);
      console.error('Error stack:', (error as any)?.stack);
      toast({
        title: "Error",
        description: `Failed to generate charts PDF: ${(error as any)?.message || 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  // Navigation confirmed working - proceeding with full interface

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <GraduationCap className="h-8 w-8 text-primary mr-3" />
              <h1 className="text-xl font-bold text-gray-900">Special Education Data Collection</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                onClick={async () => {
                  console.log("🔄 Manual refresh triggered");
                  
                  // Clear all cache and force fresh fetch
                  queryClient.clear();
                  
                  if (studentId) {
                    // Force immediate fresh fetch of all data
                    await Promise.all([
                      refetchStudent(),
                      refetchGoals(),
                      queryClient.refetchQueries({ queryKey: [`/api/students/${studentId}/all-data-points`] }),
                    ]);
                  }
                  
                  toast({
                    title: "Data Refreshed",
                    description: "All student data has been refreshed from the database.",
                  });
                  
                  console.log("✅ Manual refresh completed");
                }}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Data
              </Button>
              <div className="text-sm text-gray-600">{(user as any)?.email || 'Development Mode'}</div>
              <Button 
                variant="ghost"
                onClick={() => window.location.href = '/api/logout'}
                className="text-gray-400 hover:text-gray-600"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Student Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="p-2"
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">{(student as any)?.name}</h2>
              <p className="text-gray-600">
                {(student as any)?.grade ? `Grade ${(student as any).grade} • ` : ""}IEP Goals Dashboard
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              variant="outline"
              onClick={() => {
                console.log(`[REFRESH] Manually refreshing all data for Student ${studentId}`);
                queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}`] });
                queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}/goals`] });
                queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}/all-data-points`] });
                toast({
                  title: "Data Refreshed",
                  description: "All student data has been refreshed from the database.",
                });
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>

            {activeTab === 'reports' && (
              <Button 
                variant="outline" 
                onClick={generateChartsPDF}
                className="bg-blue-50 border-blue-300"
              >
                <ChartLine className="h-4 w-4 mr-2" />
                Print Charts
                <span className="ml-1 text-xs text-blue-600">✓</span>
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={() => setIsClearStudentDataModalOpen(true)}
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Student Data
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setIsRemoveStudentModalOpen(true)}
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              <UserX className="h-4 w-4 mr-2" />
              Remove from Caseload
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 bg-white shadow-sm">
            <TabsTrigger value="overview" className="flex items-center">
              Overview
            </TabsTrigger>
            <TabsTrigger value="goals" className="flex items-center">
              <Target className="h-4 w-4 mr-2" />
              Goals & Progress
            </TabsTrigger>
            <TabsTrigger value="live-collection" className="flex items-center">
              <Zap className="h-4 w-4 mr-2" />
              Live Collection
            </TabsTrigger>
            <TabsTrigger value="data-entry" className="flex items-center">
              <Edit className="h-4 w-4 mr-2" />
              Data Entry
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center">
              <ChartLine className="h-4 w-4 mr-2" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="raw-data" className="flex items-center">
              <Table className="h-4 w-4 mr-2" />
              Raw Data
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Student Information Card */}
            {student && (
              <StudentInfoCard 
                student={student as any} 
                onStudentUpdate={() => {
                  // Refresh student data when updated
                  queryClient.invalidateQueries({ queryKey: ["/api/students", studentId] });
                  queryClient.invalidateQueries({ queryKey: ["/api/students"] });
                }}
              />
            )}
            
            <div className="max-w-md mx-auto">
              {/* Student Summary Stats */}
              <Card className="bg-gradient-to-r from-blue-50 to-blue-100">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Active Goals</span>
                      <span className="font-semibold text-gray-900">{(student as any)?.activeGoals || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Completed Goals</span>
                      <span className="font-semibold text-gray-900">{(student as any)?.completedGoals || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Data Points</span>
                      <span className="font-semibold text-gray-900">{(student as any)?.totalDataPoints || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Assessment</span>
                      <span className="font-semibold text-gray-900">{lastUpdateText}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Goals & Progress Tab */}
          <TabsContent value="goals" className="space-y-6">
            {goalsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : !goals || goals.length === 0 ? (
              <Card className="p-12 text-center">
                <CardContent>
                  <Target className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Goals Yet</h3>
                  <p className="text-gray-600 mb-6">
                    Add the first IEP goal for {student.name} to start tracking progress.
                  </p>
                  <Button onClick={() => setIsAddGoalModalOpen(true)}>
                    <Plus className="h-5 w-5 mr-2" />
                    Add First Goal
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {goals.map((goal) => (
                  <div key={goal.id} className="space-y-4">
                    <GoalProgressCard 
                      goal={{
                        ...goal,
                        targetCriteria: goal.targetCriteria,
                        currentProgress: (goal as any).currentProgress || 0,
                        averageScore: (goal as any).averageScore || 0,
                        trend: (goal as any).trend || 'stable',
                        lastScore: (goal as any).lastScore || 0,
                        dataPointsCount: (goal as any).dataPointsCount || 0,
                      }}
                      onEditGoal={() => {
                        setEditingGoal(goal);
                        setIsEditGoalModalOpen(true);
                      }}
                      onDeleteGoal={() => {
                        setDeletingGoalId(goal.id);
                      }}
                    />
                    <ObjectivesList goalId={goal.id} studentId={studentId!} />
                  </div>
                ))}
                
                {/* Add New Goal Button */}
                <Card className="border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors cursor-pointer">
                  <CardContent 
                    className="p-8 text-center"
                    onClick={() => setIsAddGoalModalOpen(true)}
                  >
                    <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <Plus className="h-6 w-6 text-gray-600" />
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Add New Goal</h4>
                    <p className="text-gray-600">Create a new IEP goal for this student</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Live Collection Tab */}
          <TabsContent value="live-collection" className="space-y-6">
            {!goals || goals.length === 0 ? (
              <Card className="p-12 text-center">
                <CardContent>
                  <Timer className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Goals for Live Collection</h3>
                  <p className="text-gray-600 mb-6">
                    Add some goals first to use real-time data collection tools.
                  </p>
                  <Button onClick={() => setActiveTab("goals")}>
                    <Target className="h-5 w-5 mr-2" />
                    Go to Goals
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Real-Time Data Collection</h3>
                  <p className="text-gray-600">Quick tools for collecting data during observations</p>
                </div>
                
                {/* Goal Selection for Live Collection */}
                <Card>
                  <CardContent className="p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Select Goal for Live Collection</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {goals.map((goal) => (
                        <Button
                          key={goal.id}
                          variant={selectedGoalId === goal.id ? "default" : "outline"}
                          className="h-auto p-4 text-left flex flex-col items-start w-full"
                          onClick={() => {
                            setSelectedGoalId(goal.id);
                            setSelectedObjectiveId(null); // Reset objective selection when goal changes
                          }}
                        >
                          <div className="font-semibold mb-2 w-full">{goal.title}</div>
                          <div className="text-sm opacity-80 text-left leading-relaxed w-full break-words whitespace-normal">
                            {goal.description}
                          </div>
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Objective Selection for Live Collection */}
                {selectedGoalId && objectives.length > 0 && (
                  <Card>
                    <CardContent className="p-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">
                        Select Objective (Optional)
                      </h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Choose a specific objective or collect general goal data
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Button
                          variant={selectedObjectiveId === null ? "default" : "outline"}
                          className="h-auto p-4 text-left flex flex-col items-start w-full"
                          onClick={() => setSelectedObjectiveId(null)}
                        >
                          <div className="font-semibold mb-1 w-full text-blue-600">General Goal Data</div>
                          <div className="text-xs text-gray-600 w-full">
                            Collect data for the goal overall
                          </div>
                        </Button>
                        {objectives.map((objective: any) => (
                          <Button
                            key={objective.id}
                            variant={selectedObjectiveId === objective.id ? "default" : "outline"}
                            className="h-auto p-4 text-left flex flex-col items-start w-full"
                            onClick={() => setSelectedObjectiveId(objective.id)}
                          >
                            <div className="font-semibold mb-1 w-full text-green-600">
                              Objective
                            </div>
                            <div className="text-xs text-gray-600 text-left leading-relaxed w-full break-words whitespace-normal">
                              {objective.description || 'No description provided'}
                            </div>
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Live Collection Tools */}
                {selectedGoalId && (
                  <LiveCollectionTools 
                    goalId={selectedGoalId}
                    objectiveId={selectedObjectiveId}
                    studentId={studentId!}
                    goals={goals}
                    objectives={objectives}
                    onDataCollected={() => {
                      refetchStudent();
                      refetchGoals();
                      refetchObjectives();
                      refetchAllDataPoints();
                    }}
                  />
                )}
              </div>
            )}
          </TabsContent>

          {/* Data Entry Tab */}
          <TabsContent value="data-entry">
            <Card>
              <CardContent className="p-6">
                <DataEntryForm 
                  studentId={studentId || 0} 
                  goals={(goals || []).map(goal => ({
                    ...goal,
                    studentId: goal.studentId || studentId || 0,
                    levelOfSupport: goal.levelOfSupport || undefined
                  }))}
                  selectedGoalId={selectedGoalId || undefined}
                  onSuccess={() => {
                    refetchStudent();
                    refetchGoals();
                    refetchDataPoints();
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            {!goals || goals.length === 0 ? (
              <Card className="p-12 text-center">
                <CardContent>
                  <ChartLine className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Goals to Report</h3>
                  <p className="text-gray-600 mb-6">
                    Add some goals first to view progress reports and charts.
                  </p>
                  <Button onClick={() => setActiveTab("goals")}>
                    <Target className="h-5 w-5 mr-2" />
                    Go to Goals
                  </Button>
                </CardContent>
              </Card>
            ) : selectedGoalId ? (
              <>
                {/* Back button to return to all charts */}
                <div className="mb-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedGoalId(null)}
                    className="mb-4"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to All Charts
                  </Button>
                </div>
                {/* Individual Goal Chart with Type Selection */}
                <GoalChart goalId={selectedGoalId} />
              </>
            ) : (
              <div className="space-y-8">
                {goals.map((goal) => (
                  <div key={goal.id} className="space-y-6">
                    {/* Goal Chart */}
                    <StudentScatterplot 
                      studentId={studentId || 0} 
                      goalId={goal.id}
                    />
                    
                    {/* Objectives Charts for this Goal */}
                    <ObjectiveChartsForGoal goalId={goal.id} />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Raw Data Tab */}
          <TabsContent value="raw-data">
            <RawDataTable studentId={studentId!} student={student} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Goal Modal */}
      <AddGoalModal
        studentId={studentId!}
        isOpen={isAddGoalModalOpen}
        onClose={() => setIsAddGoalModalOpen(false)}
        onSuccess={() => {
          refetchGoals();
          setIsAddGoalModalOpen(false);
        }}
      />

      {/* Edit Goal Modal */}
      {editingGoal && (
        <EditGoalModal
          goal={editingGoal}
          isOpen={isEditGoalModalOpen}
          onClose={() => {
            setIsEditGoalModalOpen(false);
            setEditingGoal(null);
          }}
          onSuccess={() => {
            refetchGoals();
            setIsEditGoalModalOpen(false);
            setEditingGoal(null);
          }}
        />
      )}

      {/* Clear Student Data Modal */}
      <ClearDataModal
        isOpen={isClearStudentDataModalOpen}
        onClose={() => setIsClearStudentDataModalOpen(false)}
        type="student"
        studentId={studentId}
        studentName={student?.name}
      />

      {/* Remove Student Modal */}
      <ClearDataModal
        isOpen={isRemoveStudentModalOpen}
        onClose={() => setIsRemoveStudentModalOpen(false)}
        type="remove"
        studentId={studentId}
        studentName={student?.name}
      />

      {/* Delete Goal Confirmation Dialog */}
      <AlertDialog open={!!deletingGoalId} onOpenChange={() => setDeletingGoalId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Goal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this goal? This action cannot be undone and will permanently delete all associated objectives and data points.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingGoalId && deleteGoalMutation.mutate(deletingGoalId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Goal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
