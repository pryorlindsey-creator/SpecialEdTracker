import { useState, useEffect } from "react";
import React from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { ArrowLeft, Plus, Printer, ChartLine, Target, Edit, Table, BarChart3, RefreshCw } from "lucide-react";
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
import { format } from "date-fns";

export default function StudentDetail() {
  const params = useParams();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [isAddGoalModalOpen, setIsAddGoalModalOpen] = useState(false);
  const [isEditGoalModalOpen, setIsEditGoalModalOpen] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);
  const [editingGoal, setEditingGoal] = useState<any>(null);

  const studentId = params.id ? parseInt(params.id) : null;
  
  console.log(`[STUDENT DETAIL] Component loaded with params:`, params);
  console.log(`[STUDENT DETAIL] Parsed studentId:`, studentId);

  const { data: student, isLoading: studentLoading, error: studentError, refetch: refetchStudent } = useQuery({
    queryKey: [`/api/students/${studentId}`],
    enabled: !!studentId,
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: 'always',
  });

  const { data: goals, isLoading: goalsLoading, error: goalsError, refetch: refetchGoals } = useQuery({
    queryKey: [`/api/students/${studentId}/goals`],
    enabled: !!studentId,
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: 'always',
  });

  const { data: dataPoints, isLoading: dataPointsLoading, refetch: refetchDataPoints } = useQuery({
    queryKey: [`/api/goals/${selectedGoalId}/data-points`],
    enabled: !!selectedGoalId,
  });
  
  // Add error logging for debugging blank screen
  useEffect(() => {
    console.log(`[STUDENT DETAIL] Component mounted, studentId: ${studentId}`);
    console.log(`[STUDENT DETAIL] Student loading: ${studentLoading}`);
    console.log(`[STUDENT DETAIL] Student data:`, student);
    console.log(`[STUDENT DETAIL] Student error:`, studentError);
  }, [studentId, studentLoading, student, studentError]);

  // Force refresh all data when component mounts to prevent cache issues
  React.useEffect(() => {
    if (studentId) {
      console.log(`[STUDENT DETAIL] Force refreshing data for student ${studentId}`);
      queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}/goals`] });
      queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}/all-data-points`] });
    }
  }, [studentId]);

  // No auth handling needed in development mode

  if (studentLoading) {
    console.log(`[STUDENT DETAIL] Rendering loading state for student ${studentId}`);
    return (
      <div className="min-h-screen bg-surface">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (studentError) {
    console.log(`[STUDENT DETAIL] Student error occurred:`, studentError);
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
    console.log(`[STUDENT DETAIL] No student data found for ID: ${studentId}`);
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

  console.log(`[STUDENT DETAIL] Rendering student page for: ${student.name} (ID: ${student.id})`);

  const lastUpdateText = (student as any)?.lastDataPoint 
    ? format(new Date((student as any).lastDataPoint.date), "MMM d, yyyy")
    : "No data yet";

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
            <Button variant="outline">
              <Printer className="h-4 w-4 mr-2" />
              Print Report
            </Button>
            <Button onClick={() => setActiveTab("data-entry")}>
              <Plus className="h-4 w-4 mr-2" />
              Add Data
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white shadow-sm">
            <TabsTrigger value="overview" className="flex items-center">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="goals" className="flex items-center">
              <Target className="h-4 w-4 mr-2" />
              Goals & Progress
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
                  <GoalProgressCard 
                    key={goal.id} 
                    goal={goal} 
                    onRefresh={refetchGoals}
                    onViewChart={() => {
                      setSelectedGoalId(goal.id);
                      setActiveTab("reports");
                    }}
                    onAddData={() => {
                      setSelectedGoalId(goal.id);
                      setActiveTab("data-entry");
                    }}
                    onEditGoal={() => {
                      setEditingGoal(goal);
                      setIsEditGoalModalOpen(true);
                    }}
                  />
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

          {/* Data Entry Tab */}
          <TabsContent value="data-entry">
            <Card>
              <CardContent className="p-6">
                <DataEntryForm 
                  studentId={studentId!} 
                  goals={goals || []}
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
            ) : (
              <>
                {/* Individual Goal Charts */}
                {goals.map((goal) => (
                  <StudentScatterplot 
                    key={goal.id} 
                    studentId={studentId || 0} 
                    goalId={goal.id}
                  />
                ))}
              </>
            )}
          </TabsContent>

          {/* Raw Data Tab */}
          <TabsContent value="raw-data">
            <RawDataTable studentId={studentId!} />
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
    </div>
  );
}
