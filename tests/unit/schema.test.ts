import { describe, it, expect } from 'vitest';
import {
  insertStudentSchema,
  insertGoalSchema,
  insertObjectiveSchema,
  insertDataPointSchema,
  DATA_COLLECTION_TYPES,
  GOAL_STATUSES,
  FREQUENCY_DIRECTIONS,
  PROGRESS_FORMATS,
  DURATION_UNITS,
} from '../../shared/schema';
import { createBoundaryValues } from '../factories';

describe('Schema Validation', () => {
  const boundaries = createBoundaryValues();

  describe('insertStudentSchema', () => {
    it('should validate a valid student', () => {
      const validStudent = {
        userId: '4201332',
        name: 'Test Student',
        grade: '3rd',
        iepDueDate: '2025-12-01',
        relatedServices: 'Speech Therapy',
      };

      const result = insertStudentSchema.safeParse(validStudent);
      expect(result.success).toBe(true);
    });

    it('should reject empty student name', () => {
      const invalidStudent = {
        userId: '4201332',
        name: '',
        grade: '3rd',
      };

      const result = insertStudentSchema.safeParse(invalidStudent);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('Student name is required');
      }
    });

    it('should reject name exceeding 100 characters', () => {
      const invalidStudent = {
        userId: '4201332',
        name: 'A'.repeat(101),
        grade: '3rd',
      };

      const result = insertStudentSchema.safeParse(invalidStudent);
      expect(result.success).toBe(false);
    });

    it('should accept student with minimum required fields', () => {
      const minStudent = {
        userId: '4201332',
        name: 'A',
      };

      const result = insertStudentSchema.safeParse(minStudent);
      expect(result.success).toBe(true);
    });

    it('should handle empty IEP due date', () => {
      const student = {
        userId: '4201332',
        name: 'Test Student',
        iepDueDate: '',
      };

      const result = insertStudentSchema.safeParse(student);
      expect(result.success).toBe(true);
    });

    it('should transform valid date string to Date object', () => {
      const student = {
        userId: '4201332',
        name: 'Test Student',
        iepDueDate: '2025-12-01',
      };

      const result = insertStudentSchema.safeParse(student);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.iepDueDate instanceof Date).toBe(true);
      }
    });

    it('should reject or throw for invalid date format', () => {
      const student = {
        userId: '4201332',
        name: 'Test Student',
        iepDueDate: 'not-a-date',
      };

      try {
        const result = insertStudentSchema.safeParse(student);
        expect(result.success).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should throw error for malformed date in transform', () => {
      const student = {
        userId: '4201332',
        name: 'Test Student',
        iepDueDate: 'invalid',
      };

      expect(() => insertStudentSchema.parse(student)).toThrow('Invalid date format');
    });
  });

  describe('insertGoalSchema', () => {
    it('should validate a valid goal', () => {
      const validGoal = {
        studentId: 1,
        title: 'Test Goal',
        description: 'Test description',
        targetCriteria: '80% accuracy',
        dataCollectionType: 'percentage',
        status: 'active',
      };

      const result = insertGoalSchema.safeParse(validGoal);
      expect(result.success).toBe(true);
    });

    it('should reject empty goal title', () => {
      const invalidGoal = {
        studentId: 1,
        title: '',
        description: 'Test description',
      };

      const result = insertGoalSchema.safeParse(invalidGoal);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('Goal title is required');
      }
    });

    it('should reject empty goal description', () => {
      const invalidGoal = {
        studentId: 1,
        title: 'Test Goal',
        description: '',
      };

      const result = insertGoalSchema.safeParse(invalidGoal);
      expect(result.success).toBe(false);
    });

    it('should accept maximum length title (200 chars)', () => {
      const goal = {
        studentId: 1,
        title: boundaries.maxLengthTitle,
        description: 'Test description',
      };

      const result = insertGoalSchema.safeParse(goal);
      expect(result.success).toBe(true);
    });

    it('should reject title exceeding 200 characters', () => {
      const goal = {
        studentId: 1,
        title: 'A'.repeat(201),
        description: 'Test description',
      };

      const result = insertGoalSchema.safeParse(goal);
      expect(result.success).toBe(false);
    });

    it('should accept maximum length description (2000 chars)', () => {
      const goal = {
        studentId: 1,
        title: 'Test Goal',
        description: boundaries.maxLengthDescription,
      };

      const result = insertGoalSchema.safeParse(goal);
      expect(result.success).toBe(true);
    });

    it('should validate all data collection types', () => {
      DATA_COLLECTION_TYPES.forEach((type) => {
        const goal = {
          studentId: 1,
          title: 'Test Goal',
          description: 'Test description',
          dataCollectionType: type,
        };

        const result = insertGoalSchema.safeParse(goal);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid data collection type', () => {
      const goal = {
        studentId: 1,
        title: 'Test Goal',
        description: 'Test description',
        dataCollectionType: 'invalid',
      };

      const result = insertGoalSchema.safeParse(goal);
      expect(result.success).toBe(false);
    });

    it('should validate all goal statuses', () => {
      GOAL_STATUSES.forEach((status) => {
        const goal = {
          studentId: 1,
          title: 'Test Goal',
          description: 'Test description',
          status,
        };

        const result = insertGoalSchema.safeParse(goal);
        expect(result.success).toBe(true);
      });
    });

    it('should handle empty frequencyDirection by converting to null', () => {
      const goal = {
        studentId: 1,
        title: 'Test Goal',
        description: 'Test description',
        frequencyDirection: '',
      };

      const result = insertGoalSchema.safeParse(goal);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.frequencyDirection).toBeNull();
      }
    });

    it('should accept valid frequency directions', () => {
      FREQUENCY_DIRECTIONS.forEach((direction) => {
        const goal = {
          studentId: 1,
          title: 'Test Goal',
          description: 'Test description',
          frequencyDirection: direction,
        };

        const result = insertGoalSchema.safeParse(goal);
        expect(result.success).toBe(true);
      });
    });

    it('should default dataCollectionType to percentage', () => {
      const goal = {
        studentId: 1,
        title: 'Test Goal',
        description: 'Test description',
      };

      const result = insertGoalSchema.safeParse(goal);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.dataCollectionType).toBe('percentage');
      }
    });

    it('should default status to active', () => {
      const goal = {
        studentId: 1,
        title: 'Test Goal',
        description: 'Test description',
      };

      const result = insertGoalSchema.safeParse(goal);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('active');
      }
    });
  });

  describe('insertObjectiveSchema', () => {
    it('should validate a valid objective', () => {
      const validObjective = {
        goalId: 1,
        studentId: 1,
        description: 'Test objective description',
        targetCriteria: '80% accuracy',
        status: 'active',
      };

      const result = insertObjectiveSchema.safeParse(validObjective);
      expect(result.success).toBe(true);
    });

    it('should reject empty objective description', () => {
      const invalidObjective = {
        goalId: 1,
        studentId: 1,
        description: '',
      };

      const result = insertObjectiveSchema.safeParse(invalidObjective);
      expect(result.success).toBe(false);
    });

    it('should allow optional title', () => {
      const objective = {
        goalId: 1,
        studentId: 1,
        description: 'Test description',
        title: null,
      };

      const result = insertObjectiveSchema.safeParse(objective);
      expect(result.success).toBe(true);
    });

    it('should handle empty target date', () => {
      const objective = {
        goalId: 1,
        studentId: 1,
        description: 'Test description',
        targetDate: '',
      };

      const result = insertObjectiveSchema.safeParse(objective);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.targetDate).toBeUndefined();
      }
    });

    it('should transform valid target date string to Date', () => {
      const objective = {
        goalId: 1,
        studentId: 1,
        description: 'Test description',
        targetDate: '2025-12-01',
      };

      const result = insertObjectiveSchema.safeParse(objective);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.targetDate instanceof Date).toBe(true);
      }
    });
  });

  describe('insertDataPointSchema', () => {
    it('should validate a valid data point', () => {
      const validDataPoint = {
        goalId: 1,
        studentId: 1,
        date: new Date(),
        progressValue: 75,
        progressFormat: 'percentage',
        numerator: 3,
        denominator: 4,
      };

      const result = insertDataPointSchema.safeParse(validDataPoint);
      expect(result.success).toBe(true);
    });

    it('should transform progressValue number to string', () => {
      const dataPoint = {
        goalId: 1,
        studentId: 1,
        date: new Date(),
        progressValue: 75.5,
        progressFormat: 'percentage',
      };

      const result = insertDataPointSchema.safeParse(dataPoint);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.progressValue).toBe('string');
      }
    });

    it('should accept minimum progress value (-999)', () => {
      const dataPoint = {
        goalId: 1,
        studentId: 1,
        date: new Date(),
        progressValue: boundaries.minProgressValue,
        progressFormat: 'percentage',
      };

      const result = insertDataPointSchema.safeParse(dataPoint);
      expect(result.success).toBe(true);
    });

    it('should accept maximum progress value (999)', () => {
      const dataPoint = {
        goalId: 1,
        studentId: 1,
        date: new Date(),
        progressValue: boundaries.maxProgressValue,
        progressFormat: 'percentage',
      };

      const result = insertDataPointSchema.safeParse(dataPoint);
      expect(result.success).toBe(true);
    });

    it('should reject progress value below -999', () => {
      const dataPoint = {
        goalId: 1,
        studentId: 1,
        date: new Date(),
        progressValue: -1000,
        progressFormat: 'percentage',
      };

      const result = insertDataPointSchema.safeParse(dataPoint);
      expect(result.success).toBe(false);
    });

    it('should reject progress value above 999', () => {
      const dataPoint = {
        goalId: 1,
        studentId: 1,
        date: new Date(),
        progressValue: 1000,
        progressFormat: 'percentage',
      };

      const result = insertDataPointSchema.safeParse(dataPoint);
      expect(result.success).toBe(false);
    });

    it('should validate all progress formats', () => {
      PROGRESS_FORMATS.forEach((format) => {
        const dataPoint = {
          goalId: 1,
          studentId: 1,
          date: new Date(),
          progressValue: 50,
          progressFormat: format,
        };

        const result = insertDataPointSchema.safeParse(dataPoint);
        expect(result.success).toBe(true);
      });
    });

    it('should accept maximum numerator (9999)', () => {
      const dataPoint = {
        goalId: 1,
        studentId: 1,
        date: new Date(),
        progressValue: 100,
        progressFormat: 'percentage',
        numerator: boundaries.maxNumerator,
        denominator: 10,
      };

      const result = insertDataPointSchema.safeParse(dataPoint);
      expect(result.success).toBe(true);
    });

    it('should reject numerator above 9999', () => {
      const dataPoint = {
        goalId: 1,
        studentId: 1,
        date: new Date(),
        progressValue: 100,
        progressFormat: 'percentage',
        numerator: 10000,
        denominator: 10,
      };

      const result = insertDataPointSchema.safeParse(dataPoint);
      expect(result.success).toBe(false);
    });

    it('should reject negative numerator', () => {
      const dataPoint = {
        goalId: 1,
        studentId: 1,
        date: new Date(),
        progressValue: 100,
        progressFormat: 'percentage',
        numerator: -1,
        denominator: 10,
      };

      const result = insertDataPointSchema.safeParse(dataPoint);
      expect(result.success).toBe(false);
    });

    it('should reject denominator of 0', () => {
      const dataPoint = {
        goalId: 1,
        studentId: 1,
        date: new Date(),
        progressValue: 100,
        progressFormat: 'percentage',
        numerator: 5,
        denominator: 0,
      };

      const result = insertDataPointSchema.safeParse(dataPoint);
      expect(result.success).toBe(false);
    });

    it('should validate duration units', () => {
      DURATION_UNITS.forEach((unit) => {
        const dataPoint = {
          goalId: 1,
          studentId: 1,
          date: new Date(),
          progressValue: 5,
          progressFormat: 'duration',
          durationUnit: unit,
        };

        const result = insertDataPointSchema.safeParse(dataPoint);
        expect(result.success).toBe(true);
      });
    });

    it('should allow optional objectiveId', () => {
      const dataPoint = {
        goalId: 1,
        studentId: 1,
        date: new Date(),
        progressValue: 75,
        progressFormat: 'percentage',
        objectiveId: null,
      };

      const result = insertDataPointSchema.safeParse(dataPoint);
      expect(result.success).toBe(true);
    });

    it('should accept valid objectiveId', () => {
      const dataPoint = {
        goalId: 1,
        studentId: 1,
        date: new Date(),
        progressValue: 75,
        progressFormat: 'percentage',
        objectiveId: 5,
      };

      const result = insertDataPointSchema.safeParse(dataPoint);
      expect(result.success).toBe(true);
    });

    it('should enforce anecdotal info max length (2000)', () => {
      const dataPoint = {
        goalId: 1,
        studentId: 1,
        date: new Date(),
        progressValue: 75,
        progressFormat: 'percentage',
        anecdotalInfo: 'A'.repeat(2001),
      };

      const result = insertDataPointSchema.safeParse(dataPoint);
      expect(result.success).toBe(false);
    });

    it('should accept maximum anecdotal info length (2000)', () => {
      const dataPoint = {
        goalId: 1,
        studentId: 1,
        date: new Date(),
        progressValue: 75,
        progressFormat: 'percentage',
        anecdotalInfo: 'A'.repeat(2000),
      };

      const result = insertDataPointSchema.safeParse(dataPoint);
      expect(result.success).toBe(true);
    });
  });

  describe('Enum Constants', () => {
    it('should have correct data collection types', () => {
      expect(DATA_COLLECTION_TYPES).toEqual(['percentage', 'frequency', 'duration']);
    });

    it('should have correct goal statuses', () => {
      expect(GOAL_STATUSES).toEqual(['active', 'mastered', 'discontinued']);
    });

    it('should have correct frequency directions', () => {
      expect(FREQUENCY_DIRECTIONS).toEqual(['increase', 'decrease']);
    });

    it('should have correct progress formats', () => {
      expect(PROGRESS_FORMATS).toEqual(['percentage', 'fraction', 'frequency', 'duration']);
    });

    it('should have correct duration units', () => {
      expect(DURATION_UNITS).toEqual(['seconds', 'minutes']);
    });
  });
});
