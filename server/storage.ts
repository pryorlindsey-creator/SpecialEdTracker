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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, inArray, asc, isNull } from "drizzle-orm";

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
    const result = await db
      .select()
      .from(students)
      .where(eq(students.userId, userId))
      .orderBy(asc(students.name));
    return result;
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
    // First delete all data points associated with this goal
    await db.delete(dataPoints).where(eq(dataPoints.goalId, id));
    
    // Then delete all objectives associated with this goal
    await db.delete(objectives).where(eq(objectives.goalId, id));
    
    // Finally delete the goal itself
    await db.delete(goals).where(eq(goals.id, id));
  }

  // Data point operations
  async getDataPointsByGoalId(goalId: number): Promise<DataPoint[]> {
    const rawDataPoints = await db
      .select()
      .from(dataPoints)
      .where(and(eq(dataPoints.goalId, goalId), isNull(dataPoints.objectiveId)))
      .orderBy(desc(dataPoints.date));
    
    // Convert level of support from JSON strings back to arrays
    return rawDataPoints.map(dp => ({
      ...dp,
      levelOfSupport: dp.levelOfSupport || null
    }));
  }

  async getDataPointsByObjectiveId(objectiveId: number): Promise<DataPoint[]> {
    const rawDataPoints = await db
      .select()
      .from(dataPoints)
      .where(eq(dataPoints.objectiveId, objectiveId))
      .orderBy(desc(dataPoints.date));
    
    // Convert level of support from JSON strings back to arrays
    return rawDataPoints.map(dp => ({
      ...dp,
      levelOfSupport: dp.levelOfSupport || null
    }));
  }

  async createDataPoint(dataPoint: InsertDataPoint): Promise<DataPoint> {
    const [newDataPoint] = await db
      .insert(dataPoints)
      .values(dataPoint)
      .returning();
    return newDataPoint;
  }

  async getDataPointsByStudentId(studentId: number): Promise<DataPoint[]> {
    return await db
      .select()
      .from(dataPoints)
      .where(eq(dataPoints.studentId, studentId))
      .orderBy(desc(dataPoints.date));
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

  // Clear data operations
  async clearStudentData(studentId: number): Promise<void> {
    // Delete all data points for this student
    await db.delete(dataPoints).where(eq(dataPoints.studentId, studentId));
    
    // Delete all objectives for this student
    await db.delete(objectives).where(eq(objectives.studentId, studentId));
    
    // Delete all goals for this student
    await db.delete(goals).where(eq(goals.studentId, studentId));
  }

  async removeStudentFromCaseload(studentId: number): Promise<void> {
    // Delete all data points for this student
    await db.delete(dataPoints).where(eq(dataPoints.studentId, studentId));
    
    // Delete all objectives for this student
    await db.delete(objectives).where(eq(objectives.studentId, studentId));
    
    // Delete all goals for this student
    await db.delete(goals).where(eq(goals.studentId, studentId));
    
    // Delete the student record itself
    await db.delete(students).where(eq(students.id, studentId));
  }

  async clearAllUserData(userId: string): Promise<void> {
    // Get all students for this user
    const userStudents = await db
      .select({ id: students.id })
      .from(students)
      .where(eq(students.userId, userId));
    
    const studentIds = userStudents.map(s => s.id);
    
    if (studentIds.length > 0) {
      // Delete all data points for all students
      await db.delete(dataPoints).where(inArray(dataPoints.studentId, studentIds));
      
      // Delete all objectives for all students  
      await db.delete(objectives).where(inArray(objectives.studentId, studentIds));
      
      // Delete all goals for all students
      await db.delete(goals).where(inArray(goals.studentId, studentIds));
    }
    
    // Delete all students
    await db.delete(students).where(eq(students.userId, userId));
    
    // Delete reporting periods
    await db.delete(reportingPeriods).where(eq(reportingPeriods.userId, userId));
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
    return await db.select().from(users);
  }

  async getAllStudents(): Promise<Student[]> {
    return await db.select().from(students);
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

  async getAllGoals(): Promise<Goal[]> {
    return await db.select().from(goals);
  }

  async getAllDataPoints(): Promise<DataPoint[]> {
    return await db.select().from(dataPoints);
  }

  async getAllSessions(): Promise<any[]> {
    return await db.select().from(sessions);
  }

  async getAllReportingPeriods(): Promise<any[]> {
    return await db.select().from(reportingPeriods);
  }

  async getAllObjectives(): Promise<any[]> {
    return await db.select().from(objectives);
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

  // Admin verification methods
  async verifyUserData(userId: string) {
    const user = await this.getUser(userId);
    const userStudents = user ? await db.select().from(students).where(eq(students.userId, userId)) : [];
    
    const goalCounts = await db.execute(sql`
      SELECT COUNT(g.id) as count 
      FROM goals g
      JOIN students s ON g.student_id = s.id
      WHERE s.user_id = ${userId}
    `);
    
    const dataPointCounts = await db.execute(sql`
      SELECT COUNT(dp.id) as count 
      FROM data_points dp
      JOIN students s ON dp.student_id = s.id
      WHERE s.user_id = ${userId}
    `);

    const orphanedGoals = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM goals g
      LEFT JOIN students s ON g.student_id = s.id
      WHERE s.id IS NULL
    `);

    const orphanedDataPoints = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM data_points dp
      LEFT JOIN goals g ON dp.goal_id = g.id
      WHERE g.id IS NULL
    `);

    const studentsWithoutGoals = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM students s
      LEFT JOIN goals g ON s.id = g.student_id
      WHERE s.user_id = ${userId} AND g.id IS NULL
    `);

    const goalsWithoutDataPoints = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM goals g
      JOIN students s ON g.student_id = s.id
      LEFT JOIN data_points dp ON g.id = dp.goal_id
      WHERE s.user_id = ${userId} AND dp.id IS NULL
    `);

    return {
      userId,
      userExists: !!user,
      studentCount: userStudents.length,
      goalCount: Number(goalCounts.rows[0]?.count || 0),
      dataPointCount: Number(dataPointCounts.rows[0]?.count || 0),
      sampleStudents: userStudents.slice(0, 5),
      dataIntegrity: {
        orphanedGoals: Number(orphanedGoals.rows[0]?.count || 0),
        orphanedDataPoints: Number(orphanedDataPoints.rows[0]?.count || 0),
        studentsWithoutGoals: Number(studentsWithoutGoals.rows[0]?.count || 0),
        goalsWithoutDataPoints: Number(goalsWithoutDataPoints.rows[0]?.count || 0),
      }
    };
  }

  async verifyStudentData(studentId: number) {
    const student = await this.getStudentById(studentId);
    const goals = student ? await this.getGoalsByStudentId(studentId) : [];
    const dataPoints = student ? await this.getDataPointsByStudentId(studentId) : [];
    const summary = student ? await this.getStudentSummary(studentId) : null;

    return {
      studentId,
      studentExists: !!student,
      student,
      goalCount: goals.length,
      dataPointCount: dataPoints.length,
      goals,
      recentDataPoints: dataPoints.slice(0, 10),
      progressSummary: summary
    };
  }

  async verifyGoalData(goalId: number) {
    const goal = await this.getGoalById(goalId);
    const student = goal ? await this.getStudentById(goal.studentId) : undefined;
    const dataPoints = goal ? await this.getDataPointsByGoalId(goalId) : [];
    const progress = goal ? await this.getGoalProgress(goalId) : null;

    return {
      goalId,
      goalExists: !!goal,
      goal,
      student,
      dataPointCount: dataPoints.length,
      dataPoints,
      progressCalculation: progress
    };
  }

  async getSampleUserData(userId: string) {
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
  }
}

export const storage = new DatabaseStorage();
