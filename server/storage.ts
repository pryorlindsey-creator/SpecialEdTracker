import {
  users,
  students,
  goals,
  objectives,
  dataPoints,
  reportingPeriods,
  sessions,
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
  type PaginationParams,
  type PaginatedResponse,
  type BatchCreateResult,
  type BatchDeleteResult,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  DEFAULT_BATCH_SIZE,
  insertDataPointSchema,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, inArray, asc, isNull, count } from "drizzle-orm";
import { 
  withDatabaseErrorHandling, 
  DatabaseError, 
  DatabaseErrorType,
  logDatabaseError,
  logDatabaseWarning,
  logDatabaseInfo 
} from "./dbUtils";

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
  getDataPointsByObjectiveId(objectiveId: number): Promise<DataPoint[]>;
  getDataPointsByStudentId(studentId: number): Promise<DataPoint[]>;
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
  
  getObjectiveProgress(objectiveId: number): Promise<{
    objective: Objective;
    dataPoints: DataPoint[];
    currentProgress: number;
    averageScore: number;
    trend: number;
    lastScore: number;
    dataPointsCount: number;
  }>;
  
  // Reporting periods operations
  getReportingPeriodsByUserId(userId: string): Promise<ReportingPeriod[]>;
  saveReportingPeriods(userId: string, periods: { periodNumber: number; startDate: string; endDate: string; }[], periodLength: string): Promise<void>;
  deleteReportingPeriodsByUserId(userId: string): Promise<void>;
  
  // Admin operations
  getAllUsers(): Promise<User[]>;
  getAllStudents(): Promise<Student[]>;
  getAllGoals(): Promise<Goal[]>;
  getAllDataPoints(): Promise<DataPoint[]>;
  deleteUser(userId: string): Promise<void>;
  getDatabaseSchema(): Promise<any>;
  getAllStudentsWithDetails(): Promise<any[]>;
  getAllGoalsWithDetails(): Promise<any[]>;
  getAllSessions(): Promise<any[]>;
  getAllReportingPeriods(): Promise<any[]>;
  getAllObjectives(): Promise<any[]>;
  
  // Paginated operations
  getDataPointsByGoalIdPaginated(goalId: number, params: { page?: number; limit?: number }): Promise<{
    data: DataPoint[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;
  getDataPointsByStudentIdPaginated(studentId: number, params: { page?: number; limit?: number }): Promise<{
    data: DataPoint[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;
  
  // Batch operations
  createDataPointsBatch(dataPoints: InsertDataPoint[]): Promise<DataPoint[]>;
  deleteDataPointsBatch(ids: number[]): Promise<{ deletedCount: number }>;
  deleteDataPointsByGoalId(goalId: number): Promise<{ deletedCount: number }>;
  
  // Admin verification operations
  verifyUserData(userId: string): Promise<{
    userId: string;
    userExists: boolean;
    studentCount: number;
    goalCount: number;
    dataPointCount: number;
    sampleStudents: any[];
    dataIntegrity: {
      orphanedGoals: number;
      orphanedDataPoints: number;
      studentsWithoutGoals: number;
      goalsWithoutDataPoints: number;
    };
  }>;
  verifyStudentData(studentId: number): Promise<{
    studentId: number;
    studentExists: boolean;
    student?: Student;
    goalCount: number;
    dataPointCount: number;
    goals: Goal[];
    recentDataPoints: DataPoint[];
    progressSummary: any;
  }>;
  verifyGoalData(goalId: number): Promise<{
    goalId: number;
    goalExists: boolean;
    goal?: Goal;
    student?: Student;
    dataPointCount: number;
    dataPoints: DataPoint[];
    progressCalculation: any;
  }>;
  getSampleUserData(userId: string): Promise<{
    user?: User;
    sampleStudents: any[];
    sampleGoals: any[];
    sampleDataPoints: any[];
    summary: any;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return withDatabaseErrorHandling("getUser", async () => {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    }, { context: { userId: id } });
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    return withDatabaseErrorHandling("upsertUser", async () => {
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
    }, { context: { userId: userData.id } });
  }

  // Student operations
  async getStudentsByUserId(userId: string): Promise<Student[]> {
    return withDatabaseErrorHandling("getStudentsByUserId", async () => {
      const result = await db
        .select()
        .from(students)
        .where(eq(students.userId, userId))
        .orderBy(asc(students.name));
      return result;
    }, { context: { userId } });
  }

  async createStudent(student: InsertStudent): Promise<Student> {
    return withDatabaseErrorHandling("createStudent", async () => {
      const [newStudent] = await db
        .insert(students)
        .values(student)
        .returning();
      return newStudent;
    }, { context: { studentName: student.name } });
  }

  async getStudentById(id: number): Promise<Student | undefined> {
    return withDatabaseErrorHandling("getStudentById", async () => {
      const [student] = await db
        .select()
        .from(students)
        .where(eq(students.id, id));
      return student;
    }, { context: { studentId: id } });
  }

  async updateStudent(id: number, student: Partial<InsertStudent>): Promise<Student> {
    return withDatabaseErrorHandling("updateStudent", async () => {
      const [updatedStudent] = await db
        .update(students)
        .set({ ...student, updatedAt: new Date() })
        .where(eq(students.id, id))
        .returning();
      return updatedStudent;
    }, { context: { studentId: id } });
  }

  async deleteStudent(id: number): Promise<void> {
    return withDatabaseErrorHandling("deleteStudent", async () => {
      await db.delete(students).where(eq(students.id, id));
    }, { context: { studentId: id } });
  }

  // Goal operations
  async getGoalsByStudentId(studentId: number): Promise<Goal[]> {
    return withDatabaseErrorHandling("getGoalsByStudentId", async () => {
      return await db
        .select()
        .from(goals)
        .where(eq(goals.studentId, studentId))
        .orderBy(desc(goals.createdAt));
    }, { context: { studentId } });
  }

  async createGoal(goal: InsertGoal): Promise<Goal> {
    return withDatabaseErrorHandling("createGoal", async () => {
      const [newGoal] = await db
        .insert(goals)
        .values(goal)
        .returning();
      return newGoal;
    }, { context: { studentId: goal.studentId, title: goal.title } });
  }

  async getGoalById(id: number): Promise<Goal | undefined> {
    return withDatabaseErrorHandling("getGoalById", async () => {
      const [goal] = await db
        .select()
        .from(goals)
        .where(eq(goals.id, id));
      return goal;
    }, { context: { goalId: id } });
  }

  async updateGoal(id: number, goal: Partial<InsertGoal>): Promise<Goal> {
    return withDatabaseErrorHandling("updateGoal", async () => {
      const [updatedGoal] = await db
        .update(goals)
        .set({ ...goal, updatedAt: new Date() })
        .where(eq(goals.id, id))
        .returning();
      return updatedGoal;
    }, { context: { goalId: id } });
  }

  async deleteGoal(id: number): Promise<void> {
    return withDatabaseErrorHandling("deleteGoal", async () => {
      await db.transaction(async (tx) => {
        await tx.delete(dataPoints).where(eq(dataPoints.goalId, id));
        await tx.delete(objectives).where(eq(objectives.goalId, id));
        await tx.delete(goals).where(eq(goals.id, id));
      });
    }, { context: { goalId: id } });
  }

  // Data point operations
  async getDataPointsByGoalId(goalId: number): Promise<DataPoint[]> {
    return withDatabaseErrorHandling("getDataPointsByGoalId", async () => {
      const rawDataPoints = await db
        .select()
        .from(dataPoints)
        .where(and(eq(dataPoints.goalId, goalId), isNull(dataPoints.objectiveId)))
        .orderBy(desc(dataPoints.date));
      
      return rawDataPoints.map(dp => ({
        ...dp,
        levelOfSupport: dp.levelOfSupport || null
      }));
    }, { context: { goalId } });
  }

  async getDataPointsByObjectiveId(objectiveId: number): Promise<DataPoint[]> {
    return withDatabaseErrorHandling("getDataPointsByObjectiveId", async () => {
      const rawDataPoints = await db
        .select()
        .from(dataPoints)
        .where(eq(dataPoints.objectiveId, objectiveId))
        .orderBy(desc(dataPoints.date));
      
      return rawDataPoints.map(dp => ({
        ...dp,
        levelOfSupport: dp.levelOfSupport || null
      }));
    }, { context: { objectiveId } });
  }

  async createDataPoint(dataPoint: InsertDataPoint): Promise<DataPoint> {
    return withDatabaseErrorHandling("createDataPoint", async () => {
      const [newDataPoint] = await db
        .insert(dataPoints)
        .values(dataPoint)
        .returning();
      return newDataPoint;
    }, { context: { goalId: dataPoint.goalId, studentId: dataPoint.studentId } });
  }

  async getDataPointsByStudentId(studentId: number): Promise<DataPoint[]> {
    return withDatabaseErrorHandling("getDataPointsByStudentId", async () => {
      return await db
        .select()
        .from(dataPoints)
        .where(eq(dataPoints.studentId, studentId))
        .orderBy(desc(dataPoints.date));
    }, { context: { studentId } });
  }

  async getAllDataPointsForGoalWithObjectives(goalId: number): Promise<Array<DataPoint & { 
    objectiveDescription?: string | null;
    isObjectiveSpecific: boolean;
  }>> {
    return withDatabaseErrorHandling("getAllDataPointsForGoalWithObjectives", async () => {
      const allGoalDataPoints = await db
        .select()
        .from(dataPoints)
        .where(eq(dataPoints.goalId, goalId))
        .orderBy(desc(dataPoints.date));

      const goalObjectives = await db
        .select()
        .from(objectives)
        .where(eq(objectives.goalId, goalId));

      const objectiveMap = new Map(goalObjectives.map(obj => [obj.id, obj]));

      return allGoalDataPoints.map(dp => {
        const objective = dp.objectiveId ? objectiveMap.get(dp.objectiveId) : null;
        return {
          ...dp,
          levelOfSupport: dp.levelOfSupport || null,
          objectiveDescription: objective?.description || null,
          isObjectiveSpecific: !!dp.objectiveId,
        };
      });
    }, { context: { goalId } });
  }

  async getDataPointById(id: number): Promise<DataPoint | undefined> {
    return withDatabaseErrorHandling("getDataPointById", async () => {
      const [dataPoint] = await db
        .select()
        .from(dataPoints)
        .where(eq(dataPoints.id, id));
      return dataPoint;
    }, { context: { dataPointId: id } });
  }

  async updateDataPoint(id: number, dataPoint: Partial<InsertDataPoint>): Promise<DataPoint> {
    return withDatabaseErrorHandling("updateDataPoint", async () => {
      const [updatedDataPoint] = await db
        .update(dataPoints)
        .set(dataPoint)
        .where(eq(dataPoints.id, id))
        .returning();
      return updatedDataPoint;
    }, { context: { dataPointId: id } });
  }

  async deleteDataPoint(id: number): Promise<void> {
    return withDatabaseErrorHandling("deleteDataPoint", async () => {
      await db.delete(dataPoints).where(eq(dataPoints.id, id));
    }, { context: { dataPointId: id } });
  }

  // Paginated data point operations
  async getDataPointsByGoalIdPaginated(
    goalId: number, 
    params: { page?: number; limit?: number }
  ): Promise<{ data: DataPoint[]; total: number; page: number; limit: number; totalPages: number }> {
    return withDatabaseErrorHandling("getDataPointsByGoalIdPaginated", async () => {
      const page = Math.max(1, params.page || 1);
      const limit = Math.min(100, Math.max(1, params.limit || 50));
      const offset = (page - 1) * limit;
      
      const [countResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(dataPoints)
        .where(eq(dataPoints.goalId, goalId));
      
      const total = countResult?.count || 0;
      const totalPages = Math.ceil(total / limit);
      
      const data = await db
        .select()
        .from(dataPoints)
        .where(eq(dataPoints.goalId, goalId))
        .orderBy(desc(dataPoints.date))
        .limit(limit)
        .offset(offset);
      
      return { data, total, page, limit, totalPages };
    }, { context: { goalId, page: params.page, limit: params.limit } });
  }

  async getDataPointsByStudentIdPaginated(
    studentId: number,
    params: { page?: number; limit?: number }
  ): Promise<{ data: DataPoint[]; total: number; page: number; limit: number; totalPages: number }> {
    return withDatabaseErrorHandling("getDataPointsByStudentIdPaginated", async () => {
      const page = Math.max(1, params.page || 1);
      const limit = Math.min(100, Math.max(1, params.limit || 50));
      const offset = (page - 1) * limit;
      
      const [countResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(dataPoints)
        .where(eq(dataPoints.studentId, studentId));
      
      const total = countResult?.count || 0;
      const totalPages = Math.ceil(total / limit);
      
      const data = await db
        .select()
        .from(dataPoints)
        .where(eq(dataPoints.studentId, studentId))
        .orderBy(desc(dataPoints.date))
        .limit(limit)
        .offset(offset);
      
      return { data, total, page, limit, totalPages };
    }, { context: { studentId, page: params.page, limit: params.limit } });
  }

  // Batch operations for data points
  async createDataPointsBatch(dataPointsToCreate: InsertDataPoint[]): Promise<DataPoint[]> {
    return withDatabaseErrorHandling("createDataPointsBatch", async () => {
      if (dataPointsToCreate.length === 0) {
        return [];
      }
      
      if (dataPointsToCreate.length > 100) {
        throw new Error("Batch size cannot exceed 100 data points");
      }
      
      const createdDataPoints = await db
        .insert(dataPoints)
        .values(dataPointsToCreate)
        .returning();
      
      return createdDataPoints;
    }, { context: { batchSize: dataPointsToCreate.length } });
  }

  async deleteDataPointsBatch(ids: number[]): Promise<{ deletedCount: number }> {
    return withDatabaseErrorHandling("deleteDataPointsBatch", async () => {
      if (ids.length === 0) {
        return { deletedCount: 0 };
      }
      
      if (ids.length > 100) {
        throw new Error("Batch size cannot exceed 100 deletions");
      }
      
      const result = await db
        .delete(dataPoints)
        .where(inArray(dataPoints.id, ids))
        .returning({ id: dataPoints.id });
      
      return { deletedCount: result.length };
    }, { context: { batchSize: ids.length } });
  }

  async deleteDataPointsByGoalId(goalId: number): Promise<{ deletedCount: number }> {
    return withDatabaseErrorHandling("deleteDataPointsByGoalId", async () => {
      const result = await db
        .delete(dataPoints)
        .where(eq(dataPoints.goalId, goalId))
        .returning({ id: dataPoints.id });
      
      return { deletedCount: result.length };
    }, { context: { goalId } });
  }

  // Clear data operations
  async clearStudentData(studentId: number): Promise<void> {
    return withDatabaseErrorHandling("clearStudentData", async () => {
      await db.transaction(async (tx) => {
        await tx.delete(dataPoints).where(eq(dataPoints.studentId, studentId));
        await tx.delete(objectives).where(eq(objectives.studentId, studentId));
        await tx.delete(goals).where(eq(goals.studentId, studentId));
      });
    }, { context: { studentId } });
  }

  async removeStudentFromCaseload(studentId: number): Promise<void> {
    return withDatabaseErrorHandling("removeStudentFromCaseload", async () => {
      await db.transaction(async (tx) => {
        await tx.delete(dataPoints).where(eq(dataPoints.studentId, studentId));
        await tx.delete(objectives).where(eq(objectives.studentId, studentId));
        await tx.delete(goals).where(eq(goals.studentId, studentId));
        await tx.delete(students).where(eq(students.id, studentId));
      });
    }, { context: { studentId } });
  }

  async clearAllUserData(userId: string): Promise<void> {
    return withDatabaseErrorHandling("clearAllUserData", async () => {
      const userStudents = await db
        .select({ id: students.id })
        .from(students)
        .where(eq(students.userId, userId));
      
      const studentIds = userStudents.map(s => s.id);
      
      await db.transaction(async (tx) => {
        if (studentIds.length > 0) {
          await tx.delete(dataPoints).where(inArray(dataPoints.studentId, studentIds));
          await tx.delete(objectives).where(inArray(objectives.studentId, studentIds));
          await tx.delete(goals).where(inArray(goals.studentId, studentIds));
        }
        await tx.delete(students).where(eq(students.userId, userId));
        await tx.delete(reportingPeriods).where(eq(reportingPeriods.userId, userId));
      });
    }, { context: { userId } });
  }

  // Analytics operations
  async getStudentSummary(studentId: number): Promise<{
    totalGoals: number;
    activeGoals: number;
    completedGoals: number;
    totalDataPoints: number;
    lastDataPoint?: DataPoint;
  }> {
    return withDatabaseErrorHandling("getStudentSummary", async () => {
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
    }, { context: { studentId } });
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

  async getObjectiveProgress(objectiveId: number): Promise<{
    objective: Objective;
    dataPoints: DataPoint[];
    currentProgress: number;
    averageScore: number;
    trend: number;
    lastScore: number;
    dataPointsCount: number;
  }> {
    const objective = await this.getObjectiveById(objectiveId);
    if (!objective) {
      throw new Error('Objective not found');
    }

    const dataPointsList = await this.getDataPointsByObjectiveId(objectiveId);
    
    if (dataPointsList.length === 0) {
      return {
        objective,
        dataPoints: [],
        currentProgress: 0,
        averageScore: 0,
        trend: 0,
        lastScore: 0,
        dataPointsCount: 0,
      };
    }

    // Calculate progress based on data collection type (inherited from goal)
    const goal = await this.getGoalById(objective.goalId);
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
      objective,
      dataPoints: dataPointsList,
      currentProgress,
      averageScore,
      trend,
      lastScore,
      dataPointsCount: dataPointsList.length,
    };
  }

  // Admin methods for database management
  async getAllUsers(): Promise<User[]> {
    return withDatabaseErrorHandling("getAllUsers", async () => {
      return await db.select().from(users);
    });
  }

  async getAllStudents(): Promise<Student[]> {
    return withDatabaseErrorHandling("getAllStudents", async () => {
      return await db.select().from(students);
    });
  }

  async getAllStudentsWithDetails(): Promise<any[]> {
    return withDatabaseErrorHandling("getAllStudentsWithDetails", async () => {
      const [allStudents, allUsers, allGoals, allDataPoints] = await Promise.all([
        db.select().from(students),
        db.select().from(users),
        db.select().from(goals),
        db.select().from(dataPoints),
      ]);

      const userMap = new Map(allUsers.map(u => [u.id, u]));
      const goalsByStudent = new Map<number, typeof allGoals>();
      const dataPointsByGoal = new Map<number, typeof allDataPoints>();

      for (const goal of allGoals) {
        if (!goalsByStudent.has(goal.studentId)) {
          goalsByStudent.set(goal.studentId, []);
        }
        goalsByStudent.get(goal.studentId)!.push(goal);
      }

      for (const dp of allDataPoints) {
        if (!dataPointsByGoal.has(dp.goalId)) {
          dataPointsByGoal.set(dp.goalId, []);
        }
        dataPointsByGoal.get(dp.goalId)!.push(dp);
      }

      return allStudents.map(student => {
        const studentGoals = goalsByStudent.get(student.id) || [];
        const user = userMap.get(student.userId);
        
        const totalGoals = studentGoals.length;
        const activeGoals = studentGoals.filter(g => g.status === 'active').length;
        const completedGoals = studentGoals.filter(g => g.status === 'mastered').length;
        
        let totalDataPoints = 0;
        let lastDataPoint: typeof allDataPoints[0] | undefined;
        
        for (const goal of studentGoals) {
          const goalDps = dataPointsByGoal.get(goal.id) || [];
          totalDataPoints += goalDps.length;
          for (const dp of goalDps) {
            if (!lastDataPoint || new Date(dp.date) > new Date(lastDataPoint.date)) {
              lastDataPoint = dp;
            }
          }
        }

        return {
          ...student,
          totalGoals,
          activeGoals,
          completedGoals,
          totalDataPoints,
          lastDataPoint,
          teacherEmail: user?.email,
        };
      });
    });
  }

  async getAllGoalsWithDetails(): Promise<any[]> {
    return withDatabaseErrorHandling("getAllGoalsWithDetails", async () => {
      const [allGoals, allStudents, allDataPoints] = await Promise.all([
        db.select().from(goals),
        db.select().from(students),
        db.select().from(dataPoints),
      ]);

      const studentMap = new Map(allStudents.map(s => [s.id, s]));
      const dataPointsByGoal = new Map<number, typeof allDataPoints>();

      for (const dp of allDataPoints) {
        if (!dataPointsByGoal.has(dp.goalId)) {
          dataPointsByGoal.set(dp.goalId, []);
        }
        dataPointsByGoal.get(dp.goalId)!.push(dp);
      }

      return allGoals.map(goal => {
        const student = studentMap.get(goal.studentId);
        const goalDataPoints = dataPointsByGoal.get(goal.id) || [];
        
        let currentProgress = 0;
        if (goalDataPoints.length > 0) {
          const sortedDps = goalDataPoints.sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          currentProgress = parseFloat(sortedDps[0].progressValue?.toString() || '0');
        }

        return {
          ...goal,
          studentName: student?.name,
          currentProgress,
          dataPointsCount: goalDataPoints.length,
        };
      });
    });
  }

  async getAllGoals(): Promise<Goal[]> {
    return withDatabaseErrorHandling("getAllGoals", async () => {
      return await db.select().from(goals);
    });
  }

  async getAllDataPoints(): Promise<DataPoint[]> {
    return withDatabaseErrorHandling("getAllDataPoints", async () => {
      return await db.select().from(dataPoints);
    });
  }

  async getAllSessions(): Promise<any[]> {
    return withDatabaseErrorHandling("getAllSessions", async () => {
      return await db.select().from(sessions);
    });
  }

  async getAllReportingPeriods(): Promise<any[]> {
    return withDatabaseErrorHandling("getAllReportingPeriods", async () => {
      return await db.select().from(reportingPeriods);
    });
  }

  async getAllObjectives(): Promise<any[]> {
    return withDatabaseErrorHandling("getAllObjectives", async () => {
      return await db.select().from(objectives);
    });
  }

  async deleteUser(userId: string): Promise<void> {
    return withDatabaseErrorHandling("deleteUser", async () => {
      const userStudents = await this.getStudentsByUserId(userId);
      for (const student of userStudents) {
        await this.deleteStudent(student.id);
      }
      await db.delete(users).where(eq(users.id, userId));
    }, { context: { userId } });
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
    return withDatabaseErrorHandling("getReportingPeriodsByUserId", async () => {
      const periods = await db
        .select()
        .from(reportingPeriods)
        .where(eq(reportingPeriods.userId, userId))
        .orderBy(asc(reportingPeriods.periodNumber));
      
      return periods;
    }, { context: { userId } });
  }

  async saveReportingPeriods(
    userId: string, 
    periods: { periodNumber: number; startDate: string; endDate: string; }[], 
    periodLength: string
  ): Promise<void> {
    return withDatabaseErrorHandling("saveReportingPeriods", async () => {
      await this.deleteReportingPeriodsByUserId(userId);
      
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
    }, { context: { userId, periodsCount: periods.length } });
  }

  async deleteReportingPeriodsByUserId(userId: string): Promise<void> {
    return withDatabaseErrorHandling("deleteReportingPeriodsByUserId", async () => {
      await db.delete(reportingPeriods).where(eq(reportingPeriods.userId, userId));
    }, { context: { userId } });
  }

  // Objectives operations
  async getObjectivesByGoalId(goalId: number): Promise<Objective[]> {
    return withDatabaseErrorHandling("getObjectivesByGoalId", async () => {
      return await db
        .select()
        .from(objectives)
        .where(eq(objectives.goalId, goalId))
        .orderBy(asc(objectives.id));
    }, { context: { goalId } });
  }

  async createObjective(objective: InsertObjective): Promise<Objective> {
    return withDatabaseErrorHandling("createObjective", async () => {
      const [newObjective] = await db
        .insert(objectives)
        .values(objective)
        .returning();
      return newObjective;
    }, { context: { goalId: objective.goalId } });
  }

  async getObjectivesByStudentId(studentId: number): Promise<Objective[]> {
    return withDatabaseErrorHandling("getObjectivesByStudentId", async () => {
      return await db
        .select()
        .from(objectives)
        .where(eq(objectives.studentId, studentId))
        .orderBy(asc(objectives.goalId), asc(objectives.id));
    }, { context: { studentId } });
  }

  async updateObjective(id: number, objective: Partial<InsertObjective>): Promise<Objective> {
    return withDatabaseErrorHandling("updateObjective", async () => {
      const [updatedObjective] = await db
        .update(objectives)
        .set({ ...objective, updatedAt: new Date() })
        .where(eq(objectives.id, id))
        .returning();
      return updatedObjective;
    }, { context: { objectiveId: id } });
  }

  async deleteObjective(id: number): Promise<void> {
    return withDatabaseErrorHandling("deleteObjective", async () => {
      await db.delete(objectives).where(eq(objectives.id, id));
    }, { context: { objectiveId: id } });
  }

  async getObjectiveById(id: number): Promise<Objective | undefined> {
    return withDatabaseErrorHandling("getObjectiveById", async () => {
      const [objective] = await db
        .select()
        .from(objectives)
        .where(eq(objectives.id, id));
      return objective;
    }, { context: { objectiveId: id } });
  }

  // Admin verification methods
  async verifyUserData(userId: string) {
    return withDatabaseErrorHandling("verifyUserData", async () => {
      const [user, userStudents] = await Promise.all([
        this.getUser(userId),
        db.select().from(students).where(eq(students.userId, userId))
      ]);
      
      const combinedCounts = await db.execute(sql`
        SELECT 
          (SELECT COUNT(g.id) FROM goals g JOIN students s ON g.student_id = s.id WHERE s.user_id = ${userId}) as goal_count,
          (SELECT COUNT(dp.id) FROM data_points dp JOIN students s ON dp.student_id = s.id WHERE s.user_id = ${userId}) as data_point_count,
          (SELECT COUNT(*) FROM goals g LEFT JOIN students s ON g.student_id = s.id WHERE s.id IS NULL) as orphaned_goals,
          (SELECT COUNT(*) FROM data_points dp LEFT JOIN goals g ON dp.goal_id = g.id WHERE g.id IS NULL) as orphaned_data_points,
          (SELECT COUNT(*) FROM students s LEFT JOIN goals g ON s.id = g.student_id WHERE s.user_id = ${userId} AND g.id IS NULL) as students_without_goals,
          (SELECT COUNT(*) FROM goals g JOIN students s ON g.student_id = s.id LEFT JOIN data_points dp ON g.id = dp.goal_id WHERE s.user_id = ${userId} AND dp.id IS NULL) as goals_without_data_points
      `);

      const counts = combinedCounts.rows[0] || {};

      return {
        userId,
        userExists: !!user,
        studentCount: userStudents.length,
        goalCount: Number(counts.goal_count || 0),
        dataPointCount: Number(counts.data_point_count || 0),
        sampleStudents: userStudents.slice(0, 5),
        dataIntegrity: {
          orphanedGoals: Number(counts.orphaned_goals || 0),
          orphanedDataPoints: Number(counts.orphaned_data_points || 0),
          studentsWithoutGoals: Number(counts.students_without_goals || 0),
          goalsWithoutDataPoints: Number(counts.goals_without_data_points || 0),
        }
      };
    }, { context: { userId } });
  }

  async verifyStudentData(studentId: number) {
    return withDatabaseErrorHandling("verifyStudentData", async () => {
      const student = await this.getStudentById(studentId);
      const studentGoals = student ? await this.getGoalsByStudentId(studentId) : [];
      const studentDataPoints = student ? await this.getDataPointsByStudentId(studentId) : [];
      const summary = student ? await this.getStudentSummary(studentId) : null;

      return {
        studentId,
        studentExists: !!student,
        student,
        goalCount: studentGoals.length,
        dataPointCount: studentDataPoints.length,
        goals: studentGoals,
        recentDataPoints: studentDataPoints.slice(0, 10),
        progressSummary: summary
      };
    }, { context: { studentId } });
  }

  async verifyGoalData(goalId: number) {
    return withDatabaseErrorHandling("verifyGoalData", async () => {
      const goal = await this.getGoalById(goalId);
      const student = goal ? await this.getStudentById(goal.studentId) : undefined;
      const goalDataPoints = goal ? await this.getDataPointsByGoalId(goalId) : [];
      const progress = goal ? await this.getGoalProgress(goalId) : null;

      return {
        goalId,
        goalExists: !!goal,
        goal,
        student,
        dataPointCount: goalDataPoints.length,
        dataPoints: goalDataPoints,
        progressCalculation: progress
      };
    }, { context: { goalId } });
  }

  async getSampleUserData(userId: string) {
    return withDatabaseErrorHandling("getSampleUserData", async () => {
      const user = await this.getUser(userId);
      const studentsData = user ? await db.select().from(students).where(eq(students.userId, userId)).limit(5) : [];
      
      const goalsData = studentsData.length > 0 ? await db.select().from(goals)
        .where(inArray(goals.studentId, studentsData.map((s: any) => s.id)))
        .limit(10) : [];
      
      const dataPointsData = goalsData.length > 0 ? await db.select().from(dataPoints)
        .where(inArray(dataPoints.goalId, goalsData.map((g: any) => g.id)))
        .limit(20) : [];

      const summary = {
        totalStudents: studentsData.length,
        totalGoals: goalsData.length,
        totalDataPoints: dataPointsData.length,
        dataTypes: goalsData.reduce((acc: any, g: any) => {
          acc[g.dataCollectionType] = (acc[g.dataCollectionType] || 0) + 1;
          return acc;
        }, {})
      };

      return {
        user,
        sampleStudents: studentsData,
        sampleGoals: goalsData,
        sampleDataPoints: dataPointsData,
        summary
      };
    }, { context: { userId } });
  }
}

export const storage = new DatabaseStorage();
