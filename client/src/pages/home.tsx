import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Users, Target, BarChart3, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import StudentOverviewCard from "@/components/student-overview-card";
import AddStudentModal from "@/components/add-student-modal";

export default function Home() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);

  const { data: students, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/students"],
    enabled: !!user,
  });

  // Handle unauthorized errors
  useEffect(() => {
    if (error && isUnauthorizedError(error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [error, toast]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-surface">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  const totalStudents = students?.length || 0;
  const totalGoals = students?.reduce((sum, student) => sum + (student.totalGoals || 0), 0) || 0;
  const activeGoals = students?.reduce((sum, student) => sum + (student.activeGoals || 0), 0) || 0;
  const totalDataPoints = students?.reduce((sum, student) => sum + (student.totalDataPoints || 0), 0) || 0;

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
              <div className="text-sm text-gray-600">{user?.email}</div>
              <Button 
                variant="outline"
                size="sm"
                onClick={() => window.location.href = '/admin'}
                className="text-gray-600 hover:text-gray-800"
              >
                Admin Panel
              </Button>
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
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">My Students</h2>
            <p className="text-gray-600 mt-1">Manage IEP goals and track student progress</p>
          </div>
          <Button 
            onClick={() => setIsAddStudentModalOpen(true)}
            size="lg"
            className="shadow-sm"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add New Student
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div className="ml-4">
                  <p className="text-gray-600 text-sm">Total Students</p>
                  <p className="text-2xl font-bold text-gray-900">{totalStudents}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Target className="h-6 w-6 text-secondary" />
                </div>
                <div className="ml-4">
                  <p className="text-gray-600 text-sm">Active Goals</p>
                  <p className="text-2xl font-bold text-gray-900">{activeGoals}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-accent" />
                </div>
                <div className="ml-4">
                  <p className="text-gray-600 text-sm">Data Points</p>
                  <p className="text-2xl font-bold text-gray-900">{totalDataPoints}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-gray-600 text-sm">Total Goals</p>
                  <p className="text-2xl font-bold text-gray-900">{totalGoals}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Students Grid */}
        {!students || students.length === 0 ? (
          <Card className="p-12 text-center">
            <CardContent>
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Students Yet</h3>
              <p className="text-gray-600 mb-6">
                Get started by adding your first student to begin tracking IEP goals and progress.
              </p>
              <Button onClick={() => setIsAddStudentModalOpen(true)}>
                <Plus className="h-5 w-5 mr-2" />
                Add Your First Student
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {students.map((student) => (
              <StudentOverviewCard key={student.id} student={student} />
            ))}
          </div>
        )}
      </div>

      {/* Add Student Modal */}
      <AddStudentModal
        isOpen={isAddStudentModalOpen}
        onClose={() => setIsAddStudentModalOpen(false)}
        onSuccess={() => {
          refetch();
          setIsAddStudentModalOpen(false);
        }}
      />
    </div>
  );
}
