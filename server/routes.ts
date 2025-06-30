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
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
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
      const students = await storage.getStudentsByUserId(userId);
      
      // Get summary data for each student
      const studentsWithSummary = await Promise.all(
        students.map(async (student) => {
          const summary = await storage.getStudentSummary(student.id);
          return {
            ...student,
            ...summary,
          };
        })
      );
      
      res.json(studentsWithSummary);
    } catch (error) {
      console.error("Error fetching students:", error);
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  app.post('/api/students', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const studentData = insertStudentSchema.parse({
        ...req.body,
        userId,
      });
      
      const student = await storage.createStudent(studentData);
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
      const student = await storage.getStudentById(studentId);
      
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Verify ownership
      const userId = req.user.claims.sub;
      if (student.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const goalData = insertGoalSchema.parse({
        ...req.body,
        studentId,
      });
      
      const goal = await storage.createGoal(goalData);
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
      
      const dataPointData = insertDataPointSchema.parse({
        ...req.body,
        goalId,
      });
      
      console.log("Parsed data point data:", dataPointData);
      
      const dataPoint = await storage.createDataPoint(dataPointData);
      res.status(201).json(dataPoint);
    } catch (error) {
      console.error("Error creating data point:", error);
      if (error instanceof z.ZodError) {
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

  const httpServer = createServer(app);
  return httpServer;
}
