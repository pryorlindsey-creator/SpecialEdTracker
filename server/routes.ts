import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./replitAuth";
import { UserMigrationService } from "./userMigration";
import { insertStudentSchema, insertGoalSchema, insertDataPointSchema, insertObjectiveSchema, students } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Temporary debug endpoint (before auth middleware)
  app.get('/api/debug/force-load', async (req, res) => {
    try {
      console.log("Force loading students for user 4201332");
      const students = await storage.getStudentsByUserId('4201332');
      
      const studentsWithSummary = await Promise.all(
        students.map(async (student) => {
          const summary = await storage.getStudentSummary(student.id);
          return {
            ...student,
            ...summary,
          };
        })
      );
      
      console.log("Force load result:", studentsWithSummary.length, "students");
      res.json(studentsWithSummary);
    } catch (error) {
      console.error("Force load error:", error);
      res.status(500).json({ message: "Failed to force load students" });
    }
  });

  // Test endpoint to verify server connectivity
  app.post('/api/test', (req, res) => {
    console.log("Test endpoint hit successfully");
    console.log("Test request body:", req.body);
    res.json({ message: "Server is working", received: req.body });
  });

  // Debug endpoint to test Focus goal data specifically
  app.get('/api/debug/goal-74', async (req, res) => {
    try {
      console.log("=== TESTING GOAL 74 (FOCUS GOAL) ===");
      const goalId = 74;
      
      // Direct data points query
      const directDataPoints = await storage.getDataPointsByGoalId(goalId);
      console.log(`Direct query result: ${directDataPoints.length} data points`);
      
      // Goal progress query
      const progress = await storage.getGoalProgress(goalId);
      console.log(`Goal progress result: ${progress.dataPoints.length} data points`);
      
      res.json({
        directDataPoints: directDataPoints.length,
        progressDataPoints: progress.dataPoints.length,
        latestDataPoints: directDataPoints.slice(0, 5).map(dp => ({
          id: dp.id,
          date: dp.date,
          value: dp.progressValue
        }))
      });
    } catch (error) {
      console.error("Goal 74 test error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Auth middleware - this sets up sessions first
  await setupAuth(app);

  // Admin login route (after auth middleware to have session available)
  app.post('/api/auth/admin-login', async (req: any, res) => {
    try {
      console.log("Admin login attempt received");
      console.log("Request body:", req.body);
      console.log("Request headers:", req.headers);
      
      const { username, password } = req.body;
      
      console.log("Extracted credentials:", { username, password: password ? "[PASSWORD PROVIDED]" : "[NO PASSWORD]" });
      
      // Check admin credentials
      if (username === 'sandralindsey' && password === 'IsabelShea@1998') {
        console.log("Admin credentials match! Login successful");
        
        // Create admin user in database 
        const adminUser = await storage.upsertUser({
          id: '4201332', // Use the user ID that has all the existing data
          email: 'sandralindsey@speechpathai.com',
          firstName: 'Sandra',
          lastName: 'Lindsey',
        });
        
        console.log("Admin user created/updated:", adminUser);
        
        // Bypass session issues with a direct session setup
        if (req.session) {
          console.log("Session is available");
          
          // Set up user data directly
          const adminUser = {
            claims: { 
              sub: '4201332',
              email: 'sandralindsey@speechpathai.com',
              first_name: 'Sandra',
              last_name: 'Lindsey'
            },
            expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 1 week
          };
          
          // Use passport's login method for proper session handling
          req.login(adminUser, (err) => {
            if (err) {
              console.error('Passport login error:', err);
              return res.status(500).json({ success: false, message: 'Session creation failed' });
            }
            
            // Set admin cookie as backup
            res.cookie('admin_session', JSON.stringify(adminUser), {
              httpOnly: false, // Allow frontend access
              secure: false,
              maxAge: 7 * 24 * 60 * 60 * 1000,
              sameSite: 'lax'
            });
            
            // Force session save to database
            req.session.save((saveErr) => {
              if (saveErr) {
                console.error('Session save error:', saveErr);
              } else {
                console.log("Session saved to database successfully");
              }
              
              console.log("Admin backup cookie and session both set");
              res.json({ success: true, message: "Admin login successful", redirectTo: "/" });
            });
          });
        } else {
          console.log("No session available, using cookie fallback");
          const userData = {
            claims: { 
              sub: '4201332',
              email: 'sandralindsey@speechpathai.com',
              first_name: 'Sandra',
              last_name: 'Lindsey'
            },
            expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
          };
          
          res.cookie('admin_session', JSON.stringify(userData), { 
            httpOnly: false, // Allow frontend access
            secure: false,
            maxAge: 7 * 24 * 60 * 60 * 1000,
            sameSite: 'lax'
          });
          res.json({ success: true, message: "Admin login successful (no session)", redirectTo: "/" });
        }
        
      } else {
        console.log("Admin credentials do NOT match");
        console.log("Expected username: 'sandralindsey', received:", username);
        console.log("Password provided:", password ? "YES" : "NO");
        res.status(401).json({ message: "Invalid admin credentials" });
      }
    } catch (error) {
      console.error("Error during admin login:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Auth middleware - this sets up sessions first
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

  app.get('/api/auth/user', async (req: any, res) => {
    try {
      // Development mode - return mock user data
      const mockUser = {
        id: '4201332',
        email: 'sandralindsey@speechpathai.com',
        firstName: 'Sandra',
        lastName: 'Lindsey',
        profileImageUrl: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      res.json(mockUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Debug endpoint to check user data associations
  app.get('/api/debug/user-data', async (req: any, res) => {
    try {
      const userId = '4201332';
      console.log("=== DEBUG USER DATA ===");
      console.log("Current user ID:", userId);
      
      // Get all users
      const allUsers = await storage.getAllUsers();
      console.log("All users:", allUsers.map(u => ({ id: u.id, email: u.email })));
      
      // Get all students
      const allStudents = await storage.getAllStudents();
      console.log("All students:", allStudents.map(s => ({ id: s.id, name: s.name, userId: s.userId })));
      
      // Get students for current user
      const userStudents = await storage.getStudentsByUserId(userId);
      console.log("Students for current user:", userStudents.length);
      
      res.json({
        currentUserId: userId,
        allUsers: allUsers.map(u => ({ id: u.id, email: u.email })),
        allStudents: allStudents.map(s => ({ id: s.id, name: s.name, userId: s.userId })),
        userStudents: userStudents.length
      });
    } catch (error) {
      console.error("Debug error:", error);
      res.status(500).json({ message: "Debug failed" });
    }
  });

  // Fix user data association - transfer students from test user to current user
  app.post('/api/debug/fix-user-data', async (req: any, res) => {
    try {
      const currentUserId = '4201332';
      const testUserId = 'test-user-123';
      
      console.log(`Transferring students from ${testUserId} to ${currentUserId}`);
      
      // Update all students from test user to current user
      const result = await db
        .update(students)
        .set({ userId: currentUserId })
        .where(eq(students.userId, testUserId))
        .returning();
      
      console.log(`Transferred ${result.length} students to current user`);
      
      res.json({
        message: `Successfully transferred ${result.length} students to your account`,
        transferredStudents: result.length
      });
    } catch (error) {
      console.error("Fix error:", error);
      res.status(500).json({ message: "Failed to fix user data" });
    }
  });

  // Temporary fix endpoint for user 4201332 (no auth required for testing)
  app.get('/api/students/force-load', async (req, res) => {
    try {
      console.log("Force loading students for user 4201332");
      const students = await storage.getStudentsByUserId('4201332');
      
      const studentsWithSummary = await Promise.all(
        students.map(async (student) => {
          const summary = await storage.getStudentSummary(student.id);
          return {
            ...student,
            ...summary,
          };
        })
      );
      
      console.log("Force load result:", studentsWithSummary.length, "students");
      res.json(studentsWithSummary);
    } catch (error) {
      console.error("Force load error:", error);
      res.status(500).json({ message: "Failed to force load students" });
    }
  });

  // Student routes with proper user ownership
  app.get('/api/students', async (req: any, res) => {
    try {
      const userId = '4201332'; // Development mode - use fixed user ID
      console.log("Fetching students for user ID:", userId);
      
      // Now that all students are migrated to one user, use standard ownership
      const students = await storage.getStudentsByUserId(userId);
      console.log("Found students:", students.length);
      
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
      
      console.log("Returning students with summary:", studentsWithSummary.length);
      res.json(studentsWithSummary);
    } catch (error) {
      console.error("Error fetching students:", error);
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  app.post('/api/students', async (req: any, res) => {
    try {
      const userId = '4201332'; // Development mode - use fixed user ID
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

  app.get('/api/students/:id', async (req: any, res) => {
    try {
      const studentId = parseInt(req.params.id);
      const student = await storage.getStudentById(studentId);
      
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Verify ownership - now all students belong to user 4201332
      const userId = '4201332';
      console.log(`Student ${studentId} belongs to ${student.userId}, current user is ${userId}`);
      
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

  app.put('/api/students/:id', async (req: any, res) => {
    try {
      const studentId = parseInt(req.params.id);
      const existingStudent = await storage.getStudentById(studentId);
      
      if (!existingStudent) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Verify ownership with fallback for user 4201332 and 42813322
      const userId = '4201332';
      if (existingStudent.userId !== userId && existingStudent.userId !== '4201332' && existingStudent.userId !== '42813322') {
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

  app.delete('/api/students/:id', async (req: any, res) => {
    try {
      const studentId = parseInt(req.params.id);
      const existingStudent = await storage.getStudentById(studentId);
      
      if (!existingStudent) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Verify ownership with fallback for user 4201332 and 42813322
      const userId = '4201332';
      if (existingStudent.userId !== userId && existingStudent.userId !== '4201332' && existingStudent.userId !== '42813322') {
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
  app.get('/api/students/:studentId/goals', async (req: any, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      const student = await storage.getStudentById(studentId);
      
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Verify ownership with fallback for user 4201332 and 42813322
      const userId = '4201332';
      if (student.userId !== userId && student.userId !== '4201332' && student.userId !== '42813322') {
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

  app.post('/api/students/:studentId/goals', async (req: any, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      const userId = '4201332';
      console.log("Creating goal for student:", studentId, "user:", userId);
      console.log("Goal request body:", req.body);
      
      const student = await storage.getStudentById(studentId);
      
      if (!student) {
        console.log("Student not found:", studentId);
        return res.status(404).json({ message: "Student not found" });
      }

      // Verify ownership
      if (student.userId !== userId && student.userId !== '4201332' && student.userId !== '42813322') {
        console.log("Access denied - student belongs to:", student.userId, "but user is:", userId);
        return res.status(403).json({ message: "Access denied" });
      }

      // Check if student already has 15 goals (maximum limit)
      const existingGoals = await storage.getGoalsByStudentId(studentId);
      if (existingGoals.length >= 15) {
        console.log("Student already has maximum goals:", existingGoals.length);
        return res.status(400).json({ message: "Student already has maximum of 15 goals" });
      }

      const { objectives: objectivesData, ...goalRequestData } = req.body;
      
      const goalData = insertGoalSchema.parse({
        ...goalRequestData,
        studentId,
      });
      
      console.log("Parsed goal data:", goalData);
      const goal = await storage.createGoal(goalData);
      console.log("Goal created successfully:", goal.id);
      
      // Create objectives if provided
      if (objectivesData && Array.isArray(objectivesData) && objectivesData.length > 0) {
        console.log("Creating objectives for goal:", goal.id);
        const objectives = [];
        
        for (const objectiveData of objectivesData) {
          const parsedObjective = insertObjectiveSchema.parse({
            ...objectiveData,
            goalId: goal.id,
            studentId: studentId,
          });
          
          const objective = await storage.createObjective(parsedObjective);
          objectives.push(objective);
        }
        
        console.log("Created objectives:", objectives.length);
        res.status(201).json({ ...goal, objectives });
      } else {
        res.status(201).json(goal);
      }
    } catch (error) {
      console.error("Error creating goal:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid goal data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create goal" });
      }
    }
  });

  app.get('/api/goals/:id', async (req: any, res) => {
    try {
      const goalId = parseInt(req.params.id);
      const progress = await storage.getGoalProgress(goalId);
      
      // Verify ownership through student
      const student = await storage.getStudentById(progress.goal.studentId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      const userId = '4201332';
      if (student.userId !== userId && student.userId !== '4201332') {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(progress);
    } catch (error) {
      console.error("Error fetching goal progress:", error);
      res.status(500).json({ message: "Failed to fetch goal progress" });
    }
  });

  app.patch('/api/goals/:id', async (req: any, res) => {
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

      const userId = '4201332';
      if (student.userId !== userId && student.userId !== '4201332') {
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

  app.delete('/api/goals/:id', async (req: any, res) => {
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

      const userId = '4201332';
      if (student.userId !== userId && student.userId !== '4201332') {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteGoal(goalId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting goal:", error);
      res.status(500).json({ message: "Failed to delete goal" });
    }
  });

  // Objectives routes
  app.get('/api/goals/:goalId/objectives', async (req: any, res) => {
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

      const userId = '4201332';
      if (student.userId !== userId && student.userId !== '4201332' && student.userId !== '42813322') {
        return res.status(403).json({ message: "Access denied" });
      }

      const objectives = await storage.getObjectivesByGoalId(goalId);
      res.json(objectives);
    } catch (error) {
      console.error("Error fetching objectives:", error);
      res.status(500).json({ message: "Failed to fetch objectives" });
    }
  });

  app.post('/api/goals/:goalId/objectives', async (req: any, res) => {
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

      const userId = '4201332';
      if (student.userId !== userId && student.userId !== '4201332' && student.userId !== '42813322') {
        return res.status(403).json({ message: "Access denied" });
      }

      // Check if goal already has 10 objectives (maximum limit)
      const existingObjectives = await storage.getObjectivesByGoalId(goalId);
      if (existingObjectives.length >= 10) {
        console.log("Goal already has maximum objectives:", existingObjectives.length);
        return res.status(400).json({ message: "Goal already has maximum of 10 objectives" });
      }

      // Get student ID from the goal
      const studentId = goal.studentId;

      // Generate a title from description if not provided
      const title = req.body.title || (req.body.description ? 
        req.body.description.substring(0, 50) + (req.body.description.length > 50 ? "..." : "") : 
        "Untitled Objective");
      
      const objectiveData = insertObjectiveSchema.parse({
        ...req.body,
        title,
        goalId,
        studentId,
      });
      
      const objective = await storage.createObjective(objectiveData);
      res.status(201).json(objective);
    } catch (error) {
      console.error("Error creating objective:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid objective data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create objective" });
      }
    }
  });

  app.put('/api/objectives/:id', async (req: any, res) => {
    try {
      const objectiveId = parseInt(req.params.id);
      const existingObjective = await storage.getObjectiveById(objectiveId);
      
      if (!existingObjective) {
        return res.status(404).json({ message: "Objective not found" });
      }

      // Verify ownership through goal and student
      const goal = await storage.getGoalById(existingObjective.goalId);
      if (!goal) {
        return res.status(404).json({ message: "Goal not found" });
      }

      const student = await storage.getStudentById(goal.studentId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      const userId = '4201332';
      if (student.userId !== userId && student.userId !== '4201332' && student.userId !== '42813322') {
        return res.status(403).json({ message: "Access denied" });
      }

      const updateData = insertObjectiveSchema.partial().parse(req.body);
      const objective = await storage.updateObjective(objectiveId, updateData);
      res.json(objective);
    } catch (error) {
      console.error("Error updating objective:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid objective data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update objective" });
      }
    }
  });

  app.delete('/api/objectives/:id', async (req: any, res) => {
    try {
      const objectiveId = parseInt(req.params.id);
      const existingObjective = await storage.getObjectiveById(objectiveId);
      
      if (!existingObjective) {
        return res.status(404).json({ message: "Objective not found" });
      }

      // Verify ownership through goal and student
      const goal = await storage.getGoalById(existingObjective.goalId);
      if (!goal) {
        return res.status(404).json({ message: "Goal not found" });
      }

      const student = await storage.getStudentById(goal.studentId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      const userId = '4201332';
      if (student.userId !== userId && student.userId !== '4201332' && student.userId !== '42813322') {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteObjective(objectiveId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting objective:", error);
      res.status(500).json({ message: "Failed to delete objective" });
    }
  });

  // Get all objectives for a student
  app.get('/api/students/:studentId/objectives', async (req: any, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      const student = await storage.getStudentById(studentId);
      
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      const userId = '4201332';
      if (student.userId !== userId && student.userId !== '4201332' && student.userId !== '42813322') {
        return res.status(403).json({ message: "Access denied" });
      }

      const objectives = await storage.getObjectivesByStudentId(studentId);
      
      // Enrich objectives with goal information
      const objectivesWithGoals = await Promise.all(
        objectives.map(async (objective) => {
          const goal = await storage.getGoalById(objective.goalId);
          return {
            ...objective,
            goalTitle: goal?.title || 'Unknown Goal',
            goalDescription: goal?.description || '',
          };
        })
      );

      res.json(objectivesWithGoals);
    } catch (error) {
      console.error("Error fetching student objectives:", error);
      res.status(500).json({ message: "Failed to fetch objectives" });
    }
  });

  // Get data points for a specific student (direct student-data point association)
  app.get('/api/students/:studentId/data-points', async (req: any, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      const student = await storage.getStudentById(studentId);
      
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Verify ownership with fallback for user 4201332 and 42813322
      const userId = '4201332';
      if (student.userId !== userId && student.userId !== '4201332' && student.userId !== '42813322') {
        return res.status(403).json({ message: "Access denied" });
      }

      const dataPoints = await storage.getDataPointsByStudentId(studentId);
      res.json(dataPoints);
    } catch (error) {
      console.error("Error fetching student data points:", error);
      res.status(500).json({ message: "Failed to fetch data points" });
    }
  });

  // Get objective progress with statistics
  app.get('/api/objectives/:objectiveId/progress', async (req: any, res) => {
    try {
      const objectiveId = parseInt(req.params.objectiveId);
      const objective = await storage.getObjectiveById(objectiveId);
      
      if (!objective) {
        return res.status(404).json({ message: "Objective not found" });
      }

      // Verify ownership through student
      const student = await storage.getStudentById(objective.studentId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      const userId = '4201332';
      if (student.userId !== userId && student.userId !== '4201332' && student.userId !== '42813322') {
        return res.status(403).json({ message: "Access denied" });
      }

      const progressData = await storage.getObjectiveProgress(objectiveId);
      res.json(progressData);
    } catch (error) {
      console.error("Error fetching objective progress:", error);
      res.status(500).json({ message: "Failed to fetch objective progress" });
    }
  });

  // Student data points route (all data points for a student across all goals)
  app.get('/api/students/:studentId/all-data-points', async (req: any, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      const student = await storage.getStudentById(studentId);
      
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Verify ownership with fallback for user 4201332 and 42813322
      const userId = '4201332';
      if (student.userId !== userId && student.userId !== '4201332' && student.userId !== '42813322') {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get all goals for this student
      const goals = await storage.getGoalsByStudentId(studentId);
      
      // Get all data points for this student directly
      const allDataPoints = await storage.getDataPointsByStudentId(studentId);
      
      // Add goal titles and objective info to data points
      const dataPointsWithGoalInfo = await Promise.all(
        allDataPoints.map(async (dp) => {
          const goal = await storage.getGoalById(dp.goalId);
          let objectiveInfo = null;
          
          // If this data point has an objective, get objective details
          if (dp.objectiveId) {
            const objective = await storage.getObjectiveById(dp.objectiveId);
            objectiveInfo = {
              objectiveId: dp.objectiveId,
              objectiveDescription: objective?.description || 'Unknown Objective',
              isObjectiveSpecific: true
            };
          }
          
          return {
            ...dp,
            goalTitle: goal?.title || 'Unknown Goal',
            goalDataCollectionType: goal?.dataCollectionType || 'percentage',
            ...objectiveInfo,
            isObjectiveSpecific: !!dp.objectiveId,
            dataType: dp.objectiveId ? 'Objective' : 'General Goal',
          };
        })
      );

      // Sort by date
      dataPointsWithGoalInfo.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      res.json(dataPointsWithGoalInfo);
    } catch (error) {
      console.error("Error fetching student data points:", error);
      res.status(500).json({ message: "Failed to fetch data points" });
    }
  });

  // Data point routes
  app.get('/api/goals/:goalId/data-points', async (req: any, res) => {
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

      const userId = '4201332';
      if (student.userId !== userId && student.userId !== '4201332') {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get both goal-level and objective-specific data points
      const goalDataPoints = await storage.getDataPointsByGoalId(goalId);
      
      // Get all objectives for this goal
      const objectives = await storage.getObjectivesByGoalId(goalId);
      
      // Get data points for all objectives of this goal
      const objectiveDataPoints = [];
      for (const objective of objectives) {
        const objDataPoints = await storage.getDataPointsByObjectiveId(objective.id);
        // Add objective info to each data point
        const enrichedObjDataPoints = objDataPoints.map(dp => ({
          ...dp,
          objectiveDescription: objective.description,
          isObjectiveSpecific: true
        }));
        objectiveDataPoints.push(...enrichedObjDataPoints);
      }
      
      // Combine and mark general goal data points
      const allDataPoints = [
        ...goalDataPoints.map(dp => ({ ...dp, isObjectiveSpecific: false, objectiveDescription: null })),
        ...objectiveDataPoints
      ];
      
      // Sort by date
      allDataPoints.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      res.json(allDataPoints);
    } catch (error) {
      console.error("Error fetching data points:", error);
      res.status(500).json({ message: "Failed to fetch data points" });
    }
  });

  app.post('/api/goals/:goalId/data-points', async (req: any, res) => {
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

      const userId = '4201332';
      if (student.userId !== userId && student.userId !== '4201332' && student.userId !== '42813322') {
        return res.status(403).json({ message: "Access denied" });
      }

      console.log("=== DATA POINT CREATION REQUEST ===");
      console.log("Goal ID:", goalId);
      console.log("Request timestamp:", new Date().toISOString());
      console.log("Received data point request body:", req.body);
      
      // Convert level of support array to JSON string for storage
      const requestBody = { ...req.body };
      if (requestBody.levelOfSupport && Array.isArray(requestBody.levelOfSupport)) {
        requestBody.levelOfSupport = requestBody.levelOfSupport.length > 0 
          ? JSON.stringify(requestBody.levelOfSupport) 
          : null;
      }
      
      // Convert setting array to JSON string for storage (same as levelOfSupport)
      if (requestBody.setting && Array.isArray(requestBody.setting)) {
        requestBody.setting = requestBody.setting.length > 0 
          ? JSON.stringify(requestBody.setting) 
          : null;
      }
      
      // Convert progressValue to number if it's a string
      if (requestBody.progressValue && typeof requestBody.progressValue === 'string') {
        requestBody.progressValue = parseFloat(requestBody.progressValue);
      }
      
      // The schema now handles date and number conversions automatically
      const dataPointData = insertDataPointSchema.parse({
        ...requestBody,
        goalId,
        studentId: goal.studentId, // Automatically assign student ID
      });
      
      console.log("Parsed data point data:", dataPointData);
      
      const dataPoint = await storage.createDataPoint(dataPointData);
      console.log("✅ DATA POINT CREATED SUCCESSFULLY:");
      console.log("   - ID:", dataPoint.id);
      console.log("   - Goal ID:", dataPoint.goalId);
      console.log("   - Progress Value:", dataPoint.progressValue);
      console.log("   - Duration Unit:", dataPoint.durationUnit);
      console.log("   - Date:", dataPoint.date);
      console.log("   - Created At:", dataPoint.createdAt);
      
      // Send response immediately to prevent timeout issues
      res.status(201).json(dataPoint);
      
      // Log completion
      console.log("✅ Response sent successfully");
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

  // Update a data point
  app.patch('/api/data-points/:id', async (req: any, res) => {
    try {
      const dataPointId = parseInt(req.params.id);
      const existingDataPoint = await storage.getDataPointById(dataPointId);
      
      if (!existingDataPoint) {
        return res.status(404).json({ message: "Data point not found" });
      }

      // Verify ownership through student
      const student = await storage.getStudentById(existingDataPoint.studentId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      const userId = '4201332';
      if (student.userId !== userId && student.userId !== '4201332' && student.userId !== '42813322') {
        return res.status(403).json({ message: "Access denied" });
      }

      console.log("=== DATA POINT UPDATE REQUEST ===");
      console.log("Data Point ID:", dataPointId);
      console.log("Request timestamp:", new Date().toISOString());
      console.log("Received update data:", req.body);
      
      // Convert level of support to JSON string for storage if it's an array
      const requestBody = { ...req.body };
      if (requestBody.levelOfSupport) {
        if (typeof requestBody.levelOfSupport === 'string') {
          // If it's already a string, assume it's JSON or a single value
          try {
            JSON.parse(requestBody.levelOfSupport);
            // It's valid JSON, keep as is
          } catch {
            // It's a single value, wrap in array and stringify
            requestBody.levelOfSupport = JSON.stringify([requestBody.levelOfSupport]);
          }
        } else if (Array.isArray(requestBody.levelOfSupport)) {
          requestBody.levelOfSupport = requestBody.levelOfSupport.length > 0 
            ? JSON.stringify(requestBody.levelOfSupport) 
            : null;
        }
      }
      
      // Convert setting to JSON string for storage if it's an array
      if (requestBody.setting) {
        if (typeof requestBody.setting === 'string') {
          // If it's already a string, assume it's JSON or a single value
          try {
            JSON.parse(requestBody.setting);
            // It's valid JSON, keep as is
          } catch {
            // It's a single value, wrap in array and stringify
            requestBody.setting = JSON.stringify([requestBody.setting]);
          }
        } else if (Array.isArray(requestBody.setting)) {
          requestBody.setting = requestBody.setting.length > 0 
            ? JSON.stringify(requestBody.setting) 
            : null;
        }
      }
      
      // Convert progressValue to number if it's a string
      if (requestBody.progressValue && typeof requestBody.progressValue === 'string') {
        requestBody.progressValue = parseFloat(requestBody.progressValue);
      }

      // Convert date string to proper format
      if (requestBody.date && typeof requestBody.date === 'string') {
        requestBody.date = new Date(requestBody.date + 'T12:00:00.000Z');
      }
      
      // Parse and validate the update data
      const updateData = insertDataPointSchema.partial().parse(requestBody);
      
      console.log("Parsed update data:", updateData);
      
      const dataPoint = await storage.updateDataPoint(dataPointId, updateData);
      console.log("✅ DATA POINT UPDATED SUCCESSFULLY:");
      console.log("   - ID:", dataPoint.id);
      console.log("   - Progress Value:", dataPoint.progressValue);
      console.log("   - Duration Unit:", dataPoint.durationUnit);
      console.log("   - Date:", dataPoint.date);
      
      res.json(dataPoint);
    } catch (error: any) {
      console.error("Error updating data point:", error);
      console.error("Error stack:", (error as Error)?.stack);
      if (error instanceof z.ZodError) {
        console.error("Zod validation errors:", error.errors);
        res.status(400).json({ message: "Invalid data point data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update data point" });
      }
    }
  });

  app.delete('/api/data-points/:id', async (req: any, res) => {
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

      const userId = '4201332';
      if (student.userId !== userId && student.userId !== '4201332' && student.userId !== '42813322') {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteDataPoint(dataPointId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting data point:", error);
      res.status(500).json({ message: "Failed to delete data point" });
    }
  });

  // Get all data points for a student (for raw data table)
  app.get('/api/students/:studentId/data-points/all', async (req: any, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      const student = await storage.getStudentById(studentId);
      
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Verify ownership
      const userId = '4201332';
      if (student.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get all goals for this student
      const goals = await storage.getGoalsByStudentId(studentId);
      
      // Get all data points for all goals
      const allDataPoints = [];
      for (const goal of goals) {
        const dataPoints = await storage.getDataPointsByGoalId(goal.id);
        
        // Add goal title to each data point
        const dataPointsWithGoal = dataPoints.map(dp => ({
          ...dp,
          goalTitle: goal.title,
          goalId: goal.id
        }));
        
        allDataPoints.push(...dataPointsWithGoal);
      }
      
      // Sort by date (newest first)
      allDataPoints.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      res.json(allDataPoints);
    } catch (error) {
      console.error("Error fetching all data points:", error);
      res.status(500).json({ message: "Failed to fetch all data points" });
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
        case 'dataPoints':
          data = await storage.getAllDataPoints();
          break;
        case 'sessions':
          data = await storage.getAllSessions();
          break;
        case 'reporting_periods':
        case 'reportingPeriods':
          data = await storage.getAllReportingPeriods();
          break;
        case 'objectives':
          data = await storage.getAllObjectives();
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

  // Admin data verification endpoints
  app.get('/api/admin/verify/user/:userId', async (req, res) => {
    try {
      const userId = req.params.userId;
      const verification = await storage.verifyUserData(userId);
      res.json(verification);
    } catch (error) {
      console.error("Error verifying user data:", error);
      res.status(500).json({ message: "Failed to verify user data" });
    }
  });

  app.get('/api/admin/verify/student/:studentId', async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      const verification = await storage.verifyStudentData(studentId);
      res.json(verification);
    } catch (error) {
      console.error("Error verifying student data:", error);
      res.status(500).json({ message: "Failed to verify student data" });
    }
  });

  app.get('/api/admin/verify/goal/:goalId', async (req, res) => {
    try {
      const goalId = parseInt(req.params.goalId);
      const verification = await storage.verifyGoalData(goalId);
      res.json(verification);
    } catch (error) {
      console.error("Error verifying goal data:", error);
      res.status(500).json({ message: "Failed to verify goal data" });
    }
  });

  app.get('/api/admin/sample-data/:userId', async (req, res) => {
    try {
      const userId = req.params.userId;
      const sampleData = await storage.getSampleUserData(userId);
      res.json(sampleData);
    } catch (error) {
      console.error("Error fetching sample data:", error);
      res.status(500).json({ message: "Failed to fetch sample data" });
    }
  });

  // Clear data routes
  app.delete('/api/students/:studentId/clear-data', async (req: any, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      const student = await storage.getStudentById(studentId);
      
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Verify ownership
      const userId = '4201332';
      if (student.userId !== userId && student.userId !== '4201332' && student.userId !== '42813322') {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.clearStudentData(studentId);
      res.json({ message: "Student data cleared successfully" });
    } catch (error) {
      console.error("Error clearing student data:", error);
      res.status(500).json({ message: "Failed to clear student data" });
    }
  });

  app.delete('/api/users/clear-all-data', async (req: any, res) => {
    try {
      const userId = '4201332';
      await storage.clearAllUserData(userId);
      res.json({ message: "All user data cleared successfully" });
    } catch (error) {
      console.error("Error clearing all user data:", error);
      res.status(500).json({ message: "Failed to clear all data" });
    }
  });

  app.delete('/api/students/:studentId/remove-from-caseload', async (req: any, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      const student = await storage.getStudentById(studentId);
      
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Verify ownership
      const userId = '4201332';
      if (student.userId !== userId && student.userId !== '4201332' && student.userId !== '42813322') {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.removeStudentFromCaseload(studentId);
      res.json({ message: "Student removed from caseload successfully" });
    } catch (error) {
      console.error("Error removing student from caseload:", error);
      res.status(500).json({ message: "Failed to remove student from caseload" });
    }
  });

  // Reporting periods routes
  app.get('/api/reporting-periods', async (req: any, res) => {
    try {
      const userId = '4201332'; // Development mode - use fixed user ID
      console.log("Fetching reporting periods for user ID:", userId);
      
      const periods = await storage.getReportingPeriodsByUserId(userId);
      console.log("Found reporting periods:", periods.length);
      
      if (periods.length === 0) {
        res.json({ periods: [], periodLength: null });
        return;
      }
      
      // Group periods by periodLength and return structured data
      const periodLength = periods[0]?.periodLength || null;
      res.json({
        periods: periods.map(p => ({
          periodNumber: p.periodNumber,
          startDate: p.startDate,
          endDate: p.endDate
        })),
        periodLength
      });
    } catch (error) {
      console.error("Error fetching reporting periods:", error);
      res.status(500).json({ message: "Failed to fetch reporting periods" });
    }
  });

  app.post('/api/reporting-periods', async (req: any, res) => {
    try {
      const userId = '4201332'; // Development mode - use fixed user ID
      const { periods, periodLength } = req.body;
      
      console.log("Saving reporting periods for user ID:", userId);
      console.log("Periods data:", { periods: periods?.length, periodLength });
      
      if (!periods || !Array.isArray(periods) || !periodLength) {
        return res.status(400).json({ message: "Invalid periods data" });
      }
      
      await storage.saveReportingPeriods(userId, periods, periodLength);
      console.log("Successfully saved reporting periods to database");
      
      res.json({ message: "Reporting periods saved successfully" });
    } catch (error) {
      console.error("Error saving reporting periods:", error);
      res.status(500).json({ message: "Failed to save reporting periods" });
    }
  });

  app.delete('/api/reporting-periods', async (req: any, res) => {
    try {
      const userId = '4201332'; // Development mode - use fixed user ID
      console.log("Deleting reporting periods for user ID:", userId);
      
      await storage.deleteReportingPeriodsByUserId(userId);
      console.log("Successfully deleted reporting periods from database");
      
      res.json({ message: "Reporting periods deleted successfully" });
    } catch (error) {
      console.error("Error deleting reporting periods:", error);
      res.status(500).json({ message: "Failed to delete reporting periods" });
    }
  });

  // Migration endpoints for user ownership management
  app.post('/api/admin/migrate-all-students/:targetUserId', async (req, res) => {
    try {
      const targetUserId = req.params.targetUserId;
      console.log(`Starting migration of all students to user ${targetUserId}`);
      
      // Get all students from all users
      const allUsers = ['4201332', '42813322']; // Known test users
      let totalMigrated = 0;
      
      for (const sourceUserId of allUsers) {
        if (sourceUserId !== targetUserId) {
          console.log(`Migrating students from ${sourceUserId} to ${targetUserId}`);
          const migrated = await UserMigrationService.migrateStudentsToUser(sourceUserId, targetUserId);
          totalMigrated += migrated.length;
        }
      }
      
      // Verify final ownership
      const validation = await UserMigrationService.validateUserOwnership(targetUserId);
      
      res.json({
        success: true,
        totalMigrated,
        finalStudentCount: validation.studentCount,
        message: `Successfully migrated ${totalMigrated} students to user ${targetUserId}`
      });
    } catch (error) {
      console.error("Migration failed:", error);
      res.status(500).json({ 
        success: false,
        message: "Migration failed",
        error: error.message 
      });
    }
  });

  app.get('/api/admin/validate-ownership/:userId', async (req, res) => {
    try {
      const userId = req.params.userId;
      const validation = await UserMigrationService.validateUserOwnership(userId);
      res.json(validation);
    } catch (error) {
      console.error("Validation failed:", error);
      res.status(500).json({ message: "Validation failed", error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
