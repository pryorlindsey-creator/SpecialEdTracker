// Debug script to test data point validation
const { z } = require('zod');

// Simulate the insertDataPointSchema from shared/schema.ts
const insertDataPointSchema = z.object({
  goalId: z.number(),
  objectiveId: z.number().optional(),
  date: z.date(),
  progressValue: z.number(),
  progressFormat: z.string().default("percentage"),
  numerator: z.number().optional(),
  denominator: z.number().optional(),
  levelOfSupport: z.string().optional(),
  anecdotalInfo: z.string().optional(),
});

// Test data point like what would come from the form
const testData = {
  goalId: 1,
  date: new Date("2024-12-30"),
  progressValue: 85.5,
  progressFormat: "percentage",
  levelOfSupport: "Independent",
  anecdotalInfo: "Student performed well"
};

console.log("Testing data point validation...");
console.log("Input data:", testData);

try {
  const result = insertDataPointSchema.parse(testData);
  console.log("✓ Validation successful:", result);
} catch (error) {
  console.log("✗ Validation failed:", error.errors);
}

// Test with string date (what comes from form)
const testDataWithStringDate = {
  ...testData,
  date: "2024-12-30"
};

console.log("\nTesting with string date...");
console.log("Input data:", testDataWithStringDate);

try {
  const result = insertDataPointSchema.parse(testDataWithStringDate);
  console.log("✓ Validation successful:", result);
} catch (error) {
  console.log("✗ Validation failed:", error.errors);
}