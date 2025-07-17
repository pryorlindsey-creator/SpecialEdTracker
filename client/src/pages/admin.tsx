import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Database, Users, Target, BarChart3, Trash2, Eye, RefreshCw } from "lucide-react";

interface AdminStats {
  totalUsers: number;
  totalStudents: number;
  totalGoals: number;
  totalDataPoints: number;
  recentActivity: Array<{
    id: number;
    type: string;
    description: string;
    timestamp: string;
  }>;
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const { toast } = useToast();

  // Check if already authenticated
  useEffect(() => {
    const isAdminAuth = localStorage.getItem("admin_authenticated") === "true";
    setIsAuthenticated(isAdminAuth);
  }, []);

  const loginMutation = useMutation({
    mutationFn: async (creds: { username: string; password: string }) => {
      if (creds.username === "SandraLindsey@speechpathai" && creds.password === "IsabelShea@1998") {
        return { success: true };
      }
      throw new Error("Invalid credentials");
    },
    onSuccess: () => {
      localStorage.setItem("admin_authenticated", "true");
      setIsAuthenticated(true);
      toast({
        title: "Success",
        description: "Admin login successful",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Invalid admin credentials",
        variant: "destructive",
      });
    },
  });

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ["/api/admin/stats"],
    enabled: isAuthenticated,
  });

  const { data: users } = useQuery({
    queryKey: ["/api/admin/users"],
    enabled: isAuthenticated,
  });

  const { data: students } = useQuery({
    queryKey: ["/api/admin/students"],
    enabled: isAuthenticated,
  });

  const { data: goals } = useQuery({
    queryKey: ["/api/admin/goals"],
    enabled: isAuthenticated,
  });

  const { data: schema } = useQuery({
    queryKey: ["/api/admin/schema"],
    enabled: isAuthenticated,
  });

  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const { data: tableData } = useQuery({
    queryKey: [`/api/admin/table/${selectedTable}`],
    enabled: isAuthenticated && !!selectedTable,
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      refetchStats();
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(credentials);
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_authenticated");
    setIsAuthenticated(false);
    setCredentials({ username: "", password: "" });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center text-center">
              <Database className="h-6 w-6 mr-2" />
              Database Administrator Login
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={credentials.username}
                  onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? "Logging in..." : "Login"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Database className="h-8 w-8 text-primary mr-3" />
              <h1 className="text-xl font-bold text-gray-900">Database Administrator</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">Admin: sandralindsey</div>
              <Button 
                variant="ghost"
                onClick={handleLogout}
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
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">System Overview</h2>
          <p className="text-gray-600 mt-1">Manage users, data, and system statistics</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div className="ml-4">
                  <p className="text-gray-600 text-sm">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.totalUsers || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Users className="h-6 w-6 text-secondary" />
                </div>
                <div className="ml-4">
                  <p className="text-gray-600 text-sm">Total Students</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.totalStudents || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Target className="h-6 w-6 text-accent" />
                </div>
                <div className="ml-4">
                  <p className="text-gray-600 text-sm">Total Goals</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.totalGoals || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-gray-600 text-sm">Data Points</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.totalDataPoints || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Management Tabs */}
        <Tabs defaultValue="database" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="database">Database Tables</TabsTrigger>
            <TabsTrigger value="users">Users Management</TabsTrigger>
            <TabsTrigger value="students">Students Data</TabsTrigger>
            <TabsTrigger value="goals">Goals & Progress</TabsTrigger>
          </TabsList>

          <TabsContent value="database">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Database Tables List */}
              <Card>
                <CardHeader>
                  <CardTitle>Database Tables</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {schema && Object.keys(schema).map((tableName) => (
                      <Button
                        key={tableName}
                        variant={selectedTable === tableName ? "default" : "outline"}
                        className="w-full justify-start"
                        onClick={() => setSelectedTable(tableName)}
                      >
                        <Database className="h-4 w-4 mr-2" />
                        {schema[tableName].tableName}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Table Details */}
              {selectedTable && schema && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Table: {schema[selectedTable].tableName}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.location.href = '/'}
                      >
                        ← Back to Main
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">Fields:</h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Field Name</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Attributes</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {schema[selectedTable].fields.map((field: any) => (
                              <TableRow key={field.name}>
                                <TableCell className="font-mono">{field.name}</TableCell>
                                <TableCell>{field.type}</TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    {field.isPrimary && (
                                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                        PRIMARY
                                      </span>
                                    )}
                                    {field.isForeign && (
                                      <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                                        FOREIGN
                                      </span>
                                    )}
                                    {field.isUnique && (
                                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                                        UNIQUE
                                      </span>
                                    )}
                                  </div>
                                  {field.references && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      → {field.references}
                                    </div>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2">Sample Data:</h4>
                        {tableData && tableData.length > 0 ? (
                          <div className="max-h-64 overflow-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  {Object.keys(tableData[0]).map((key) => (
                                    <TableHead key={key}>{key}</TableHead>
                                  ))}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {tableData.slice(0, 5).map((row: any, index: number) => (
                                  <TableRow key={index}>
                                    {Object.values(row).map((value: any, colIndex: number) => (
                                      <TableCell key={colIndex} className="max-w-32 truncate">
                                        {value?.toString() || 'NULL'}
                                      </TableCell>
                                    ))}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                            {tableData.length > 5 && (
                              <p className="text-sm text-gray-500 mt-2">
                                Showing 5 of {tableData.length} records
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-gray-500">No data available</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  User Management
                  <Button onClick={() => refetchStats()} size="sm" variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User ID</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.map((user: any) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-mono text-sm">{user.id}</TableCell>
                        <TableCell>{user.email || "No email"}</TableCell>
                        <TableCell>{`${user.firstName || ""} ${user.lastName || ""}`.trim() || "No name"}</TableCell>
                        <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => deleteUserMutation.mutate(user.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="students">
            <Card>
              <CardHeader>
                <CardTitle>Students Database</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Teacher</TableHead>
                      <TableHead>Goals</TableHead>
                      <TableHead>Data Points</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students?.map((student: any) => (
                      <TableRow key={student.id}>
                        <TableCell>{student.id}</TableCell>
                        <TableCell>{student.name}</TableCell>
                        <TableCell>{student.grade || "Not specified"}</TableCell>
                        <TableCell>{student.teacherEmail || "Unknown"}</TableCell>
                        <TableCell>{student.totalGoals || 0}</TableCell>
                        <TableCell>{student.totalDataPoints || 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="goals">
            <Card>
              <CardHeader>
                <CardTitle>Goals and Progress Data</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Goal ID</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Data Points</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {goals?.map((goal: any) => (
                      <TableRow key={goal.id}>
                        <TableCell>{goal.id}</TableCell>
                        <TableCell>{goal.title}</TableCell>
                        <TableCell>{goal.studentName}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            goal.status === 'active' ? 'bg-green-100 text-green-800' :
                            goal.status === 'mastered' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {goal.status}
                          </span>
                        </TableCell>
                        <TableCell>{goal.currentProgress?.toFixed(1)}%</TableCell>
                        <TableCell>{goal.dataPointsCount || 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}