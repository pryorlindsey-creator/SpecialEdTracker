import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

import { Users, Play, Square, Save, Plus, Minus, Check, X, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";

interface Student {
  id: number;
  name: string;
  grade: string;
}

interface Goal {
  id: number;
  studentId: number;
  title: string;
  dataType: 'frequency' | 'duration' | 'percentage';
}

interface StudentGoalData {
  studentId: number;
  studentName: string;
  goalId: number;
  goalTitle: string;
  dataType: 'frequency' | 'duration' | 'percentage';
  // Frequency data
  frequencyCount: number;
  // Duration data
  durationMinutes: number;
  durationSeconds: number;
  durationTimer: number;
  isTimerRunning: boolean;
  // Percentage data
  correctTrials: number;
  totalTrials: number;
}

export default function GroupCollection() {
  const { toast } = useToast();
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [selectedGoals, setSelectedGoals] = useState<{[studentId: number]: number}>({});
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [studentData, setStudentData] = useState<StudentGoalData[]>([]);
  const [timerIntervals, setTimerIntervals] = useState<{[key: string]: NodeJS.Timeout}>({});

  // Fetch all students
  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ["/api/students"],
  });

  // Fetch goals for selected students
  const { data: allGoals = [] } = useQuery<Goal[]>({
    queryKey: ["/api/goals/multi-student", selectedStudents],
    enabled: selectedStudents.length > 0,
    queryFn: async () => {
      const goalPromises = selectedStudents.map(studentId =>
        fetch(`/api/students/${studentId}/goals`).then(res => res.json())
      );
      const goalArrays = await Promise.all(goalPromises);
      return goalArrays.flat();
    }
  });

  const handleStudentToggle = (studentId: number) => {
    setSelectedStudents(prev => {
      const newSelected = prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId];
      
      // Clear goal selection if student is deselected
      if (!newSelected.includes(studentId)) {
        setSelectedGoals(prev => {
          const updated = { ...prev };
          delete updated[studentId];
          return updated;
        });
      }
      
      return newSelected;
    });
  };

  const handleGoalSelection = (studentId: number, goalId: number) => {
    setSelectedGoals(prev => ({
      ...prev,
      [studentId]: goalId
    }));
  };

  const startSession = () => {
    if (Object.keys(selectedGoals).length === 0) {
      toast({
        title: "No Goals Selected",
        description: "Please select at least one goal to start collecting data.",
        variant: "destructive"
      });
      return;
    }

    setIsSessionActive(true);
    setSessionStartTime(new Date());
    
    // Initialize student data
    const initialData: StudentGoalData[] = Object.entries(selectedGoals).map(([studentIdStr, goalId]) => {
      const studentId = parseInt(studentIdStr);
      const student = students.find(s => s.id === studentId);
      const goal = allGoals.find(g => g.id === goalId);
      
      return {
        studentId,
        studentName: student?.name || 'Unknown',
        goalId,
        goalTitle: goal?.title || 'Unknown',
        dataType: goal?.dataType || 'frequency',
        frequencyCount: 0,
        durationMinutes: 0,
        durationSeconds: 0,
        durationTimer: 0,
        isTimerRunning: false,
        correctTrials: 0,
        totalTrials: 0
      };
    });
    
    setStudentData(initialData);
    toast({
      title: "Session Started",
      description: "Group data collection session is now active",
    });
  };

  const stopSession = () => {
    setIsSessionActive(false);
    setSessionStartTime(null);
    
    // Clear all running timers
    Object.values(timerIntervals).forEach(interval => clearInterval(interval));
    setTimerIntervals({});
    
    // Stop all duration timers
    setStudentData(prev => prev.map(data => ({
      ...data,
      isTimerRunning: false
    })));
    
    toast({
      title: "Session Stopped",
      description: "Group data collection session has ended",
    });
  };

  const updateStudentData = (studentId: number, goalId: number, updates: Partial<StudentGoalData>) => {
    setStudentData(prev => prev.map(data => 
      data.studentId === studentId && data.goalId === goalId 
        ? { ...data, ...updates }
        : data
    ));
  };

  const incrementFrequency = (studentId: number, goalId: number) => {
    updateStudentData(studentId, goalId, {
      frequencyCount: studentData.find(d => d.studentId === studentId && d.goalId === goalId)?.frequencyCount + 1 || 1
    });
  };

  const decrementFrequency = (studentId: number, goalId: number) => {
    const current = studentData.find(d => d.studentId === studentId && d.goalId === goalId)?.frequencyCount || 0;
    if (current > 0) {
      updateStudentData(studentId, goalId, { frequencyCount: current - 1 });
    }
  };

  const startDurationTimer = (studentId: number, goalId: number) => {
    const key = `${studentId}-${goalId}`;
    updateStudentData(studentId, goalId, { isTimerRunning: true });
    
    const interval = setInterval(() => {
      setStudentData(prev => prev.map(data => 
        data.studentId === studentId && data.goalId === goalId 
          ? { ...data, durationTimer: data.durationTimer + 1 }
          : data
      ));
    }, 1000);
    
    setTimerIntervals(prev => ({ ...prev, [key]: interval }));
  };

  const stopDurationTimer = (studentId: number, goalId: number) => {
    const key = `${studentId}-${goalId}`;
    const interval = timerIntervals[key];
    
    if (interval) {
      clearInterval(interval);
      setTimerIntervals(prev => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
    }
    
    const currentData = studentData.find(d => d.studentId === studentId && d.goalId === goalId);
    if (currentData) {
      const totalSeconds = currentData.durationTimer;
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      
      updateStudentData(studentId, goalId, {
        isTimerRunning: false,
        durationMinutes: minutes,
        durationSeconds: seconds
      });
    }
  };

  const resetDurationTimer = (studentId: number, goalId: number) => {
    const key = `${studentId}-${goalId}`;
    const interval = timerIntervals[key];
    
    if (interval) {
      clearInterval(interval);
      setTimerIntervals(prev => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
    }
    
    updateStudentData(studentId, goalId, {
      durationTimer: 0,
      durationMinutes: 0,
      durationSeconds: 0,
      isTimerRunning: false
    });
  };

  const addTrial = (studentId: number, goalId: number, isCorrect: boolean) => {
    const currentData = studentData.find(d => d.studentId === studentId && d.goalId === goalId);
    if (currentData) {
      updateStudentData(studentId, goalId, {
        totalTrials: currentData.totalTrials + 1,
        correctTrials: isCorrect ? currentData.correctTrials + 1 : currentData.correctTrials
      });
    }
  };

  const removeTrial = (studentId: number, goalId: number) => {
    const currentData = studentData.find(d => d.studentId === studentId && d.goalId === goalId);
    if (currentData && currentData.totalTrials > 0) {
      // Remove from correct if last trial was correct
      const wasLastCorrect = currentData.correctTrials / currentData.totalTrials === Math.ceil(currentData.correctTrials / currentData.totalTrials);
      updateStudentData(studentId, goalId, {
        totalTrials: currentData.totalTrials - 1,
        correctTrials: wasLastCorrect ? Math.max(0, currentData.correctTrials - 1) : currentData.correctTrials
      });
    }
  };

  const saveAllData = async () => {
    try {
      const savePromises = studentData.map(async (data) => {
        let progressValue: string;
        let progressFormat: string;
        let numerator: number | null = null;
        let denominator: number | null = null;
        let durationUnit: string | null = null;

        if (data.dataType === 'frequency') {
          progressValue = data.frequencyCount.toString();
          progressFormat = 'frequency';
        } else if (data.dataType === 'duration') {
          const totalSeconds = data.durationMinutes * 60 + data.durationSeconds;
          progressValue = (totalSeconds / 60).toFixed(2);
          progressFormat = 'duration';
          durationUnit = 'minutes';
        } else { // percentage
          if (data.totalTrials === 0) return null; // Skip if no trials
          const percentage = (data.correctTrials / data.totalTrials) * 100;
          progressValue = percentage.toFixed(2);
          progressFormat = 'percentage';
          numerator = data.correctTrials;
          denominator = data.totalTrials;
        }

        const payload = {
          goalId: data.goalId,
          date: new Date().toISOString().split('T')[0],
          progressFormat,
          progressValue,
          numerator,
          denominator,
          durationUnit,
          levelOfSupport: [],
          anecdotalInfo: `Group collection session: ${sessionStartTime ? new Date().toISOString().split('T')[1].slice(0, 5) : 'Unknown time'}`
        };

        return apiRequest(`/api/goals/${data.goalId}/data-points`, {
          method: "POST",
          body: payload
        });
      });

      await Promise.all(savePromises.filter(p => p !== null));
      
      toast({
        title: "Data Saved Successfully",
        description: `Saved data for ${studentData.length} students`,
      });

      // Reset session
      stopSession();
      setStudentData([]);
      setSelectedGoals({});
      setSelectedStudents([]);

    } catch (error) {
      console.error("Error saving group data:", error);
      toast({
        title: "Error Saving Data",
        description: "There was an error saving the group data",
        variant: "destructive"
      });
    }
  };

  const formatDurationDisplay = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Users className="h-8 w-8 mr-3 text-blue-600" />
              Group Data Collection
            </h1>
            <p className="text-gray-600 mt-1">Collect data for multiple students simultaneously</p>
          </div>
          <Link href="/">
            <Button variant="outline">
              Back to Dashboard
            </Button>
          </Link>
        </div>

        {!isSessionActive ? (
          /* Setup Phase */
          <div className="space-y-6">
            {/* Student Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Select Students</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {students.map((student) => (
                    <div key={student.id} className="flex items-center space-x-3 p-3 rounded-lg border">
                      <Checkbox
                        checked={selectedStudents.includes(student.id)}
                        onCheckedChange={() => handleStudentToggle(student.id)}
                      />
                      <div>
                        <div className="font-medium">{student.name}</div>
                        <div className="text-sm text-gray-500">{student.grade}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Goal Selection */}
            {selectedStudents.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Select Goals for Each Student</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {selectedStudents.map((studentId) => {
                      const student = students.find(s => s.id === studentId);
                      const studentGoals = allGoals.filter(g => g.studentId === studentId);
                      
                      return (
                        <div key={studentId} className="p-4 border rounded-lg">
                          <h3 className="font-medium mb-3">{student?.name}</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {studentGoals.map((goal) => (
                              <div key={goal.id} className="flex items-center space-x-3">
                                <Checkbox
                                  checked={selectedGoals[studentId] === goal.id}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      handleGoalSelection(studentId, goal.id);
                                    } else {
                                      setSelectedGoals(prev => {
                                        const updated = { ...prev };
                                        delete updated[studentId];
                                        return updated;
                                      });
                                    }
                                  }}
                                />
                                <div className="flex-1">
                                  <div className="font-medium">{goal.title}</div>
                                  <Badge variant="secondary" className="text-xs">
                                    {goal.dataType}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Start Session */}
            {Object.keys(selectedGoals).length > 0 && (
              <div className="text-center">
                <Button onClick={startSession} size="lg" className="bg-green-600 hover:bg-green-700">
                  <Play className="h-5 w-5 mr-2" />
                  Start Group Session
                </Button>
              </div>
            )}
          </div>
        ) : (
          /* Active Session */
          <div className="space-y-6">
            {/* Session Header */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="font-medium">Session Active</span>
                    <span className="text-sm text-gray-500">
                      Started: {sessionStartTime?.toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="space-x-2">
                    <Button onClick={saveAllData} className="bg-blue-600 hover:bg-blue-700">
                      <Save className="h-4 w-4 mr-2" />
                      Save All Data
                    </Button>
                    <Button onClick={stopSession} variant="destructive">
                      <Square className="h-4 w-4 mr-2" />
                      Stop Session
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Student Data Collection Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {studentData.map((data) => (
                <Card key={`${data.studentId}-${data.goalId}`} className="h-fit">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{data.studentName}</CardTitle>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{data.goalTitle}</span>
                      <Badge variant="secondary">{data.dataType}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {data.dataType === 'frequency' && (
                      <div className="space-y-4">
                        <div className="text-center">
                          <div className="text-4xl font-bold text-blue-600">{data.frequencyCount}</div>
                          <div className="text-sm text-gray-500">occurrences</div>
                        </div>
                        <div className="flex justify-center space-x-2">
                          <Button
                            onClick={() => incrementFrequency(data.studentId, data.goalId)}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => decrementFrequency(data.studentId, data.goalId)}
                            size="sm"
                            variant="outline"
                            disabled={data.frequencyCount === 0}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {data.dataType === 'duration' && (
                      <div className="space-y-4">
                        <div className="text-center">
                          <div className="text-4xl font-bold text-green-600">
                            {formatDurationDisplay(data.durationTimer)}
                          </div>
                          <div className="text-sm text-gray-500">
                            Final: {data.durationMinutes}m {data.durationSeconds}s
                          </div>
                        </div>
                        <div className="flex justify-center space-x-2">
                          {!data.isTimerRunning ? (
                            <Button
                              onClick={() => startDurationTimer(data.studentId, data.goalId)}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              onClick={() => stopDurationTimer(data.studentId, data.goalId)}
                              size="sm"
                              variant="destructive"
                            >
                              <Square className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            onClick={() => resetDurationTimer(data.studentId, data.goalId)}
                            size="sm"
                            variant="outline"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {data.dataType === 'percentage' && (
                      <div className="space-y-4">
                        <div className="text-center">
                          <div className="text-4xl font-bold text-purple-600">
                            {data.totalTrials > 0 ? Math.round((data.correctTrials / data.totalTrials) * 100) : 0}%
                          </div>
                          <div className="text-sm text-gray-500">
                            {data.correctTrials} / {data.totalTrials} correct
                          </div>
                        </div>
                        <div className="flex justify-center space-x-2">
                          <Button
                            onClick={() => addTrial(data.studentId, data.goalId, true)}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => addTrial(data.studentId, data.goalId, false)}
                            size="sm"
                            className="bg-red-600 hover:bg-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => removeTrial(data.studentId, data.goalId)}
                            size="sm"
                            variant="outline"
                            disabled={data.totalTrials === 0}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}