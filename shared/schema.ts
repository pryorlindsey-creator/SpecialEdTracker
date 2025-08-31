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

// Insert schemas
export const insertStudentSchema = createInsertSchema(students).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  iepDueDate: z.union([z.string(), z.date(), z.undefined()]).optional().transform((val) => {
    if (!val || val === '') return undefined;
    return typeof val === 'string' ? new Date(val) : val;
  }),
});

export const insertGoalSchema = createInsertSchema(goals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertObjectiveSchema = createInsertSchema(objectives).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  targetDate: z.union([z.string(), z.date(), z.undefined()]).optional().transform((val) => {
    if (!val || val === '') return undefined;
    return typeof val === 'string' ? new Date(val) : val;
  }),
});

export const insertDataPointSchema = createInsertSchema(dataPoints).omit({
  id: true,
  createdAt: true,
}).extend({
  objectiveId: z.number().optional().nullable(), // Make objectiveId explicitly optional and nullable
  progressValue: z.number().transform((num) => num.toString()), // Convert number to string for decimal field
  date: z.union([
    z.date(),
    z.string().transform((str) => {
      // Handle YYYY-MM-DD string format
      if (str.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return new Date(str + 'T12:00:00.000Z'); // Use noon UTC to avoid timezone shift
      }
      // Handle ISO date strings
      return new Date(str);
    })
  ]), // Handle both Date and string inputs
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
