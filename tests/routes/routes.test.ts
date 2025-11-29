import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  createMockStudent, 
  createMockGoal, 
  createMockDataPoint,
} from '../setup';
import {
  createBoundaryValues,
  resetIdCounter,
  createStudentFactory,
  createGoalFactory,
  createDataPointFactory,
} from '../factories';
import {
  insertStudentSchema,
  insertGoalSchema,
  insertDataPointSchema,
} from '../../shared/schema';

describe('API Route Data Validation', () => {
  const boundaries = createBoundaryValues();

  beforeEach(() => {
    resetIdCounter();
  });

  describe('Student Creation Validation', () => {
    it('should validate student with all fields', () => {
      const studentData = {
        userId: '4201332',
        name: 'Test Student',
        grade: '3rd',
        iepDueDate: '2025-12-01',
        relatedServices: 'Speech Therapy',
      };

      const result = insertStudentSchema.safeParse(studentData);
      expect(result.success).toBe(true);
    });

    it('should validate student with minimum fields', () => {
      const studentData = {
        userId: '4201332',
        name: 'A',
      };

      const result = insertStudentSchema.safeParse(studentData);
      expect(result.success).toBe(true);
    });

    it('should reject empty request body', () => {
      const result = insertStudentSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject null name', () => {
      const result = insertStudentSchema.safeParse({
        userId: '4201332',
        name: null,
      });
      expect(result.success).toBe(false);
    });

    it('should handle maximum student load', () => {
      const students = createStudentFactory(100);
      
      students.forEach(student => {
        const result = insertStudentSchema.safeParse({
          userId: student.userId,
          name: student.name,
          grade: student.grade,
        });
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Goal Creation Validation', () => {
    it('should validate goal with all fields', () => {
      const goalData = {
        studentId: 1,
        title: 'Math Skills',
        description: 'Student will improve math problem-solving skills',
        targetCriteria: '80% accuracy over 4/5 trials',
        dataCollectionType: 'percentage',
        frequencyDirection: null,
        status: 'active',
      };

      const result = insertGoalSchema.safeParse(goalData);
      expect(result.success).toBe(true);
    });

    it('should validate goal with minimum fields', () => {
      const goalData = {
        studentId: 1,
        title: 'A',
        description: 'B',
      };

      const result = insertGoalSchema.safeParse(goalData);
      expect(result.success).toBe(true);
    });

    it('should reject goal without studentId', () => {
      const goalData = {
        title: 'Test Goal',
        description: 'Description',
      };

      const result = insertGoalSchema.safeParse(goalData);
      expect(result.success).toBe(false);
    });

    it('should validate all data collection types', () => {
      const types = ['percentage', 'frequency', 'duration'];
      
      types.forEach(type => {
        const goalData = {
          studentId: 1,
          title: `${type} Goal`,
          description: 'Description',
          dataCollectionType: type,
        };

        const result = insertGoalSchema.safeParse(goalData);
        expect(result.success).toBe(true);
      });
    });

    it('should handle frequency goals with direction', () => {
      const goalData = {
        studentId: 1,
        title: 'Frequency Goal',
        description: 'Description',
        dataCollectionType: 'frequency',
        frequencyDirection: 'increase',
      };

      const result = insertGoalSchema.safeParse(goalData);
      expect(result.success).toBe(true);
    });

    it('should convert empty frequencyDirection to null', () => {
      const goalData = {
        studentId: 1,
        title: 'Percentage Goal',
        description: 'Description',
        dataCollectionType: 'percentage',
        frequencyDirection: '',
      };

      const result = insertGoalSchema.safeParse(goalData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.frequencyDirection).toBeNull();
      }
    });

    it('should handle maximum goals per student', () => {
      const goals = createGoalFactory(15, 1);
      
      goals.forEach(goal => {
        const result = insertGoalSchema.safeParse({
          studentId: goal.studentId,
          title: goal.title,
          description: goal.description,
          dataCollectionType: goal.dataCollectionType,
        });
        expect(result.success).toBe(true);
      });
    });

    it('should validate boundary title length (200 chars)', () => {
      const goalData = {
        studentId: 1,
        title: boundaries.maxLengthTitle,
        description: 'Description',
      };

      const result = insertGoalSchema.safeParse(goalData);
      expect(result.success).toBe(true);
    });

    it('should reject title exceeding 200 chars', () => {
      const goalData = {
        studentId: 1,
        title: 'A'.repeat(201),
        description: 'Description',
      };

      const result = insertGoalSchema.safeParse(goalData);
      expect(result.success).toBe(false);
    });

    it('should validate boundary description length (2000 chars)', () => {
      const goalData = {
        studentId: 1,
        title: 'Goal',
        description: boundaries.maxLengthDescription,
      };

      const result = insertGoalSchema.safeParse(goalData);
      expect(result.success).toBe(true);
    });
  });

  describe('Data Point Creation Validation', () => {
    it('should validate data point with all fields', () => {
      const dataPointData = {
        goalId: 1,
        studentId: 1,
        date: new Date(),
        progressValue: 75,
        progressFormat: 'percentage',
        numerator: 3,
        denominator: 4,
        levelOfSupport: '["verbal"]',
        setting: '["general-education"]',
        anecdotalInfo: 'Test notes',
      };

      const result = insertDataPointSchema.safeParse(dataPointData);
      expect(result.success).toBe(true);
    });

    it('should validate data point with minimum fields', () => {
      const dataPointData = {
        goalId: 1,
        studentId: 1,
        date: new Date(),
        progressValue: 50,
        progressFormat: 'percentage',
      };

      const result = insertDataPointSchema.safeParse(dataPointData);
      expect(result.success).toBe(true);
    });

    it('should transform progressValue to string', () => {
      const dataPointData = {
        goalId: 1,
        studentId: 1,
        date: new Date(),
        progressValue: 75.5,
        progressFormat: 'percentage',
      };

      const result = insertDataPointSchema.safeParse(dataPointData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.progressValue).toBe('string');
        expect(result.data.progressValue).toBe('75.5');
      }
    });

    it('should reject progress value above maximum (999)', () => {
      const dataPointData = {
        goalId: 1,
        studentId: 1,
        date: new Date(),
        progressValue: 1000,
        progressFormat: 'percentage',
      };

      const result = insertDataPointSchema.safeParse(dataPointData);
      expect(result.success).toBe(false);
    });

    it('should reject progress value below minimum (-999)', () => {
      const dataPointData = {
        goalId: 1,
        studentId: 1,
        date: new Date(),
        progressValue: -1000,
        progressFormat: 'percentage',
      };

      const result = insertDataPointSchema.safeParse(dataPointData);
      expect(result.success).toBe(false);
    });

    it('should accept boundary progress values', () => {
      const minDataPoint = {
        goalId: 1,
        studentId: 1,
        date: new Date(),
        progressValue: -999,
        progressFormat: 'frequency',
      };

      const maxDataPoint = {
        goalId: 1,
        studentId: 1,
        date: new Date(),
        progressValue: 999,
        progressFormat: 'frequency',
      };

      expect(insertDataPointSchema.safeParse(minDataPoint).success).toBe(true);
      expect(insertDataPointSchema.safeParse(maxDataPoint).success).toBe(true);
    });

    it('should validate all progress formats', () => {
      const formats = ['percentage', 'fraction', 'frequency', 'duration'];
      
      formats.forEach(format => {
        const dataPointData = {
          goalId: 1,
          studentId: 1,
          date: new Date(),
          progressValue: 50,
          progressFormat: format,
        };

        const result = insertDataPointSchema.safeParse(dataPointData);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid progress format', () => {
      const dataPointData = {
        goalId: 1,
        studentId: 1,
        date: new Date(),
        progressValue: 50,
        progressFormat: 'invalid',
      };

      const result = insertDataPointSchema.safeParse(dataPointData);
      expect(result.success).toBe(false);
    });

    it('should reject negative numerator', () => {
      const dataPointData = {
        goalId: 1,
        studentId: 1,
        date: new Date(),
        progressValue: 50,
        progressFormat: 'percentage',
        numerator: -1,
        denominator: 10,
      };

      const result = insertDataPointSchema.safeParse(dataPointData);
      expect(result.success).toBe(false);
    });

    it('should reject zero denominator', () => {
      const dataPointData = {
        goalId: 1,
        studentId: 1,
        date: new Date(),
        progressValue: 50,
        progressFormat: 'percentage',
        numerator: 5,
        denominator: 0,
      };

      const result = insertDataPointSchema.safeParse(dataPointData);
      expect(result.success).toBe(false);
    });

    it('should accept maximum numerator (9999)', () => {
      const dataPointData = {
        goalId: 1,
        studentId: 1,
        date: new Date(),
        progressValue: 100,
        progressFormat: 'percentage',
        numerator: 9999,
        denominator: 9999,
      };

      const result = insertDataPointSchema.safeParse(dataPointData);
      expect(result.success).toBe(true);
    });

    it('should reject numerator above maximum', () => {
      const dataPointData = {
        goalId: 1,
        studentId: 1,
        date: new Date(),
        progressValue: 100,
        progressFormat: 'percentage',
        numerator: 10000,
        denominator: 10,
      };

      const result = insertDataPointSchema.safeParse(dataPointData);
      expect(result.success).toBe(false);
    });

    it('should validate duration units', () => {
      const units = ['seconds', 'minutes'];
      
      units.forEach(unit => {
        const dataPointData = {
          goalId: 1,
          studentId: 1,
          date: new Date(),
          progressValue: 5,
          progressFormat: 'duration',
          durationUnit: unit,
        };

        const result = insertDataPointSchema.safeParse(dataPointData);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid duration unit', () => {
      const dataPointData = {
        goalId: 1,
        studentId: 1,
        date: new Date(),
        progressValue: 5,
        progressFormat: 'duration',
        durationUnit: 'hours',
      };

      const result = insertDataPointSchema.safeParse(dataPointData);
      expect(result.success).toBe(false);
    });

    it('should handle optional objectiveId', () => {
      const withObjective = {
        goalId: 1,
        studentId: 1,
        date: new Date(),
        progressValue: 75,
        progressFormat: 'percentage',
        objectiveId: 5,
      };

      const withoutObjective = {
        goalId: 1,
        studentId: 1,
        date: new Date(),
        progressValue: 75,
        progressFormat: 'percentage',
        objectiveId: null,
      };

      expect(insertDataPointSchema.safeParse(withObjective).success).toBe(true);
      expect(insertDataPointSchema.safeParse(withoutObjective).success).toBe(true);
    });

    it('should enforce anecdotal info max length', () => {
      const dataPointData = {
        goalId: 1,
        studentId: 1,
        date: new Date(),
        progressValue: 75,
        progressFormat: 'percentage',
        anecdotalInfo: 'A'.repeat(2001),
      };

      const result = insertDataPointSchema.safeParse(dataPointData);
      expect(result.success).toBe(false);
    });

    it('should accept maximum anecdotal info length (2000)', () => {
      const dataPointData = {
        goalId: 1,
        studentId: 1,
        date: new Date(),
        progressValue: 75,
        progressFormat: 'percentage',
        anecdotalInfo: 'A'.repeat(2000),
      };

      const result = insertDataPointSchema.safeParse(dataPointData);
      expect(result.success).toBe(true);
    });

    it('should handle maximum data points load', () => {
      const dataPoints = createDataPointFactory(100, 1, 1);
      
      dataPoints.forEach(dp => {
        const result = insertDataPointSchema.safeParse({
          goalId: dp.goalId,
          studentId: dp.studentId,
          date: dp.date,
          progressValue: parseFloat(dp.progressValue),
          progressFormat: dp.progressFormat,
        });
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in text fields', () => {
      const goalData = {
        studentId: 1,
        title: "Student's Goal: \"Literacy\" & Math <100%>",
        description: "Description with 'quotes' and \"double quotes\" & symbols",
      };

      const result = insertGoalSchema.safeParse(goalData);
      expect(result.success).toBe(true);
    });

    it('should handle unicode characters', () => {
      const studentData = {
        userId: '4201332',
        name: 'José García-López',
      };

      const result = insertStudentSchema.safeParse(studentData);
      expect(result.success).toBe(true);
    });

    it('should handle emoji in text fields', () => {
      const goalData = {
        studentId: 1,
        title: 'Reading Goals 📚',
        description: 'Student will read books 📖',
      };

      const result = insertGoalSchema.safeParse(goalData);
      expect(result.success).toBe(true);
    });

    it('should handle whitespace-only strings', () => {
      const studentData = {
        userId: '4201332',
        name: '   ',
      };

      const result = insertStudentSchema.safeParse(studentData);
      expect(result.success).toBe(true);
    });

    it('should handle zero values correctly', () => {
      const dataPointData = {
        goalId: 1,
        studentId: 1,
        date: new Date(),
        progressValue: 0,
        progressFormat: 'percentage',
        numerator: 0,
        denominator: 10,
      };

      const result = insertDataPointSchema.safeParse(dataPointData);
      expect(result.success).toBe(true);
    });

    it('should handle decimal progress values', () => {
      const dataPointData = {
        goalId: 1,
        studentId: 1,
        date: new Date(),
        progressValue: 75.333333,
        progressFormat: 'percentage',
      };

      const result = insertDataPointSchema.safeParse(dataPointData);
      expect(result.success).toBe(true);
    });
  });

  describe('Empty Data Scenarios', () => {
    it('should reject completely empty objects', () => {
      expect(insertStudentSchema.safeParse({}).success).toBe(false);
      expect(insertGoalSchema.safeParse({}).success).toBe(false);
      expect(insertDataPointSchema.safeParse({}).success).toBe(false);
    });

    it('should handle null values appropriately', () => {
      const goalData = {
        studentId: 1,
        title: 'Goal',
        description: 'Description',
        targetCriteria: null,
        levelOfSupport: null,
        frequencyDirection: null,
      };

      const result = insertGoalSchema.safeParse(goalData);
      expect(result.success).toBe(true);
    });

    it('should handle undefined values appropriately', () => {
      const studentData = {
        userId: '4201332',
        name: 'Student',
        grade: undefined,
        iepDueDate: undefined,
        relatedServices: undefined,
      };

      const result = insertStudentSchema.safeParse(studentData);
      expect(result.success).toBe(true);
    });
  });
});
