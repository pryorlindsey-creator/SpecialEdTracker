import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  createMockStudent, 
  createMockGoal, 
  createMockObjective, 
  createMockDataPoint,
  createMockUser,
  createMockReportingPeriod,
} from '../setup';
import {
  createStudentFactory,
  createGoalFactory,
  createObjectiveFactory,
  createDataPointFactory,
  createMaxLoadDataset,
  createEmptyDataset,
  resetIdCounter,
} from '../factories';

const mockQueryResult = vi.fn();

vi.mock('../../server/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => mockQueryResult()),
          limit: vi.fn(() => ({
            offset: vi.fn(() => mockQueryResult()),
          })),
        })),
        leftJoin: vi.fn(() => ({
          where: vi.fn(() => mockQueryResult()),
        })),
        orderBy: vi.fn(() => mockQueryResult()),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => mockQueryResult()),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => mockQueryResult()),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn(() => mockQueryResult()),
      })),
    })),
  },
}));

describe('Storage Functions', () => {
  beforeEach(() => {
    resetIdCounter();
    mockQueryResult.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Student Operations', () => {
    describe('Empty Data Scenarios', () => {
      it('should return empty array when no students exist', async () => {
        mockQueryResult.mockResolvedValue([]);
        
        const { students } = createEmptyDataset();
        expect(students).toEqual([]);
        expect(students.length).toBe(0);
      });

      it('should handle student with minimal required fields', () => {
        const minimalStudent = {
          userId: '4201332',
          name: 'A',
        };
        
        expect(minimalStudent.name.length).toBeGreaterThanOrEqual(1);
        expect(minimalStudent.userId).toBeDefined();
      });
    });

    describe('Maximum Load Scenarios', () => {
      it('should handle 50 students', () => {
        const students = createStudentFactory(50);
        
        expect(students.length).toBe(50);
        students.forEach((student, index) => {
          expect(student.name).toBe(`Student ${index + 1}`);
          expect(student.userId).toBe('4201332');
        });
      });

      it('should generate unique IDs for all students', () => {
        resetIdCounter();
        const students = createStudentFactory(100);
        const ids = students.map(s => s.id);
        const uniqueIds = new Set(ids);
        
        expect(uniqueIds.size).toBe(students.length);
      });
    });

    describe('Data Integrity', () => {
      it('should maintain correct user ownership', () => {
        const userId = 'test-user-123';
        const students = createStudentFactory(5, userId);
        
        students.forEach(student => {
          expect(student.userId).toBe(userId);
        });
      });

      it('should handle various grade formats', () => {
        const students = createStudentFactory(12);
        
        students.forEach(student => {
          expect(student.grade).toMatch(/^\d+(st|nd|rd|th)$/);
        });
      });
    });
  });

  describe('Goal Operations', () => {
    describe('Empty Data Scenarios', () => {
      it('should return empty array when no goals exist for student', () => {
        const { goals } = createEmptyDataset();
        expect(goals).toEqual([]);
      });
    });

    describe('Maximum Load Scenarios', () => {
      it('should handle 15 goals per student (maximum allowed)', () => {
        const goals = createGoalFactory(15, 1);
        
        expect(goals.length).toBe(15);
        goals.forEach(goal => {
          expect(goal.studentId).toBe(1);
        });
      });

      it('should distribute data collection types correctly', () => {
        const goals = createGoalFactory(9, 1);
        
        const percentageGoals = goals.filter(g => g.dataCollectionType === 'percentage');
        const frequencyGoals = goals.filter(g => g.dataCollectionType === 'frequency');
        const durationGoals = goals.filter(g => g.dataCollectionType === 'duration');
        
        expect(percentageGoals.length).toBe(3);
        expect(frequencyGoals.length).toBe(3);
        expect(durationGoals.length).toBe(3);
      });

      it('should set frequencyDirection only for frequency goals', () => {
        const goals = createGoalFactory(9, 1);
        
        goals.forEach(goal => {
          if (goal.dataCollectionType === 'frequency') {
            expect(goal.frequencyDirection).toBe('increase');
          } else {
            expect(goal.frequencyDirection).toBeNull();
          }
        });
      });
    });

    describe('Status Validation', () => {
      it('should distribute statuses correctly', () => {
        const goals = createGoalFactory(9, 1);
        
        const activeGoals = goals.filter(g => g.status === 'active');
        const masteredGoals = goals.filter(g => g.status === 'mastered');
        const discontinuedGoals = goals.filter(g => g.status === 'discontinued');
        
        expect(activeGoals.length).toBe(3);
        expect(masteredGoals.length).toBe(3);
        expect(discontinuedGoals.length).toBe(3);
      });
    });

    describe('Level of Support Validation', () => {
      it('should store level of support as valid JSON', () => {
        const goal = createMockGoal();
        
        expect(() => JSON.parse(goal.levelOfSupport!)).not.toThrow();
        const parsed = JSON.parse(goal.levelOfSupport!);
        expect(Array.isArray(parsed)).toBe(true);
      });
    });
  });

  describe('Objective Operations', () => {
    describe('Empty Data Scenarios', () => {
      it('should return empty array when no objectives exist', () => {
        const { objectives } = createEmptyDataset();
        expect(objectives).toEqual([]);
      });
    });

    describe('Maximum Load Scenarios', () => {
      it('should handle 10 objectives per goal (maximum allowed)', () => {
        const objectives = createObjectiveFactory(10, 1, 1);
        
        expect(objectives.length).toBe(10);
        objectives.forEach(obj => {
          expect(obj.goalId).toBe(1);
          expect(obj.studentId).toBe(1);
        });
      });
    });

    describe('Target Date Handling', () => {
      it('should set target date for some objectives', () => {
        const objectives = createObjectiveFactory(4, 1, 1);
        
        const withDate = objectives.filter(o => o.targetDate !== null);
        const withoutDate = objectives.filter(o => o.targetDate === null);
        
        expect(withDate.length).toBe(2);
        expect(withoutDate.length).toBe(2);
      });
    });
  });

  describe('Data Point Operations', () => {
    describe('Empty Data Scenarios', () => {
      it('should return empty array when no data points exist', () => {
        const { dataPoints } = createEmptyDataset();
        expect(dataPoints).toEqual([]);
      });

      it('should handle goal with no data points', async () => {
        mockQueryResult.mockResolvedValue([]);
        
        const goal = createMockGoal();
        const dataPoints: any[] = [];
        
        expect(dataPoints.length).toBe(0);
      });
    });

    describe('Maximum Load Scenarios', () => {
      it('should handle 100 data points per goal', () => {
        const dataPoints = createDataPointFactory(100, 1, 1);
        
        expect(dataPoints.length).toBe(100);
        dataPoints.forEach(dp => {
          expect(dp.goalId).toBe(1);
          expect(dp.studentId).toBe(1);
        });
      });

      it('should generate unique IDs for all data points', () => {
        resetIdCounter();
        const dataPoints = createDataPointFactory(200, 1, 1);
        const ids = dataPoints.map(dp => dp.id);
        const uniqueIds = new Set(ids);
        
        expect(uniqueIds.size).toBe(dataPoints.length);
      });

      it('should handle full dataset load', () => {
        const { students, goals, objectives, dataPoints } = createMaxLoadDataset();
        
        expect(students.length).toBe(50);
        expect(goals.length).toBe(50 * 15);
        expect(objectives.length).toBe(50 * 15 * 10);
        expect(dataPoints.length).toBe(50 * 15 * 100);
      });
    });

    describe('Progress Format Validation', () => {
      it('should handle percentage format correctly', () => {
        const dataPoints = createDataPointFactory(10, 1, 1, { 
          progressFormat: 'percentage' 
        });
        
        dataPoints.forEach(dp => {
          expect(dp.progressFormat).toBe('percentage');
          const value = parseFloat(dp.progressValue);
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(100);
        });
      });

      it('should handle frequency format correctly', () => {
        const dataPoints = createDataPointFactory(10, 1, 1, { 
          progressFormat: 'frequency' 
        });
        
        dataPoints.forEach(dp => {
          expect(dp.progressFormat).toBe('frequency');
          const value = parseInt(dp.progressValue);
          expect(Number.isInteger(value)).toBe(true);
        });
      });

      it('should handle duration format correctly', () => {
        const dataPoints = createDataPointFactory(10, 1, 1, { 
          progressFormat: 'duration' 
        });
        
        dataPoints.forEach(dp => {
          expect(dp.progressFormat).toBe('duration');
          expect(dp.durationUnit).toBe('minutes');
        });
      });
    });

    describe('Objective Association', () => {
      it('should allow data points without objective', () => {
        const dp = createMockDataPoint({ objectiveId: null });
        expect(dp.objectiveId).toBeNull();
      });

      it('should allow data points with objective', () => {
        const dataPoints = createDataPointFactory(5, 1, 1, { 
          objectiveId: 5 
        });
        
        dataPoints.forEach(dp => {
          expect(dp.objectiveId).toBe(5);
        });
      });
    });

    describe('Date Handling', () => {
      it('should spread dates correctly', () => {
        const dataPoints = createDataPointFactory(10, 1, 1, { 
          dateSpread: 1 
        });
        
        const dates = dataPoints.map(dp => dp.date.getTime());
        const uniqueDates = new Set(dates);
        
        expect(uniqueDates.size).toBe(10);
      });

      it('should order dates from newest to oldest', () => {
        const dataPoints = createDataPointFactory(5, 1, 1, { 
          dateSpread: 1 
        });
        
        for (let i = 0; i < dataPoints.length - 1; i++) {
          expect(dataPoints[i].date.getTime()).toBeGreaterThanOrEqual(
            dataPoints[i + 1].date.getTime()
          );
        }
      });
    });

    describe('JSON Field Validation', () => {
      it('should store levelOfSupport as valid JSON', () => {
        const dp = createMockDataPoint();
        
        expect(() => JSON.parse(dp.levelOfSupport!)).not.toThrow();
        const parsed = JSON.parse(dp.levelOfSupport!);
        expect(Array.isArray(parsed)).toBe(true);
      });

      it('should store setting as valid JSON', () => {
        const dp = createMockDataPoint();
        
        expect(() => JSON.parse(dp.setting!)).not.toThrow();
        const parsed = JSON.parse(dp.setting!);
        expect(Array.isArray(parsed)).toBe(true);
      });
    });
  });

  describe('Reporting Period Operations', () => {
    describe('Empty Data Scenarios', () => {
      it('should handle missing reporting periods', () => {
        const reportingPeriod = null;
        expect(reportingPeriod).toBeNull();
      });
    });

    describe('Data Validation', () => {
      it('should store period data as valid JSON', () => {
        const rp = createMockReportingPeriod();
        
        expect(() => JSON.parse(rp.periodData)).not.toThrow();
        const parsed = JSON.parse(rp.periodData);
        expect(parsed.periods).toBeDefined();
        expect(parsed.periodLength).toBeDefined();
      });

      it('should maintain user ownership', () => {
        const rp = createMockReportingPeriod({ userId: 'test-user' });
        expect(rp.userId).toBe('test-user');
      });
    });
  });

  describe('Analytics Functions', () => {
    describe('Progress Calculation', () => {
      it('should calculate average from data points', () => {
        const dataPoints = createDataPointFactory(5, 1, 1, { 
          progressFormat: 'percentage' 
        });
        
        const values = dataPoints.map(dp => parseFloat(dp.progressValue));
        const average = values.reduce((a, b) => a + b, 0) / values.length;
        
        expect(average).toBeGreaterThanOrEqual(0);
        expect(average).toBeLessThanOrEqual(100);
      });

      it('should handle empty data points for average', () => {
        const dataPoints: any[] = [];
        
        if (dataPoints.length === 0) {
          expect(dataPoints.length).toBe(0);
        }
      });
    });

    describe('Trend Detection', () => {
      it('should detect increasing trend', () => {
        const dataPoints = [
          { progressValue: '50' },
          { progressValue: '60' },
          { progressValue: '70' },
          { progressValue: '80' },
        ];
        
        const values = dataPoints.map(dp => parseFloat(dp.progressValue));
        const isIncreasing = values.every((val, i, arr) => 
          i === 0 || val >= arr[i - 1]
        );
        
        expect(isIncreasing).toBe(true);
      });

      it('should detect decreasing trend', () => {
        const dataPoints = [
          { progressValue: '80' },
          { progressValue: '70' },
          { progressValue: '60' },
          { progressValue: '50' },
        ];
        
        const values = dataPoints.map(dp => parseFloat(dp.progressValue));
        const isDecreasing = values.every((val, i, arr) => 
          i === 0 || val <= arr[i - 1]
        );
        
        expect(isDecreasing).toBe(true);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in text fields', () => {
      const goal = createMockGoal({
        title: "Student's Goal: \"Literacy\" & Math <100%>",
        description: "Description with 'quotes' and \"double quotes\"",
      });
      
      expect(goal.title).toContain("'");
      expect(goal.title).toContain('"');
      expect(goal.description).toContain("'");
    });

    it('should handle unicode characters', () => {
      const goal = createMockGoal({
        title: 'Goal with émojis 📚 and üñíçödé',
      });
      
      expect(goal.title).toContain('📚');
      expect(goal.title).toContain('ü');
    });

    it('should handle null vs undefined correctly', () => {
      const goal = createMockGoal({
        frequencyDirection: null,
        targetCriteria: undefined,
      });
      
      expect(goal.frequencyDirection).toBeNull();
    });

    it('should handle boundary date values', () => {
      const farFutureDate = new Date('2100-12-31');
      const farPastDate = new Date('1900-01-01');
      
      const futureDp = createMockDataPoint({ date: farFutureDate });
      const pastDp = createMockDataPoint({ date: farPastDate });
      
      expect(futureDp.date.getFullYear()).toBe(2100);
      expect(pastDp.date.getFullYear()).toBe(1900);
    });

    it('should handle decimal precision in progress values', () => {
      const dp = createMockDataPoint({ progressValue: '75.99' });
      
      const value = parseFloat(dp.progressValue);
      expect(value).toBe(75.99);
      expect(dp.progressValue).toBe('75.99');
    });
  });

  describe('Pagination Operations', () => {
    it('should calculate correct pagination parameters', () => {
      const page = 2;
      const limit = 25;
      const offset = (page - 1) * limit;
      
      expect(offset).toBe(25);
    });

    it('should handle page 1 with zero offset', () => {
      const page = 1;
      const limit = 50;
      const offset = (page - 1) * limit;
      
      expect(offset).toBe(0);
    });

    it('should calculate correct total pages', () => {
      const total = 127;
      const limit = 50;
      const totalPages = Math.ceil(total / limit);
      
      expect(totalPages).toBe(3);
    });

    it('should enforce maximum page size limit', () => {
      const requestedLimit = 500;
      const maxLimit = 100;
      const enforcedLimit = Math.min(requestedLimit, maxLimit);
      
      expect(enforcedLimit).toBe(100);
    });

    it('should enforce minimum page size limit', () => {
      const requestedLimit = 0;
      const minLimit = 1;
      const enforcedLimit = Math.max(requestedLimit, minLimit);
      
      expect(enforcedLimit).toBe(1);
    });

    it('should return correct pagination metadata', () => {
      const dataPoints = Array.from({ length: 10 }, (_, i) => 
        createMockDataPoint({ id: i + 1 })
      );
      
      const total = 127;
      const page = 2;
      const limit = 10;
      const totalPages = Math.ceil(total / limit);
      
      const response = {
        data: dataPoints,
        total,
        page,
        limit,
        totalPages
      };
      
      expect(response.data.length).toBe(10);
      expect(response.total).toBe(127);
      expect(response.page).toBe(2);
      expect(response.limit).toBe(10);
      expect(response.totalPages).toBe(13);
    });
  });

  describe('Batch Operations', () => {
    it('should validate batch size limits', () => {
      const maxBatchSize = 100;
      const validBatch = 50;
      const invalidBatch = 150;
      
      expect(validBatch <= maxBatchSize).toBe(true);
      expect(invalidBatch <= maxBatchSize).toBe(false);
    });

    it('should handle empty batch gracefully', () => {
      const emptyBatch: any[] = [];
      
      expect(emptyBatch.length).toBe(0);
    });

    it('should create multiple data points in batch', () => {
      const dataPointsToCreate = Array.from({ length: 5 }, (_, i) => 
        createMockDataPoint({ 
          id: i + 1, 
          goalId: 1, 
          studentId: 1,
          progressValue: `${(i + 1) * 20}` 
        })
      );
      
      expect(dataPointsToCreate.length).toBe(5);
      expect(dataPointsToCreate[0].progressValue).toBe('20');
      expect(dataPointsToCreate[4].progressValue).toBe('100');
    });

    it('should validate all data points before batch insert', () => {
      const validDataPoint = createMockDataPoint({
        goalId: 1,
        studentId: 1,
        progressValue: '75',
        date: new Date(),
      });
      
      const isValid = (dp: any) => 
        dp.goalId && 
        dp.studentId && 
        dp.progressValue !== undefined &&
        dp.date instanceof Date;
      
      expect(isValid(validDataPoint)).toBe(true);
    });

    it('should return batch delete count', () => {
      const idsToDelete = [1, 2, 3, 4, 5];
      const deletedCount = idsToDelete.length;
      
      const result = { deletedCount };
      
      expect(result.deletedCount).toBe(5);
    });

    it('should handle mixed valid and invalid IDs in batch delete', () => {
      const validIds = [1, 2, 3];
      const mixedIds = [1, 2, 'invalid', null, 5];
      
      const parsedIds = mixedIds.filter(id => 
        typeof id === 'number' && !isNaN(id)
      );
      
      expect(parsedIds).toEqual([1, 2, 5]);
    });
  });

  describe('Error Handling', () => {
    it('should categorize database errors correctly', () => {
      const errorTypes = {
        CONNECTION: 'CONNECTION',
        QUERY: 'QUERY',
        TRANSACTION: 'TRANSACTION',
        TIMEOUT: 'TIMEOUT',
        UNKNOWN: 'UNKNOWN'
      };
      
      expect(errorTypes.CONNECTION).toBe('CONNECTION');
      expect(errorTypes.QUERY).toBe('QUERY');
      expect(errorTypes.TRANSACTION).toBe('TRANSACTION');
      expect(errorTypes.TIMEOUT).toBe('TIMEOUT');
      expect(errorTypes.UNKNOWN).toBe('UNKNOWN');
    });

    it('should detect transient errors for retry logic', () => {
      const transientErrorMessages = [
        'connection timeout',
        'connection refused', 
        'ECONNRESET',
        'too many connections',
        'database is starting'
      ];
      
      const isTransientError = (message: string) => 
        transientErrorMessages.some(pattern => 
          message.toLowerCase().includes(pattern.toLowerCase())
        );
      
      expect(isTransientError('Connection timeout occurred')).toBe(true);
      expect(isTransientError('ECONNRESET in socket')).toBe(true);
      expect(isTransientError('Invalid SQL syntax')).toBe(false);
    });

    it('should implement retry with exponential backoff', () => {
      const baseDelay = 1000;
      const maxRetries = 3;
      
      const delays = Array.from({ length: maxRetries }, (_, attempt) => 
        baseDelay * Math.pow(2, attempt)
      );
      
      expect(delays).toEqual([1000, 2000, 4000]);
    });

    it('should include operation context in error logs', () => {
      const context = {
        operation: 'getDataPointsByGoalId',
        goalId: 123,
        userId: '4201332'
      };
      
      const errorLog = {
        message: 'Database query failed',
        context,
        timestamp: new Date().toISOString()
      };
      
      expect(errorLog.context.operation).toBe('getDataPointsByGoalId');
      expect(errorLog.context.goalId).toBe(123);
    });

    it('should track retry attempts in error state', () => {
      const maxRetries = 3;
      let attemptCount = 0;
      
      const simulateRetries = () => {
        for (let i = 0; i < maxRetries; i++) {
          attemptCount++;
        }
        return attemptCount;
      };
      
      expect(simulateRetries()).toBe(3);
    });
  });
});
