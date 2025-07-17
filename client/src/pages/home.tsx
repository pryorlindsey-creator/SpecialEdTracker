import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Users, Target, BarChart3, Calendar, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import StudentOverviewCard from "@/components/student-overview-card";
import AddStudentModal from "@/components/add-student-modal";
import DashboardCalendar from "@/components/dashboard-calendar";
import { ReportingPeriodsButton } from "@/components/reporting-periods-modal";
import ReportingPeriodsDisplay from "@/components/reporting-periods-display";

export default function Home() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);

  const { data: students, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/students"],
    enabled: !!user,
    retry: 3,
    staleTime: 0, // Always fetch fresh data
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

  const studentsArray = Array.isArray(students) ? students : [];
  const totalStudents = studentsArray.length || 0;
  const totalGoals = studentsArray.reduce((sum: number, student: any) => sum + (student.totalGoals || 0), 0) || 0;
  const activeGoals = studentsArray.reduce((sum: number, student: any) => sum + (student.activeGoals || 0), 0) || 0;
  const totalDataPoints = studentsArray.reduce((sum: number, student: any) => sum + (student.totalDataPoints || 0), 0) || 0;

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
              <div className="text-sm text-gray-600">{(user as any)?.email || 'User'}</div>
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
        <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-8 max-w-sm">
          <Card 
            className="hover:shadow-md transition-shadow cursor-pointer hover:bg-gray-50"
            onClick={() => {
              // Scroll to the students section
              const studentsSection = document.getElementById('students-section');
              if (studentsSection) {
                studentsSection.scrollIntoView({ behavior: 'smooth' });
              }
            }}
          >
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div className="ml-4">
                  <p className="text-gray-600 text-sm">Total Students</p>
                  <p className="text-2xl font-bold text-gray-900">{totalStudents}</p>
                </div>
                <div className="ml-auto">
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Calendar and Students Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2">
            <DashboardCalendar />
          </div>
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Button 
                    onClick={() => setIsAddStudentModalOpen(true)}
                    className="w-full justify-start"
                    variant="outline"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Student
                  </Button>
                  <Button 
                    onClick={() => window.location.href = '/admin'}
                    className="w-full justify-start"
                    variant="outline"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Admin Panel
                  </Button>
                  <ReportingPeriodsButton />
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      console.log('=== MANUAL LOCALSTORAGE CHECK ===');
                      const data = localStorage.getItem('reportingPeriods');
                      console.log('localStorage reportingPeriods:', data);
                      if (data) {
                        try {
                          const parsed = JSON.parse(data);
                          console.log('Parsed data:', parsed);
                          alert(`Found ${parsed.periods?.length || 0} periods in localStorage. Check console for details.`);
                        } catch (e) {
                          console.error('Parse error:', e);
                          alert('Invalid data in localStorage');
                        }
                      } else {
                        alert('No reporting periods found in localStorage');
                      }
                      console.log('=== END MANUAL CHECK ===');
                    }}
                    className="w-full justify-start"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Check Old Data
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Reporting Periods Display */}
            <ReportingPeriodsDisplay />
          </div>
        </div>

        {/* Students Grid */}
        <div id="students-section">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">All Students</h3>
          {!studentsArray || studentsArray.length === 0 ? (
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
              {studentsArray.map((student: any) => (
                <StudentOverviewCard key={student.id} student={student} />
              ))}
            </div>
          )}
        </div>
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
