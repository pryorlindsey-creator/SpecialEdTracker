import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertStudentSchema, insertGoalSchema, insertDataPointSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/debug', (req: any, res) => {
    res.json({
      isAuthenticated: req.isAuthenticated(),
      hasUser: !!req.user,
      hasSession: !!req.session,
      sessionId: req.sessionID,
      userClaims: req.user?.claims || null,
      expires_at: req.user?.expires_at || null,
    });
  });

  // Temporary test route to create a user session for testing
  app.get('/api/auth/test-login', async (req: any, res) => {
    try {
      console.log("Creating test user session");
      
      // Create a test user
      const testUser = await storage.upsertUser({
        id: 'test-user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      });
      
      // Manually create session
      req.user = {
        claims: { sub: 'test-user-123', email: 'test@example.com' },
        expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      };
      
      req.session.passport = { user: req.user };
      
      console.log("Test user session created");
      res.redirect('/');
    } catch (error) {
      console.error("Error creating test session:", error);
      res.status(500).json({ message: "Failed to create test session" });
    }
  });

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log("Fetching user data for ID:", userId);
      const user = await storage.getUser(userId);
      console.log("User found:", !!user);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Student routes
  app.get('/api/students', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log("Fetching students for user ID:", userId);
      const students = await storage.getStudentsByUserId(userId);
      console.log("Found students:", students.length);
      
      // Get summary data for each student
      const studentsWithSummary = await Promise.all(
        students.map(async (student) => {
          const summary = await storage.getStudentSummary(student.id);
          console.log(`Student ${student.id} summary:`, summary);
          return {
            ...student,
            ...summary,
          };
        })
      );
      
      console.log("Returning students with summary:", studentsWithSummary.length);
      res.json(studentsWithSummary);
    } catch (error) {
      console.error("Error fetching students:", error);
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  app.post('/api/students', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log("Creating student for user:", userId);
      console.log("Request body:", req.body);
      
      const studentData = insertStudentSchema.parse({
        ...req.body,
        userId,
      });
      
      console.log("Parsed student data:", studentData);
      const student = await storage.createStudent(studentData);
      console.log("Student created successfully:", student.id);
      res.status(201).json(student);
    } catch (error) {
      console.error("Error creating student:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid student data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create student" });
      }
    }
  });

  app.get('/api/students/:id', isAuthenticated, async (req: any, res) => {
    try {
      const studentId = parseInt(req.params.id);
      const student = await storage.getStudentById(studentId);
      
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Verify ownership
      const userId = req.user.claims.sub;
      if (student.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const summary = await storage.getStudentSummary(studentId);
      res.json({ ...student, ...summary });
    } catch (error) {
      console.error("Error fetching student:", error);
      res.status(500).json({ message: "Failed to fetch student" });
    }
  });

  app.put('/api/students/:id', isAuthenticated, async (req: any, res) => {
    try {
      const studentId = parseInt(req.params.id);
      const existingStudent = await storage.getStudentById(studentId);
      
      if (!existingStudent) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Verify ownership
      const userId = req.user.claims.sub;
      if (existingStudent.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updateData = insertStudentSchema.partial().parse(req.body);
      const student = await storage.updateStudent(studentId, updateData);
      res.json(student);
    } catch (error) {
      console.error("Error updating student:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid student data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update student" });
      }
    }
  });

  app.delete('/api/students/:id', isAuthenticated, async (req: any, res) => {
    try {
      const studentId = parseInt(req.params.id);
      const existingStudent = await storage.getStudentById(studentId);
      
      if (!existingStudent) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Verify ownership
      const userId = req.user.claims.sub;
      if (existingStudent.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteStudent(studentId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting student:", error);
      res.status(500).json({ message: "Failed to delete student" });
    }
  });

  // Goal routes
  app.get('/api/students/:studentId/goals', isAuthenticated, async (req: any, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      const student = await storage.getStudentById(studentId);
      
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Verify ownership
      const userId = req.user.claims.sub;
      if (student.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const goals = await storage.getGoalsByStudentId(studentId);
      
      // Get progress data for each goal
      const goalsWithProgress = await Promise.all(
        goals.map(async (goal) => {
          const progress = await storage.getGoalProgress(goal.id);
          return {
            ...goal,
            currentProgress: progress.currentProgress,
            averageScore: progress.averageScore,
            trend: progress.trend,
            lastScore: progress.lastScore,
            dataPointsCount: progress.dataPoints.length,
          };
        })
      );
      
      res.json(goalsWithProgress);
    } catch (error) {
      console.error("Error fetching goals:", error);
      res.status(500).json({ message: "Failed to fetch goals" });
    }
  });

  app.post('/api/students/:studentId/goals', isAuthenticated, async (req: any, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      const userId = req.user.claims.sub;
      console.log("Creating goal for student:", studentId, "user:", userId);
      console.log("Goal request body:", req.body);
      
      const student = await storage.getStudentById(studentId);
      
      if (!student) {
        console.log("Student not found:", studentId);
        return res.status(404).json({ message: "Student not found" });
      }

      // Verify ownership
      if (student.userId !== userId) {
        console.log("Access denied - student belongs to:", student.userId, "but user is:", userId);
        return res.status(403).json({ message: "Access denied" });
      }

      const goalData = insertGoalSchema.parse({
        ...req.body,
        studentId,
      });
      
      console.log("Parsed goal data:", goalData);
      const goal = await storage.createGoal(goalData);
      console.log("Goal created successfully:", goal.id);
      res.status(201).json(goal);
    } catch (error) {
      console.error("Error creating goal:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid goal data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create goal" });
      }
    }
  });

  app.get('/api/goals/:id', isAuthenticated, async (req: any, res) => {
    try {
      const goalId = parseInt(req.params.id);
      const progress = await storage.getGoalProgress(goalId);
      
      // Verify ownership through student
      const student = await storage.getStudentById(progress.goal.studentId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      const userId = req.user.claims.sub;
      if (student.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(progress);
    } catch (error) {
      console.error("Error fetching goal progress:", error);
      res.status(500).json({ message: "Failed to fetch goal progress" });
    }
  });

  app.put('/api/goals/:id', isAuthenticated, async (req: any, res) => {
    try {
      const goalId = parseInt(req.params.id);
      const existingGoal = await storage.getGoalById(goalId);
      
      if (!existingGoal) {
        return res.status(404).json({ message: "Goal not found" });
      }

      // Verify ownership through student
      const student = await storage.getStudentById(existingGoal.studentId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      const userId = req.user.claims.sub;
      if (student.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updateData = insertGoalSchema.partial().parse(req.body);
      const goal = await storage.updateGoal(goalId, updateData);
      res.json(goal);
    } catch (error) {
      console.error("Error updating goal:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid goal data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update goal" });
      }
    }
  });

  app.delete('/api/goals/:id', isAuthenticated, async (req: any, res) => {
    try {
      const goalId = parseInt(req.params.id);
      const existingGoal = await storage.getGoalById(goalId);
      
      if (!existingGoal) {
        return res.status(404).json({ message: "Goal not found" });
      }

      // Verify ownership through student
      const student = await storage.getStudentById(existingGoal.studentId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      const userId = req.user.claims.sub;
      if (student.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteGoal(goalId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting goal:", error);
      res.status(500).json({ message: "Failed to delete goal" });
    }
  });

  // Data point routes
  app.get('/api/goals/:goalId/data-points', isAuthenticated, async (req: any, res) => {
    try {
      const goalId = parseInt(req.params.goalId);
      const goal = await storage.getGoalById(goalId);
      
      if (!goal) {
        return res.status(404).json({ message: "Goal not found" });
      }

      // Verify ownership through student
      const student = await storage.getStudentById(goal.studentId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      const userId = req.user.claims.sub;
      if (student.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const dataPoints = await storage.getDataPointsByGoalId(goalId);
      res.json(dataPoints);
    } catch (error) {
      console.error("Error fetching data points:", error);
      res.status(500).json({ message: "Failed to fetch data points" });
    }
  });

  app.post('/api/goals/:goalId/data-points', isAuthenticated, async (req: any, res) => {
    try {
      const goalId = parseInt(req.params.goalId);
      const goal = await storage.getGoalById(goalId);
      
      if (!goal) {
        return res.status(404).json({ message: "Goal not found" });
      }

      // Verify ownership through student
      const student = await storage.getStudentById(goal.studentId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      const userId = req.user.claims.sub;
      if (student.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      console.log("Received data point request body:", req.body);
      
      // The schema now handles date and number conversions automatically
      const dataPointData = insertDataPointSchema.parse({
        ...req.body,
        goalId,
      });
      
      console.log("Parsed data point data:", dataPointData);
      
      const dataPoint = await storage.createDataPoint(dataPointData);
      console.log("Data point created successfully:", dataPoint.id);
      res.status(201).json(dataPoint);
    } catch (error: any) {
      console.error("Error creating data point:", error);
      console.error("Error stack:", (error as Error)?.stack);
      if (error instanceof z.ZodError) {
        console.error("Zod validation errors:", error.errors);
        res.status(400).json({ message: "Invalid data point data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create data point" });
      }
    }
  });

  app.put('/api/data-points/:id', isAuthenticated, async (req: any, res) => {
    try {
      const dataPointId = parseInt(req.params.id);
      const existingDataPoint = await storage.getDataPointById(dataPointId);
      
      if (!existingDataPoint) {
        return res.status(404).json({ message: "Data point not found" });
      }

      // Verify ownership through goal and student
      const goal = await storage.getGoalById(existingDataPoint.goalId);
      if (!goal) {
        return res.status(404).json({ message: "Goal not found" });
      }

      const student = await storage.getStudentById(goal.studentId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      const userId = req.user.claims.sub;
      if (student.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updateData = insertDataPointSchema.partial().parse(req.body);
      const dataPoint = await storage.updateDataPoint(dataPointId, updateData);
      res.json(dataPoint);
    } catch (error) {
      console.error("Error updating data point:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data point data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update data point" });
      }
    }
  });

  app.delete('/api/data-points/:id', isAuthenticated, async (req: any, res) => {
    try {
      const dataPointId = parseInt(req.params.id);
      const existingDataPoint = await storage.getDataPointById(dataPointId);
      
      if (!existingDataPoint) {
        return res.status(404).json({ message: "Data point not found" });
      }

      // Verify ownership through goal and student
      const goal = await storage.getGoalById(existingDataPoint.goalId);
      if (!goal) {
        return res.status(404).json({ message: "Goal not found" });
      }

      const student = await storage.getStudentById(goal.studentId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      const userId = req.user.claims.sub;
      if (student.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteDataPoint(dataPointId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting data point:", error);
      res.status(500).json({ message: "Failed to delete data point" });
    }
  });

  // Admin routes (for database administrator)
  app.get('/api/admin/stats', async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const students = await storage.getAllStudents();
      const goals = await storage.getAllGoals();
      const dataPoints = await storage.getAllDataPoints();

      const stats = {
        totalUsers: users.length,
        totalStudents: students.length,
        totalGoals: goals.length,
        totalDataPoints: dataPoints.length,
        recentActivity: [] // Can be expanded later
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });

  app.get('/api/admin/users', async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching all users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get('/api/admin/students', async (req, res) => {
    try {
      const students = await storage.getAllStudentsWithDetails();
      res.json(students);
    } catch (error) {
      console.error("Error fetching all students:", error);
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  app.get('/api/admin/goals', async (req, res) => {
    try {
      const goals = await storage.getAllGoalsWithDetails();
      res.json(goals);
    } catch (error) {
      console.error("Error fetching all goals:", error);
      res.status(500).json({ message: "Failed to fetch goals" });
    }
  });

  app.delete('/api/admin/users/:userId', async (req, res) => {
    try {
      const userId = req.params.userId;
      await storage.deleteUser(userId);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.get('/api/admin/schema', async (req, res) => {
    try {
      const schema = await storage.getDatabaseSchema();
      res.json(schema);
    } catch (error) {
      console.error("Error fetching database schema:", error);
      res.status(500).json({ message: "Failed to fetch database schema" });
    }
  });

  app.get('/api/admin/table/:tableName', async (req, res) => {
    try {
      const tableName = req.params.tableName;
      let data;
      
      switch (tableName) {
        case 'users':
          data = await storage.getAllUsers();
          break;
        case 'students':
          data = await storage.getAllStudents();
          break;
        case 'goals':
          data = await storage.getAllGoals();
          break;
        case 'data_points':
          data = await storage.getAllDataPoints();
          break;
        default:
          return res.status(404).json({ message: "Table not found" });
      }
      
      res.json(data);
    } catch (error) {
      console.error(`Error fetching table ${req.params.tableName}:`, error);
      res.status(500).json({ message: "Failed to fetch table data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
