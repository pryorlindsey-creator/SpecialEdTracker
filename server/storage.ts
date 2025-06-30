import {
  users,
  students,
  goals,
  dataPoints,
  type User,
  type UpsertUser,
  type Student,
  type InsertStudent,
  type Goal,
  type InsertGoal,
  type DataPoint,
  type InsertDataPoint,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and } from "drizzle-orm";

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
    return await db
      .select()
      .from(students)
      .where(eq(students.userId, userId))
      .orderBy(desc(students.createdAt));
  }

  async createStudent(student: InsertStudent): Promise<Student> {
    const [newStudent] = await db
      .insert(students)
      .values(student)
      .returning();
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
    const [newGoal] = await db
      .insert(goals)
      .values(goal)
      .returning();
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
    return await db
      .select()
      .from(dataPoints)
      .where(eq(dataPoints.goalId, goalId))
      .orderBy(desc(dataPoints.date));
  }

  async createDataPoint(dataPoint: InsertDataPoint): Promise<DataPoint> {
    const [newDataPoint] = await db
      .insert(dataPoints)
      .values(dataPoint)
      .returning();
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
      .where(sql`${dataPoints.goalId} = ANY(${goalIds})`)
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

    const scores = dataPointsList.map(dp => parseFloat(dp.progressValue.toString()));
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const lastScore = scores[0]; // dataPoints are ordered by date desc
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
}

export const storage = new DatabaseStorage();
