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
                onClick={() => window.location.href = '/landing'}
                className="text-gray-600 hover:text-gray-800"
              >
                View Landing Page
              </Button>
              <Button 
                variant="outline"
                size="sm"
                onClick={() => {
                  // Clear session and reload to see customer experience
                  fetch('/api/logout', { method: 'POST' })
                    .then(() => window.location.reload())
                    .catch(() => window.location.reload());
                }}
                className="text-gray-600 hover:text-gray-800"
              >
                Logout
              </Button>
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
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">My Students</h2>
          <p className="text-gray-600 mt-1">Manage IEP goals and track student progress</p>
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
                    onClick={() => window.location.href = '/group-collection'}
                    className="w-full justify-start"
                    variant="outline"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Group Data Collection
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
                </div>
              </CardContent>
            </Card>

            {/* Reporting Periods Display */}
            <ReportingPeriodsDisplay />
          </div>
        </div>

        {/* Students Grid */}
        <div id="students-section">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-900">All Students</h3>
            <Button 
              onClick={() => setIsAddStudentModalOpen(true)}
              size="lg"
              className="shadow-sm"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add New Student
            </Button>
          </div>
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
            <div className="space-y-8">
              {(() => {
                // Normalize grade function to standardize grade formats
                const normalizeGrade = (grade: string) => {
                  if (!grade) return 'No Grade Assigned';
                  const g = grade.trim();
                  if (g === 'PreK') return 'PreK';
                  if (g === 'K' || g === 'Kindergarten') return 'Kindergarten';
                  if (g === '1' || g === '1st' || g === '1st Grade') return '1st Grade';
                  if (g === '2' || g === '2nd' || g === '2nd Grade') return '2nd Grade';
                  if (g === '3' || g === '3rd' || g === '3rd Grade') return '3rd Grade';
                  if (g === '4' || g === '4th' || g === '4th Grade') return '4th Grade';
                  if (g === '5' || g === '5th' || g === '5th Grade') return '5th Grade';
                  if (g === '6' || g === '6th' || g === '6th Grade') return '6th Grade';
                  if (g === '7' || g === '7th' || g === '7th Grade') return '7th Grade';
                  if (g === '8' || g === '8th' || g === '8th Grade') return '8th Grade';
                  if (g === '9' || g === '9th' || g === '9th Grade') return '9th Grade';
                  if (g === '10' || g === '10th' || g === '10th Grade') return '10th Grade';
                  if (g === '11' || g === '11th' || g === '11th Grade') return '11th Grade';
                  if (g === '12' || g === '12th' || g === '12th Grade') return '12th Grade';
                  return g; // Return as-is for other formats
                };

                // Group students by normalized grade level
                const gradeGroups = studentsArray.reduce((groups: any, student: any) => {
                  const normalizedGrade = normalizeGrade(student.grade);
                  if (!groups[normalizedGrade]) {
                    groups[normalizedGrade] = [];
                  }
                  groups[normalizedGrade].push(student);
                  return groups;
                }, {});

                // Sort grades logically (PreK, K, 1st, 2nd, etc., then unassigned)
                const sortedGrades = Object.keys(gradeGroups).sort((a, b) => {
                  if (a === 'No Grade Assigned') return 1;
                  if (b === 'No Grade Assigned') return -1;
                  if (a === 'PreK') return -1;
                  if (b === 'PreK') return 1;
                  if (a === 'Kindergarten') return -1;
                  if (b === 'Kindergarten') return 1;
                  
                  // Extract numbers from grade strings for numerical sorting
                  const aNum = parseInt(a.match(/\d+/)?.[0] || '999');
                  const bNum = parseInt(b.match(/\d+/)?.[0] || '999');
                  return aNum - bNum;
                });

                return sortedGrades.map(grade => (
                  <div key={grade} className="space-y-4">
                    <div className="flex items-center">
                      <GraduationCap className="h-5 w-5 text-blue-600 mr-2" />
                      <h4 className="text-lg font-medium text-gray-800">{grade}</h4>
                      <div className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                        {gradeGroups[grade].length} student{gradeGroups[grade].length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {gradeGroups[grade].map((student: any) => (
                        <StudentOverviewCard key={student.id} student={student} />
                      ))}
                    </div>
                  </div>
                ));
              })()}
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
