import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, CheckCircle, Database, Search, User, Users, Target } from "lucide-react";

interface VerificationProps {
  onVerifyUser: (userId: string) => void;
  onVerifyStudent: (studentId: number) => void;
  onVerifyGoal: (goalId: number) => void;
  onSampleData: (userId: string) => void;
}

export default function AdminVerification({ onVerifyUser, onVerifyStudent, onVerifyGoal, onSampleData }: VerificationProps) {
  const [userIdInput, setUserIdInput] = useState("");
  const [studentIdInput, setStudentIdInput] = useState("");
  const [goalIdInput, setGoalIdInput] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const { data: users } = useQuery({
    queryKey: ["/api/admin/users"],
  });

  const { data: userVerification, refetch: refetchUserVerification } = useQuery({
    queryKey: ["/api/admin/verify/user", selectedUserId],
    enabled: !!selectedUserId,
  });

  const handleVerifyUser = () => {
    if (userIdInput.trim()) {
      setSelectedUserId(userIdInput.trim());
      onVerifyUser(userIdInput.trim());
    }
  };

  const handleQuickUserSelect = (userId: string) => {
    setUserIdInput(userId);
    setSelectedUserId(userId);
    onVerifyUser(userId);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* User Verification */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              User Data Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="userId">User ID</Label>
              <div className="flex gap-2">
                <Input
                  id="userId"
                  value={userIdInput}
                  onChange={(e) => setUserIdInput(e.target.value)}
                  placeholder="Enter user ID (e.g., 4201332)"
                />
                <Button onClick={handleVerifyUser} disabled={!userIdInput.trim()}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Quick User Selection */}
            {users && users.length > 0 && (
              <div className="space-y-2">
                <Label>Quick Select User:</Label>
                <div className="flex flex-wrap gap-2">
                  {users.slice(0, 6).map((user: any) => (
                    <Button
                      key={user.id}
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickUserSelect(user.id)}
                      className="text-xs"
                    >
                      {user.firstName || user.id}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* User Verification Results */}
            {userVerification && (
              <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  {userVerification.userExists ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className="font-medium">
                    User {userVerification.userId} {userVerification.userExists ? "exists" : "not found"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Students:</span> {userVerification.studentCount}
                  </div>
                  <div>
                    <span className="font-medium">Goals:</span> {userVerification.goalCount}
                  </div>
                  <div>
                    <span className="font-medium">Data Points:</span> {userVerification.dataPointCount}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Data Integrity:</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <Badge variant={userVerification.dataIntegrity.orphanedGoals === 0 ? "default" : "destructive"}>
                      Orphaned Goals: {userVerification.dataIntegrity.orphanedGoals}
                    </Badge>
                    <Badge variant={userVerification.dataIntegrity.orphanedDataPoints === 0 ? "default" : "destructive"}>
                      Orphaned Data Points: {userVerification.dataIntegrity.orphanedDataPoints}
                    </Badge>
                    <Badge variant={userVerification.dataIntegrity.studentsWithoutGoals === 0 ? "default" : "secondary"}>
                      Students w/o Goals: {userVerification.dataIntegrity.studentsWithoutGoals}
                    </Badge>
                    <Badge variant={userVerification.dataIntegrity.goalsWithoutDataPoints === 0 ? "default" : "secondary"}>
                      Goals w/o Data: {userVerification.dataIntegrity.goalsWithoutDataPoints}
                    </Badge>
                  </div>
                </div>

                <Button
                  onClick={() => onSampleData(userVerification.userId)}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <Database className="h-4 w-4 mr-2" />
                  View Sample Data
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Student & Goal Verification */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Individual Record Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="studentId">Student ID</Label>
              <div className="flex gap-2">
                <Input
                  id="studentId"
                  value={studentIdInput}
                  onChange={(e) => setStudentIdInput(e.target.value)}
                  placeholder="Enter student ID"
                  type="number"
                />
                <Button 
                  onClick={() => onVerifyStudent(parseInt(studentIdInput))} 
                  disabled={!studentIdInput.trim()}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="goalId">Goal ID</Label>
              <div className="flex gap-2">
                <Input
                  id="goalId"
                  value={goalIdInput}
                  onChange={(e) => setGoalIdInput(e.target.value)}
                  placeholder="Enter goal ID"
                  type="number"
                />
                <Button 
                  onClick={() => onVerifyGoal(parseInt(goalIdInput))} 
                  disabled={!goalIdInput.trim()}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="p-3 bg-blue-50 rounded-lg text-sm">
              <h4 className="font-medium mb-2">Verification Options:</h4>
              <ul className="space-y-1 text-xs">
                <li>• User verification shows data integrity and counts</li>
                <li>• Student verification displays goals and progress</li>
                <li>• Goal verification shows data points and calculations</li>
                <li>• Sample data provides representative records</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}