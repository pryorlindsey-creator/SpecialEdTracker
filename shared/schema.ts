import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  decimal,
  boolean,
  date,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (mandatory for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Students table
export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: varchar("name").notNull(),
  grade: varchar("grade"),
  iepDueDate: timestamp("iep_due_date"),
  relatedServices: text("related_services"), // JSON string of services like "Speech Therapy, Occupational Therapy"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Goals table
export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => students.id),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  targetCriteria: text("target_criteria"), // e.g., "80% accuracy over 3 consecutive trials"
  levelOfSupport: text("level_of_support"), // independent, verbal-prompt, etc.
  dataCollectionType: varchar("data_collection_type").notNull().default("percentage"), // frequency, percentage, duration
  frequencyDirection: varchar("frequency_direction"), // "increase" or "decrease" for frequency goals
  status: varchar("status").notNull().default("active"), // active, mastered, discontinued
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Objectives table
export const objectives = pgTable("objectives", {
  id: serial("id").primaryKey(),
  goalId: integer("goal_id").notNull().references(() => goals.id),
  studentId: integer("student_id").notNull().references(() => students.id),
  title: varchar("title"), // Made optional since we're removing it from UI
  description: text("description").notNull(),
  targetCriteria: text("target_criteria"),
  targetDate: timestamp("target_date"),
  status: varchar("status").notNull().default("active"), // active, mastered, discontinued
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Data points table
export const dataPoints = pgTable("data_points", {
  id: serial("id").primaryKey(),
  goalId: integer("goal_id").notNull().references(() => goals.id),
  objectiveId: integer("objective_id").references(() => objectives.id), // optional - can be for goal or specific objective
  studentId: integer("student_id").notNull().references(() => students.id),
  date: timestamp("date").notNull(),
  progressValue: decimal("progress_value", { precision: 5, scale: 2 }).notNull(), // percentage or score
  progressFormat: varchar("progress_format").notNull().default("percentage"), // percentage or fraction
  numerator: integer("numerator"), // for fraction format (e.g., 8 in 8/10)
  denominator: integer("denominator"), // for fraction format (e.g., 10 in 8/10)
  // noResponseCount: integer("no_response_count"), // count of no response trials for accuracy data (pending migration)
  durationUnit: varchar("duration_unit"), // seconds, minutes for duration data collection
  levelOfSupport: text("level_of_support"), // support levels as JSON array string or single value
  setting: text("setting"), // settings as JSON array string or single value (general-education, special-education, etc.)
  anecdotalInfo: text("anecdotal_info"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  students: many(students),
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  user: one(users, {
    fields: [students.userId],
    references: [users.id],
  }),
  goals: many(goals),
  objectives: many(objectives),
  dataPoints: many(dataPoints),
}));

export const goalsRelations = relations(goals, ({ one, many }) => ({
  student: one(students, {
    fields: [goals.studentId],
    references: [students.id],
  }),
  objectives: many(objectives),
  dataPoints: many(dataPoints),
}));

export const objectivesRelations = relations(objectives, ({ one, many }) => ({
  goal: one(goals, {
    fields: [objectives.goalId],
    references: [goals.id],
  }),
  student: one(students, {
    fields: [objectives.studentId],
    references: [students.id],
  }),
  dataPoints: many(dataPoints),
}));

export const dataPointsRelations = relations(dataPoints, ({ one }) => ({
  goal: one(goals, {
    fields: [dataPoints.goalId],
    references: [goals.id],
  }),
  objective: one(objectives, {
    fields: [dataPoints.objectiveId],
    references: [objectives.id],
  }),
  student: one(students, {
    fields: [dataPoints.studentId],
    references: [students.id],
  }),
}));

// Validation enums for strict type checking
export const DATA_COLLECTION_TYPES = ["percentage", "frequency", "duration"] as const;
export const PROGRESS_FORMATS = ["percentage", "fraction", "frequency", "duration"] as const;
export const GOAL_STATUSES = ["active", "mastered", "discontinued"] as const;
export const FREQUENCY_DIRECTIONS = ["increase", "decrease"] as const;
export const DURATION_UNITS = ["seconds", "minutes"] as const;

export type DataCollectionType = typeof DATA_COLLECTION_TYPES[number];
export type ProgressFormat = typeof PROGRESS_FORMATS[number];
export type GoalStatus = typeof GOAL_STATUSES[number];
export type FrequencyDirection = typeof FREQUENCY_DIRECTIONS[number];
export type DurationUnit = typeof DURATION_UNITS[number];

// Insert schemas with strict validation
export const insertStudentSchema = createInsertSchema(students).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1, "Student name is required").max(100, "Name must be 100 characters or less"),
  grade: z.string().max(20, "Grade must be 20 characters or less").optional(),
  iepDueDate: z.union([z.string(), z.date(), z.undefined()]).optional().transform((val) => {
    if (!val || val === '') return undefined;
    if (typeof val === 'string') {
      const parsed = new Date(val);
      if (isNaN(parsed.getTime())) {
        throw new Error("Invalid date format for IEP due date");
      }
      return parsed;
    }
    return val;
  }),
  relatedServices: z.string().max(500, "Related services must be 500 characters or less").optional(),
});

export const insertGoalSchema = createInsertSchema(goals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  title: z.string().min(1, "Goal title is required").max(200, "Title must be 200 characters or less"),
  description: z.string().min(1, "Goal description is required").max(2000, "Description must be 2000 characters or less"),
  targetCriteria: z.string().max(500, "Target criteria must be 500 characters or less").optional().nullable(),
  levelOfSupport: z.string().max(500, "Level of support must be 500 characters or less").optional().nullable(),
  dataCollectionType: z.enum(DATA_COLLECTION_TYPES, {
    errorMap: () => ({ message: "Data collection type must be percentage, frequency, or duration" })
  }).default("percentage"),
  frequencyDirection: z.preprocess(
    (val) => (val === '' || val === undefined ? null : val),
    z.enum(FREQUENCY_DIRECTIONS, {
      errorMap: () => ({ message: "Frequency direction must be increase or decrease" })
    }).optional().nullable()
  ),
  status: z.enum(GOAL_STATUSES, {
    errorMap: () => ({ message: "Status must be active, mastered, or discontinued" })
  }).default("active"),
});

export const insertObjectiveSchema = createInsertSchema(objectives).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  title: z.string().max(200, "Title must be 200 characters or less").optional().nullable(),
  description: z.string().min(1, "Objective description is required").max(2000, "Description must be 2000 characters or less"),
  targetCriteria: z.string().max(500, "Target criteria must be 500 characters or less").optional().nullable(),
  targetDate: z.union([z.string(), z.date(), z.undefined()]).optional().transform((val) => {
    if (!val || val === '') return undefined;
    if (typeof val === 'string') {
      const parsed = new Date(val);
      if (isNaN(parsed.getTime())) {
        throw new Error("Invalid date format for target date");
      }
      return parsed;
    }
    return val;
  }),
  status: z.enum(GOAL_STATUSES, {
    errorMap: () => ({ message: "Status must be active, mastered, or discontinued" })
  }).default("active"),
});

export const insertDataPointSchema = createInsertSchema(dataPoints).omit({
  id: true,
  createdAt: true,
}).extend({
  objectiveId: z.number().int().positive().optional().nullable(),
  progressValue: z.number()
    .min(-999, "Value must be greater than -999")
    .max(999, "Value must be less than 999")
    .transform((num) => num.toString()),
  progressFormat: z.enum(PROGRESS_FORMATS, {
    errorMap: () => ({ message: "Progress format must be percentage, fraction, frequency, or duration" })
  }).default("percentage"),
  numerator: z.number().int().min(0, "Numerator must be non-negative").max(9999, "Numerator must be less than 10000").optional().nullable(),
  denominator: z.number().int().min(1, "Denominator must be at least 1").max(9999, "Denominator must be less than 10000").optional().nullable(),
  durationUnit: z.enum(DURATION_UNITS, {
    errorMap: () => ({ message: "Duration unit must be seconds or minutes" })
  }).optional().nullable(),
  levelOfSupport: z.string().max(500, "Level of support must be 500 characters or less").optional().nullable(),
  setting: z.string().max(500, "Setting must be 500 characters or less").optional().nullable(),
  anecdotalInfo: z.string().max(2000, "Anecdotal info must be 2000 characters or less").optional().nullable(),
  date: z.union([
    z.date(),
    z.string().transform((str) => {
      if (str.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const parsed = new Date(str + 'T12:00:00.000Z');
        if (isNaN(parsed.getTime())) {
          throw new Error("Invalid date format");
        }
        return parsed;
      }
      const parsed = new Date(str);
      if (isNaN(parsed.getTime())) {
        throw new Error("Invalid date format");
      }
      return parsed;
    })
  ]),
});

// Reporting period validation schema
export const insertReportingPeriodSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  periodLength: z.enum(["4.5-weeks", "3-weeks"], {
    errorMap: () => ({ message: "Period length must be '4.5-weeks' or '3-weeks'" })
  }),
  periodNumber: z.number().int().min(1, "Period number must be at least 1").max(20, "Period number must be 20 or less"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format"),
}).refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return end >= start;
}, {
  message: "End date must be on or after start date",
  path: ["endDate"],
});

// Schema for bulk reporting periods submission
export const reportingPeriodsSubmitSchema = z.object({
  periods: z.array(z.object({
    periodNumber: z.number().int().min(1).max(20),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  })).min(1, "At least one period is required").max(20, "Maximum 20 periods allowed"),
  periodLength: z.enum(["4.5-weeks", "3-weeks"], {
    errorMap: () => ({ message: "Period length must be '4.5-weeks' or '3-weeks'" })
  }),
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Reporting periods table for persistent storage
export const reportingPeriods = pgTable("reporting_periods", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  periodLength: varchar("period_length").notNull(), // "4.5weeks" or "3weeks"
  periodNumber: integer("period_number").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type ReportingPeriod = typeof reportingPeriods.$inferSelect;
export type InsertReportingPeriod = typeof reportingPeriods.$inferInsert;
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof students.$inferSelect;
export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Goal = typeof goals.$inferSelect;
export type InsertObjective = z.infer<typeof insertObjectiveSchema>;
export type Objective = typeof objectives.$inferSelect;
export type InsertDataPoint = z.infer<typeof insertDataPointSchema>;
export type DataPoint = typeof dataPoints.$inferSelect;

// API Response Types
export interface GoalProgressResponse {
  goal: Goal;
  dataPoints: DataPoint[];
  currentProgress: number;
  averageScore: number;
  trend: number;
  lastScore: number;
}

export interface ObjectiveProgressResponse {
  objective: Objective;
  dataPoints: DataPoint[];
  currentProgress: number;
  averageScore: number;
  trend: number;
  lastScore: number;
  dataPointsCount: number;
}

export interface GoalWithProgress extends Goal {
  currentProgress: number;
  averageScore: number;
  trend: number;
  lastScore: number;
  dataPointsCount: number;
}
