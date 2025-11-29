import { vi } from 'vitest';

export const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  offset: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([]),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
};

export function resetMocks() {
  Object.values(mockDb).forEach(mock => {
    if (typeof mock.mockReset === 'function') {
      mock.mockReset();
      mock.mockReturnThis();
    }
  });
}

export function createMockUser(overrides = {}) {
  return {
    id: '4201332',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    profileImageUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockStudent(overrides = {}) {
  return {
    id: 1,
    userId: '4201332',
    name: 'Test Student',
    grade: '3rd',
    iepDueDate: new Date('2025-12-01'),
    relatedServices: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockGoal(overrides = {}) {
  return {
    id: 1,
    studentId: 1,
    title: 'Test Goal',
    description: 'Test goal description',
    targetCriteria: '80% accuracy over 4/5 trials',
    levelOfSupport: '["verbal", "visual"]',
    dataCollectionType: 'percentage' as const,
    frequencyDirection: null,
    status: 'active' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockObjective(overrides = {}) {
  return {
    id: 1,
    goalId: 1,
    studentId: 1,
    title: null,
    description: 'Test objective description',
    targetCriteria: '80% accuracy',
    targetDate: null,
    status: 'active' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockDataPoint(overrides = {}) {
  return {
    id: 1,
    goalId: 1,
    objectiveId: null,
    studentId: 1,
    date: new Date(),
    progressValue: '75.00',
    progressFormat: 'percentage' as const,
    numerator: 3,
    denominator: 4,
    durationUnit: null,
    levelOfSupport: '["verbal"]',
    setting: '["general-education"]',
    anecdotalInfo: 'Test note',
    createdAt: new Date(),
    ...overrides,
  };
}

export function createMockReportingPeriod(overrides = {}) {
  return {
    id: 1,
    userId: '4201332',
    periodData: JSON.stringify({
      periods: [
        { periodNumber: 1, startDate: '2025-08-25', endDate: '2025-09-26' },
      ],
      periodLength: '4.5-weeks',
    }),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
