import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import { 
  createMockStudent, 
  createMockGoal, 
  createMockDataPoint,
  createMockUser,
} from '../setup';
import {
  createBoundaryValues,
  resetIdCounter,
} from '../factories';

const mockStorage = {
  getUser: vi.fn(),
  upsertUser: vi.fn(),
  getStudents: vi.fn(),
  getStudent: vi.fn(),
  createStudent: vi.fn(),
  updateStudent: vi.fn(),
  deleteStudent: vi.fn(),
  getGoals: vi.fn(),
  getGoal: vi.fn(),
  createGoal: vi.fn(),
  updateGoal: vi.fn(),
  deleteGoal: vi.fn(),
  getObjectives: vi.fn(),
  getObjective: vi.fn(),
  createObjective: vi.fn(),
  updateObjective: vi.fn(),
  deleteObjective: vi.fn(),
  getDataPoints: vi.fn(),
  getDataPoint: vi.fn(),
  createDataPoint: vi.fn(),
  updateDataPoint: vi.fn(),
  deleteDataPoint: vi.fn(),
  getGoalProgress: vi.fn(),
  getObjectiveProgress: vi.fn(),
  getStudentSummary: vi.fn(),
  getStudentAllDataPoints: vi.fn(),
  getReportingPeriods: vi.fn(),
  saveReportingPeriods: vi.fn(),
  deleteReportingPeriods: vi.fn(),
};

vi.mock('../../server/storage', () => ({
  storage: mockStorage,
}));

let mockUser: ReturnType<typeof createMockUser> | null = createMockUser();

vi.mock('../../server/replitAuth', () => ({
  isAuthenticated: () => (req: any, res: any, next: any) => {
    if (mockUser) {
      req.user = mockUser;
      next();
    } else {
      res.status(401).json({ message: 'Unauthorized' });
    }
  },
  setupAuth: vi.fn(),
}));

describe('API Routes', () => {
  let app: Express;
  const boundaries = createBoundaryValues();

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    
    const { registerRoutes } = await import('../../server/routes');
    await registerRoutes(app);
  });

  beforeEach(() => {
    resetIdCounter();
    mockUser = createMockUser();
    Object.values(mockStorage).forEach(mock => mock.mockReset());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 when not authenticated', async () => {
      mockUser = null;
      
      const response = await request(app).get('/api/students');
      
      expect(response.status).toBe(401);
    });

    it('should allow authenticated requests', async () => {
      mockStorage.getStudents.mockResolvedValue([]);
      
      const response = await request(app).get('/api/students');
      
      expect(response.status).toBe(200);
    });
  });

  describe('Student Routes', () => {
    describe('GET /api/students', () => {
      it('should return empty array when no students', async () => {
        mockStorage.getStudents.mockResolvedValue([]);
        
        const response = await request(app).get('/api/students');
        
        expect(response.status).toBe(200);
        expect(response.body).toEqual([]);
      });

      it('should return students for authenticated user', async () => {
        const students = [createMockStudent(), createMockStudent({ id: 2, name: 'Student 2' })];
        mockStorage.getStudents.mockResolvedValue(students);
        
        const response = await request(app).get('/api/students');
        
        expect(response.status).toBe(200);
        expect(response.body.length).toBe(2);
      });
    });

    describe('GET /api/students/:id', () => {
      it('should return 404 for non-existent student', async () => {
        mockStorage.getStudent.mockResolvedValue(undefined);
        
        const response = await request(app).get('/api/students/999');
        
        expect(response.status).toBe(404);
      });

      it('should return student by id', async () => {
        const student = createMockStudent();
        mockStorage.getStudent.mockResolvedValue(student);
        
        const response = await request(app).get('/api/students/1');
        
        expect(response.status).toBe(200);
        expect(response.body.id).toBe(1);
      });

      it('should handle invalid student id format', async () => {
        const response = await request(app).get('/api/students/invalid');
        
        expect(response.status).toBe(400);
      });
    });

    describe('POST /api/students', () => {
      it('should create a new student', async () => {
        const newStudent = { name: 'New Student', grade: '3rd' };
        const createdStudent = createMockStudent(newStudent);
        mockStorage.createStudent.mockResolvedValue(createdStudent);
        
        const response = await request(app)
          .post('/api/students')
          .send(newStudent);
        
        expect(response.status).toBe(201);
        expect(response.body.name).toBe('New Student');
      });

      it('should reject student without name', async () => {
        const response = await request(app)
          .post('/api/students')
          .send({ grade: '3rd' });
        
        expect(response.status).toBe(400);
      });

      it('should reject name exceeding max length', async () => {
        const response = await request(app)
          .post('/api/students')
          .send({ name: 'A'.repeat(101), grade: '3rd' });
        
        expect(response.status).toBe(400);
      });
    });
  });

  describe('Goal Routes', () => {
    describe('GET /api/students/:studentId/goals', () => {
      it('should return empty array when no goals', async () => {
        mockStorage.getStudent.mockResolvedValue(createMockStudent());
        mockStorage.getGoals.mockResolvedValue([]);
        
        const response = await request(app).get('/api/students/1/goals');
        
        expect(response.status).toBe(200);
        expect(response.body).toEqual([]);
      });

      it('should return goals for student', async () => {
        mockStorage.getStudent.mockResolvedValue(createMockStudent());
        const goals = [createMockGoal(), createMockGoal({ id: 2, title: 'Goal 2' })];
        mockStorage.getGoals.mockResolvedValue(goals);
        
        const response = await request(app).get('/api/students/1/goals');
        
        expect(response.status).toBe(200);
        expect(response.body.length).toBe(2);
      });
    });

    describe('POST /api/students/:studentId/goals', () => {
      beforeEach(() => {
        mockStorage.getStudent.mockResolvedValue(createMockStudent());
        mockStorage.getGoals.mockResolvedValue([]);
      });

      it('should create a goal with valid data', async () => {
        const newGoal = {
          title: 'New Goal',
          description: 'Goal description',
          dataCollectionType: 'percentage',
          status: 'active',
        };
        const createdGoal = createMockGoal(newGoal);
        mockStorage.createGoal.mockResolvedValue(createdGoal);
        
        const response = await request(app)
          .post('/api/students/1/goals')
          .send(newGoal);
        
        expect(response.status).toBe(201);
        expect(response.body.title).toBe('New Goal');
      });

      it('should reject goal without title', async () => {
        const response = await request(app)
          .post('/api/students/1/goals')
          .send({ description: 'Description only' });
        
        expect(response.status).toBe(400);
      });

      it('should reject goal without description', async () => {
        const response = await request(app)
          .post('/api/students/1/goals')
          .send({ title: 'Title only' });
        
        expect(response.status).toBe(400);
      });

      it('should reject invalid data collection type', async () => {
        const response = await request(app)
          .post('/api/students/1/goals')
          .send({
            title: 'Test Goal',
            description: 'Description',
            dataCollectionType: 'invalid',
          });
        
        expect(response.status).toBe(400);
      });

      it('should accept empty frequencyDirection for non-frequency goals', async () => {
        const newGoal = {
          title: 'Percentage Goal',
          description: 'Goal description',
          dataCollectionType: 'percentage',
          frequencyDirection: '',
        };
        const createdGoal = createMockGoal({ ...newGoal, frequencyDirection: null });
        mockStorage.createGoal.mockResolvedValue(createdGoal);
        
        const response = await request(app)
          .post('/api/students/1/goals')
          .send(newGoal);
        
        expect(response.status).toBe(201);
      });

      it('should enforce goal limit per student', async () => {
        const existingGoals = Array.from({ length: 15 }, (_, i) => 
          createMockGoal({ id: i + 1 })
        );
        mockStorage.getGoals.mockResolvedValue(existingGoals);
        
        const response = await request(app)
          .post('/api/students/1/goals')
          .send({
            title: 'New Goal',
            description: 'Description',
          });
        
        expect(response.status).toBe(400);
        expect(response.body.message).toContain('maximum');
      });

      it('should accept maximum length title (200 chars)', async () => {
        const newGoal = {
          title: boundaries.maxLengthTitle,
          description: 'Description',
        };
        const createdGoal = createMockGoal(newGoal);
        mockStorage.createGoal.mockResolvedValue(createdGoal);
        
        const response = await request(app)
          .post('/api/students/1/goals')
          .send(newGoal);
        
        expect(response.status).toBe(201);
      });

      it('should reject title exceeding 200 chars', async () => {
        const response = await request(app)
          .post('/api/students/1/goals')
          .send({
            title: 'A'.repeat(201),
            description: 'Description',
          });
        
        expect(response.status).toBe(400);
      });
    });
  });

  describe('Data Point Routes', () => {
    describe('POST /api/goals/:goalId/data-points', () => {
      beforeEach(() => {
        mockStorage.getGoal.mockResolvedValue(createMockGoal());
      });

      it('should create a data point with valid data', async () => {
        const newDataPoint = {
          date: '2025-11-29',
          progressValue: 75,
          progressFormat: 'percentage',
          numerator: 3,
          denominator: 4,
        };
        const createdDataPoint = createMockDataPoint({
          ...newDataPoint,
          progressValue: '75.00',
        });
        mockStorage.createDataPoint.mockResolvedValue(createdDataPoint);
        
        const response = await request(app)
          .post('/api/goals/1/data-points')
          .send(newDataPoint);
        
        expect(response.status).toBe(201);
      });

      it('should reject data point with invalid progress value', async () => {
        const response = await request(app)
          .post('/api/goals/1/data-points')
          .send({
            date: '2025-11-29',
            progressValue: 1000,
            progressFormat: 'percentage',
          });
        
        expect(response.status).toBe(400);
      });

      it('should reject data point with progress value below minimum', async () => {
        const response = await request(app)
          .post('/api/goals/1/data-points')
          .send({
            date: '2025-11-29',
            progressValue: -1000,
            progressFormat: 'percentage',
          });
        
        expect(response.status).toBe(400);
      });

      it('should accept minimum progress value (-999)', async () => {
        const createdDataPoint = createMockDataPoint({ progressValue: '-999' });
        mockStorage.createDataPoint.mockResolvedValue(createdDataPoint);
        
        const response = await request(app)
          .post('/api/goals/1/data-points')
          .send({
            date: '2025-11-29',
            progressValue: -999,
            progressFormat: 'frequency',
          });
        
        expect(response.status).toBe(201);
      });

      it('should accept maximum progress value (999)', async () => {
        const createdDataPoint = createMockDataPoint({ progressValue: '999' });
        mockStorage.createDataPoint.mockResolvedValue(createdDataPoint);
        
        const response = await request(app)
          .post('/api/goals/1/data-points')
          .send({
            date: '2025-11-29',
            progressValue: 999,
            progressFormat: 'frequency',
          });
        
        expect(response.status).toBe(201);
      });

      it('should reject invalid progress format', async () => {
        const response = await request(app)
          .post('/api/goals/1/data-points')
          .send({
            date: '2025-11-29',
            progressValue: 75,
            progressFormat: 'invalid',
          });
        
        expect(response.status).toBe(400);
      });

      it('should reject negative numerator', async () => {
        const response = await request(app)
          .post('/api/goals/1/data-points')
          .send({
            date: '2025-11-29',
            progressValue: 75,
            progressFormat: 'percentage',
            numerator: -1,
            denominator: 10,
          });
        
        expect(response.status).toBe(400);
      });

      it('should reject denominator of zero', async () => {
        const response = await request(app)
          .post('/api/goals/1/data-points')
          .send({
            date: '2025-11-29',
            progressValue: 75,
            progressFormat: 'percentage',
            numerator: 5,
            denominator: 0,
          });
        
        expect(response.status).toBe(400);
      });

      it('should accept maximum numerator (9999)', async () => {
        const createdDataPoint = createMockDataPoint({ numerator: 9999 });
        mockStorage.createDataPoint.mockResolvedValue(createdDataPoint);
        
        const response = await request(app)
          .post('/api/goals/1/data-points')
          .send({
            date: '2025-11-29',
            progressValue: 100,
            progressFormat: 'percentage',
            numerator: 9999,
            denominator: 9999,
          });
        
        expect(response.status).toBe(201);
      });

      it('should reject numerator above maximum', async () => {
        const response = await request(app)
          .post('/api/goals/1/data-points')
          .send({
            date: '2025-11-29',
            progressValue: 100,
            progressFormat: 'percentage',
            numerator: 10000,
            denominator: 10,
          });
        
        expect(response.status).toBe(400);
      });

      it('should handle objective association', async () => {
        const createdDataPoint = createMockDataPoint({ objectiveId: 5 });
        mockStorage.createDataPoint.mockResolvedValue(createdDataPoint);
        
        const response = await request(app)
          .post('/api/goals/1/data-points')
          .send({
            date: '2025-11-29',
            progressValue: 75,
            progressFormat: 'percentage',
            objectiveId: 5,
          });
        
        expect(response.status).toBe(201);
      });
    });

    describe('PATCH /api/data-points/:id', () => {
      beforeEach(() => {
        mockStorage.getDataPoint.mockResolvedValue(createMockDataPoint());
        mockStorage.getGoal.mockResolvedValue(createMockGoal());
      });

      it('should update a data point', async () => {
        const updatedDataPoint = createMockDataPoint({ progressValue: '90.00' });
        mockStorage.updateDataPoint.mockResolvedValue(updatedDataPoint);
        
        const response = await request(app)
          .patch('/api/data-points/1')
          .send({ progressValue: '90' });
        
        expect(response.status).toBe(200);
      });

      it('should return 404 for non-existent data point', async () => {
        mockStorage.getDataPoint.mockResolvedValue(undefined);
        
        const response = await request(app)
          .patch('/api/data-points/999')
          .send({ progressValue: '90' });
        
        expect(response.status).toBe(404);
      });

      it('should handle invalid data point id format', async () => {
        const response = await request(app)
          .patch('/api/data-points/invalid')
          .send({ progressValue: '90' });
        
        expect(response.status).toBe(400);
      });
    });

    describe('DELETE /api/data-points/:id', () => {
      it('should delete a data point', async () => {
        const dataPoint = createMockDataPoint();
        mockStorage.getDataPoint.mockResolvedValue(dataPoint);
        mockStorage.getGoal.mockResolvedValue(createMockGoal());
        mockStorage.deleteDataPoint.mockResolvedValue(dataPoint);
        
        const response = await request(app).delete('/api/data-points/1');
        
        expect(response.status).toBe(200);
      });

      it('should return 404 for non-existent data point', async () => {
        mockStorage.getDataPoint.mockResolvedValue(undefined);
        
        const response = await request(app).delete('/api/data-points/999');
        
        expect(response.status).toBe(404);
      });
    });
  });

  describe('Reporting Period Routes', () => {
    describe('GET /api/reporting-periods', () => {
      it('should return null when no reporting periods exist', async () => {
        mockStorage.getReportingPeriods.mockResolvedValue(null);
        
        const response = await request(app).get('/api/reporting-periods');
        
        expect(response.status).toBe(200);
        expect(response.body).toBeNull();
      });

      it('should return reporting periods', async () => {
        const periods = {
          periods: [
            { periodNumber: 1, startDate: '2025-08-25', endDate: '2025-09-26' },
          ],
          periodLength: '4.5-weeks',
        };
        mockStorage.getReportingPeriods.mockResolvedValue(periods);
        
        const response = await request(app).get('/api/reporting-periods');
        
        expect(response.status).toBe(200);
        expect(response.body.periods).toBeDefined();
      });
    });

    describe('POST /api/reporting-periods', () => {
      it('should save reporting periods', async () => {
        const periods = {
          periods: [
            { periodNumber: 1, startDate: '2025-08-25', endDate: '2025-09-26' },
          ],
          periodLength: '4.5-weeks',
        };
        mockStorage.saveReportingPeriods.mockResolvedValue({ id: 1, periodData: JSON.stringify(periods) });
        
        const response = await request(app)
          .post('/api/reporting-periods')
          .send(periods);
        
        expect(response.status).toBe(201);
      });

      it('should reject invalid period structure', async () => {
        const response = await request(app)
          .post('/api/reporting-periods')
          .send({ invalid: 'data' });
        
        expect(response.status).toBe(400);
      });
    });

    describe('DELETE /api/reporting-periods', () => {
      it('should delete reporting periods', async () => {
        mockStorage.deleteReportingPeriods.mockResolvedValue(true);
        
        const response = await request(app).delete('/api/reporting-periods');
        
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle internal server errors gracefully', async () => {
      mockStorage.getStudents.mockRejectedValue(new Error('Database error'));
      
      const response = await request(app).get('/api/students');
      
      expect(response.status).toBe(500);
    });

    it('should return proper error format', async () => {
      mockStorage.getStudents.mockRejectedValue(new Error('Database error'));
      
      const response = await request(app).get('/api/students');
      
      expect(response.body).toHaveProperty('message');
    });
  });
});
