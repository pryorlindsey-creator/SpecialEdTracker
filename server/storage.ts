import {
  users,
  students,
  goals,
  objectives,
  dataPoints,
  reportingPeriods,
  type User,
  type UpsertUser,
  type Student,
  type InsertStudent,
  type Goal,
  type InsertGoal,
  type Objective,
  type InsertObjective,
  type DataPoint,
  type InsertDataPoint,
  type ReportingPeriod,
  type InsertReportingPeriod,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, inArray, asc } from "drizzle-orm";

// Helper function to convert level of support data for frontend
function convertLevelOfSupport(levelOfSupport: string | null): string[] | null {
  if (!levelOfSupport) return null;
  
  try {
    // Try to parse as JSON array
    const parsed = JSON.parse(levelOfSupport);
    return Array.isArray(parsed) ? parsed : [levelOfSupport];
  } catch {
    // If parsing fails, treat as single string
    return [levelOfSupport];
  }
}

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Student operations
  getStudentsByUserId(userId: string): Promise<Student[]>;
  createStudent(student: InsertStudent): Promise<Student>;
  getStudentById(id: number): Promise<Student | undefined>;
  updateStudent(id: number, student: Partial<InsertStudent>): Promise<Student>;
  deleteStudent(id: number): Promise<void>;
  
  // Goal operations
  getGoalsByStudentId(studentId: number): Promise<Goal[]>;
  createGoal(goal: InsertGoal): Promise<Goal>;
  getGoalById(id: number): Promise<Goal | undefined>;
  updateGoal(id: number, goal: Partial<InsertGoal>): Promise<Goal>;
  deleteGoal(id: number): Promise<void>;
  
  // Data point operations
  getDataPointsByGoalId(goalId: number): Promise<DataPoint[]>;
  createDataPoint(dataPoint: InsertDataPoint): Promise<DataPoint>;
  getDataPointById(id: number): Promise<DataPoint | undefined>;
  updateDataPoint(id: number, dataPoint: Partial<InsertDataPoint>): Promise<DataPoint>;
  deleteDataPoint(id: number): Promise<void>;
  
  // Analytics operations
  getStudentSummary(studentId: number): Promise<{
    totalGoals: number;
    activeGoals: number;
    completedGoals: number;
    totalDataPoints: number;
    lastDataPoint?: DataPoint;
  }>;
  getGoalProgress(goalId: number): Promise<{
    goal: Goal;
    dataPoints: DataPoint[];
    currentProgress: number;
    averageScore: number;
    trend: number;
    lastScore: number;
  }>;
  
  // Reporting periods operations
  getReportingPeriodsByUserId(userId: string): Promise<ReportingPeriod[]>;
  saveReportingPeriods(userId: string, periods: { periodNumber: number; startDate: string; endDate: string; }[], periodLength: string): Promise<void>;
  deleteReportingPeriodsByUserId(userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Student operations
  async getStudentsByUserId(userId: string): Promise<Student[]> {
    console.log("Querying students for user ID:", userId);
    const result = await db
      .select()
      .from(students)
      .where(eq(students.userId, userId))
      .orderBy(asc(students.name));
    console.log("Query result:", result);
    return result;
  }

  async createStudent(student: InsertStudent): Promise<Student> {
    console.log("Creating student:", student);
    const [newStudent] = await db
      .insert(students)
      .values(student)
      .returning();
    console.log("Student created successfully:", newStudent);
    return newStudent;
  }

  async getStudentById(id: number): Promise<Student | undefined> {
    const [student] = await db
      .select()
      .from(students)
      .where(eq(students.id, id));
    return student;
  }

  async updateStudent(id: number, student: Partial<InsertStudent>): Promise<Student> {
    const [updatedStudent] = await db
      .update(students)
      .set({ ...student, updatedAt: new Date() })
      .where(eq(students.id, id))
      .returning();
    return updatedStudent;
  }

  async deleteStudent(id: number): Promise<void> {
    await db.delete(students).where(eq(students.id, id));
  }

  // Goal operations
  async getGoalsByStudentId(studentId: number): Promise<Goal[]> {
    return await db
      .select()
      .from(goals)
      .where(eq(goals.studentId, studentId))
      .orderBy(desc(goals.createdAt));
  }

  async createGoal(goal: InsertGoal): Promise<Goal> {
    console.log("Creating goal:", goal);
    const [newGoal] = await db
      .insert(goals)
      .values(goal)
      .returning();
    console.log("Goal created successfully:", newGoal);
    return newGoal;
  }

  async getGoalById(id: number): Promise<Goal | undefined> {
    const [goal] = await db
      .select()
      .from(goals)
      .where(eq(goals.id, id));
    return goal;
  }

  async updateGoal(id: number, goal: Partial<InsertGoal>): Promise<Goal> {
    const [updatedGoal] = await db
      .update(goals)
      .set({ ...goal, updatedAt: new Date() })
      .where(eq(goals.id, id))
      .returning();
    return updatedGoal;
  }

  async deleteGoal(id: number): Promise<void> {
    await db.delete(goals).where(eq(goals.id, id));
  }

  // Data point operations
  async getDataPointsByGoalId(goalId: number): Promise<DataPoint[]> {
    const rawDataPoints = await db
      .select()
      .from(dataPoints)
      .where(eq(dataPoints.goalId, goalId))
      .orderBy(desc(dataPoints.date));
    
    // Convert level of support from JSON strings back to arrays
    return rawDataPoints.map(dp => ({
      ...dp,
      levelOfSupport: dp.levelOfSupport || null
    }));
  }

  async createDataPoint(dataPoint: InsertDataPoint): Promise<DataPoint> {
    console.log("Creating data point:", dataPoint);
    const [newDataPoint] = await db
      .insert(dataPoints)
      .values(dataPoint)
      .returning();
    console.log("Data point created successfully:", newDataPoint);
    return newDataPoint;
  }

  async getDataPointById(id: number): Promise<DataPoint | undefined> {
    const [dataPoint] = await db
      .select()
      .from(dataPoints)
      .where(eq(dataPoints.id, id));
    return dataPoint;
  }

  async updateDataPoint(id: number, dataPoint: Partial<InsertDataPoint>): Promise<DataPoint> {
    const [updatedDataPoint] = await db
      .update(dataPoints)
      .set(dataPoint)
      .where(eq(dataPoints.id, id))
      .returning();
    return updatedDataPoint;
  }

  async deleteDataPoint(id: number): Promise<void> {
    await db.delete(dataPoints).where(eq(dataPoints.id, id));
  }

  // Analytics operations
  async getStudentSummary(studentId: number): Promise<{
    totalGoals: number;
    activeGoals: number;
    completedGoals: number;
    totalDataPoints: number;
    lastDataPoint?: DataPoint;
  }> {
    const studentGoals = await db
      .select()
      .from(goals)
      .where(eq(goals.studentId, studentId));

    const totalGoals = studentGoals.length;
    const activeGoals = studentGoals.filter(g => g.status === 'active').length;
    const completedGoals = studentGoals.filter(g => g.status === 'mastered').length;

    const goalIds = studentGoals.map(g => g.id);
    
    if (goalIds.length === 0) {
      return {
        totalGoals: 0,
        activeGoals: 0,
        completedGoals: 0,
        totalDataPoints: 0,
      };
    }

    const allDataPoints = await db
      .select()
      .from(dataPoints)
      .where(inArray(dataPoints.goalId, goalIds))
      .orderBy(desc(dataPoints.date));

    const lastDataPoint = allDataPoints[0];

    return {
      totalGoals,
      activeGoals,
      completedGoals,
      totalDataPoints: allDataPoints.length,
      lastDataPoint,
    };
  }

  async getGoalProgress(goalId: number): Promise<{
    goal: Goal;
    dataPoints: DataPoint[];
    currentProgress: number;
    averageScore: number;
    trend: number;
    lastScore: number;
  }> {
    const goal = await this.getGoalById(goalId);
    if (!goal) {
      throw new Error('Goal not found');
    }

    const dataPointsList = await this.getDataPointsByGoalId(goalId);
    
    if (dataPointsList.length === 0) {
      return {
        goal,
        dataPoints: [],
        currentProgress: 0,
        averageScore: 0,
        trend: 0,
        lastScore: 0,
      };
    }

    // Calculate progress based on data collection type
    const scores = dataPointsList.map(dp => {
      const value = parseFloat(dp.progressValue.toString());
      
      // Convert different formats to percentage for consistent display
      switch (dp.progressFormat) {
        case 'percentage':
          return value; // Already in percentage format
        case 'frequency':
          // For frequency, calculate percentage based on numerator/denominator
          if (dp.denominator && dp.denominator > 0) {
            return (dp.numerator || 0) / dp.denominator * 100;
          }
          return value;
        case 'duration':
          // For duration, normalize to percentage (you may need to adjust this based on target criteria)
          // For now, treat duration values as percentages if no specific target is defined
          return value;
        default:
          return value;
      }
    });

    const averageScore = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
    const lastScore = scores.length > 0 ? scores[0] : 0; // dataPoints are ordered by date desc
    const currentProgress = lastScore;

    // Calculate trend (compare last 3 vs previous 3 data points)
    let trend = 0;
    if (scores.length >= 6) {
      const recent3 = scores.slice(0, 3);
      const previous3 = scores.slice(3, 6);
      const recentAvg = recent3.reduce((sum, score) => sum + score, 0) / 3;
      const previousAvg = previous3.reduce((sum, score) => sum + score, 0) / 3;
      trend = recentAvg - previousAvg;
    }

    return {
      goal,
      dataPoints: dataPointsList,
      currentProgress,
      averageScore,
      trend,
      lastScore,
    };
  }

  // Admin methods for database management
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getAllStudents(): Promise<Student[]> {
    return await db.select().from(students);
  }

  async getAllGoals(): Promise<Goal[]> {
    return await db.select().from(goals);
  }

  async getAllDataPoints(): Promise<DataPoint[]> {
    return await db.select().from(dataPoints);
  }

  async getAllStudentsWithDetails(): Promise<any[]> {
    const allStudents = await db.select().from(students);
    const studentsWithDetails = await Promise.all(
      allStudents.map(async (student) => {
        const summary = await this.getStudentSummary(student.id);
        const user = await this.getUser(student.userId);
        return {
          ...student,
          ...summary,
          teacherEmail: user?.email,
        };
      })
    );
    return studentsWithDetails;
  }

  async getAllGoalsWithDetails(): Promise<any[]> {
    const allGoals = await db.select().from(goals);
    const goalsWithDetails = await Promise.all(
      allGoals.map(async (goal) => {
        const student = await this.getStudentById(goal.studentId);
        const progress = await this.getGoalProgress(goal.id);
        return {
          ...goal,
          studentName: student?.name,
          currentProgress: progress.currentProgress,
          dataPointsCount: progress.dataPoints.length,
        };
      })
    );
    return goalsWithDetails;
  }

  async deleteUser(userId: string): Promise<void> {
    // First delete all related data
    const userStudents = await this.getStudentsByUserId(userId);
    for (const student of userStudents) {
      await this.deleteStudent(student.id);
    }
    // Then delete the user
    await db.delete(users).where(eq(users.id, userId));
  }

  async getDatabaseSchema(): Promise<any> {
    // Return schema information for admin view
    return {
      users: {
        tableName: "users",
        fields: [
          { name: "id", type: "varchar", isPrimary: true },
          { name: "email", type: "varchar", isUnique: true },
          { name: "firstName", type: "varchar" },
          { name: "lastName", type: "varchar" },
          { name: "profileImageUrl", type: "varchar" },
          { name: "createdAt", type: "timestamp" },
          { name: "updatedAt", type: "timestamp" }
        ]
      },
      students: {
        tableName: "students",
        fields: [
          { name: "id", type: "serial", isPrimary: true },
          { name: "userId", type: "varchar", isForeign: true, references: "users.id" },
          { name: "name", type: "varchar" },
          { name: "grade", type: "varchar" },
          { name: "createdAt", type: "timestamp" },
          { name: "updatedAt", type: "timestamp" }
        ]
      },
      goals: {
        tableName: "goals",
        fields: [
          { name: "id", type: "serial", isPrimary: true },
          { name: "studentId", type: "integer", isForeign: true, references: "students.id" },
          { name: "title", type: "varchar" },
          { name: "description", type: "text" },
          { name: "targetCriteria", type: "text" },
          { name: "levelOfSupport", type: "varchar" },
          { name: "status", type: "varchar" },
          { name: "createdAt", type: "timestamp" },
          { name: "updatedAt", type: "timestamp" }
        ]
      },
      data_points: {
        tableName: "data_points",
        fields: [
          { name: "id", type: "serial", isPrimary: true },
          { name: "goalId", type: "integer", isForeign: true, references: "goals.id" },
          { name: "value", type: "decimal" },
          { name: "notes", type: "text" },
          { name: "levelOfSupport", type: "text" },
          { name: "durationUnit", type: "varchar" },
          { name: "date", type: "timestamp" },
          { name: "createdAt", type: "timestamp" }
        ]
      },
      reporting_periods: {
        tableName: "reporting_periods",
        fields: [
          { name: "id", type: "serial", isPrimary: true },
          { name: "userId", type: "varchar", isForeign: true, references: "users.id" },
          { name: "periodNumber", type: "integer" },
          { name: "startDate", type: "varchar" },
          { name: "endDate", type: "varchar" },
          { name: "periodLength", type: "varchar" },
          { name: "createdAt", type: "timestamp" }
        ]
      },
      objectives: {
        tableName: "objectives",
        fields: [
          { name: "id", type: "serial", isPrimary: true },
          { name: "goalId", type: "integer", isForeign: true, references: "goals.id" },
          { name: "title", type: "varchar" },
          { name: "description", type: "text" },
          { name: "targetCriteria", type: "text" },
          { name: "status", type: "varchar" },
          { name: "createdAt", type: "timestamp" },
          { name: "updatedAt", type: "timestamp" }
        ]
      },
      sessions: {
        tableName: "sessions",
        fields: [
          { name: "sid", type: "varchar", isPrimary: true },
          { name: "sess", type: "jsonb" },
          { name: "expire", type: "timestamp" }
        ]
      }
    };
  }

  // Reporting periods operations
  async getReportingPeriodsByUserId(userId: string): Promise<ReportingPeriod[]> {
    const periods = await db
      .select()
      .from(reportingPeriods)
      .where(eq(reportingPeriods.userId, userId))
      .orderBy(asc(reportingPeriods.periodNumber));
    
    return periods;
  }

  async saveReportingPeriods(
    userId: string, 
    periods: { periodNumber: number; startDate: string; endDate: string; }[], 
    periodLength: string
  ): Promise<void> {
    // First, delete existing periods for this user
    await this.deleteReportingPeriodsByUserId(userId);
    
    // Then insert new periods
    if (periods.length > 0) {
      const periodsToInsert = periods.map(period => ({
        userId,
        periodLength,
        periodNumber: period.periodNumber,
        startDate: period.startDate,
        endDate: period.endDate,
      }));

      await db.insert(reportingPeriods).values(periodsToInsert);
    }
  }

  async deleteReportingPeriodsByUserId(userId: string): Promise<void> {
    await db.delete(reportingPeriods).where(eq(reportingPeriods.userId, userId));
  }

  // Objectives operations
  async getObjectivesByGoalId(goalId: number): Promise<Objective[]> {
    return await db
      .select()
      .from(objectives)
      .where(eq(objectives.goalId, goalId))
      .orderBy(asc(objectives.id));
  }

  async createObjective(objective: InsertObjective): Promise<Objective> {
    const [newObjective] = await db
      .insert(objectives)
      .values(objective)
      .returning();
    return newObjective;
  }

  async getObjectivesByStudentId(studentId: number): Promise<Objective[]> {
    return await db
      .select()
      .from(objectives)
      .where(eq(objectives.studentId, studentId))
      .orderBy(asc(objectives.goalId), asc(objectives.id));
  }

  async updateObjective(id: number, objective: Partial<InsertObjective>): Promise<Objective> {
    const [updatedObjective] = await db
      .update(objectives)
      .set({ ...objective, updatedAt: new Date() })
      .where(eq(objectives.id, id))
      .returning();
    return updatedObjective;
  }

  async deleteObjective(id: number): Promise<void> {
    await db.delete(objectives).where(eq(objectives.id, id));
  }

  async getObjectiveById(id: number): Promise<Objective | undefined> {
    const [objective] = await db
      .select()
      .from(objectives)
      .where(eq(objectives.id, id));
    return objective;
  }

  // Admin methods for database browsing
  async getAllSessions() {
    return await db.select().from(sessions);
  }

  async getAllReportingPeriods() {
    return await db.select().from(reportingPeriods);
  }

  async getAllObjectives() {
    return await db.select().from(objectives);
  }
}

export const storage = new DatabaseStorage();
