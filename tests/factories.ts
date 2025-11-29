let idCounter = 1;

export function resetIdCounter() {
  idCounter = 1;
}

export function generateId(): number {
  return idCounter++;
}

export function createStudentFactory(count: number, userId: string = '4201332') {
  return Array.from({ length: count }, (_, i) => ({
    id: generateId(),
    userId,
    name: `Student ${i + 1}`,
    grade: `${(i % 12) + 1}${['st', 'nd', 'rd'][i % 3] || 'th'}`,
    iepDueDate: new Date(Date.now() + (i * 30 * 24 * 60 * 60 * 1000)),
    relatedServices: i % 2 === 0 ? 'Speech Therapy' : null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
}

export function createGoalFactory(count: number, studentId: number) {
  const dataTypes = ['percentage', 'frequency', 'duration'] as const;
  const statuses = ['active', 'mastered', 'discontinued'] as const;
  
  return Array.from({ length: count }, (_, i) => ({
    id: generateId(),
    studentId,
    title: `Goal ${i + 1}`,
    description: `Description for goal ${i + 1}`,
    targetCriteria: '80% accuracy over 4/5 trials',
    levelOfSupport: JSON.stringify(['verbal', 'visual']),
    dataCollectionType: dataTypes[i % 3],
    frequencyDirection: dataTypes[i % 3] === 'frequency' ? 'increase' : null,
    status: statuses[i % 3],
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
}

export function createObjectiveFactory(count: number, goalId: number, studentId: number) {
  const statuses = ['active', 'mastered', 'discontinued'] as const;
  
  return Array.from({ length: count }, (_, i) => ({
    id: generateId(),
    goalId,
    studentId,
    title: null,
    description: `Objective ${i + 1} description`,
    targetCriteria: '80% accuracy',
    targetDate: i % 2 === 0 ? new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)) : null,
    status: statuses[i % 3],
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
}

export function createDataPointFactory(
  count: number, 
  goalId: number, 
  studentId: number,
  options: {
    progressFormat?: 'percentage' | 'frequency' | 'duration';
    objectiveId?: number | null;
    dateSpread?: number;
  } = {}
) {
  const { 
    progressFormat = 'percentage', 
    objectiveId = null,
    dateSpread = 1
  } = options;
  
  return Array.from({ length: count }, (_, i) => {
    let progressValue: string;
    let numerator: number | null = null;
    let denominator: number | null = null;
    
    if (progressFormat === 'percentage') {
      progressValue = (50 + (i * 5) % 50).toFixed(2);
      numerator = Math.floor(Math.random() * 10);
      denominator = 10;
    } else if (progressFormat === 'frequency') {
      progressValue = (i + 1).toString();
    } else {
      progressValue = ((i + 1) * 5).toFixed(2);
    }
    
    return {
      id: generateId(),
      goalId,
      objectiveId,
      studentId,
      date: new Date(Date.now() - (i * dateSpread * 24 * 60 * 60 * 1000)),
      progressValue,
      progressFormat,
      numerator,
      denominator,
      durationUnit: progressFormat === 'duration' ? 'minutes' : null,
      levelOfSupport: JSON.stringify(['verbal']),
      setting: JSON.stringify(['general-education']),
      anecdotalInfo: `Data point ${i + 1} notes`,
      createdAt: new Date(),
    };
  });
}

export function createMaxLoadDataset() {
  resetIdCounter();
  
  const students = createStudentFactory(50);
  const goals: ReturnType<typeof createGoalFactory> = [];
  const objectives: ReturnType<typeof createObjectiveFactory> = [];
  const dataPoints: ReturnType<typeof createDataPointFactory> = [];
  
  students.forEach(student => {
    const studentGoals = createGoalFactory(15, student.id);
    goals.push(...studentGoals);
    
    studentGoals.forEach(goal => {
      const goalObjectives = createObjectiveFactory(10, goal.id, student.id);
      objectives.push(...goalObjectives);
      
      const goalDataPoints = createDataPointFactory(100, goal.id, student.id, {
        progressFormat: goal.dataCollectionType as 'percentage' | 'frequency' | 'duration',
      });
      dataPoints.push(...goalDataPoints);
    });
  });
  
  return { students, goals, objectives, dataPoints };
}

export function createEmptyDataset() {
  return {
    students: [],
    goals: [],
    objectives: [],
    dataPoints: [],
  };
}

export function createBoundaryValues() {
  return {
    maxLengthTitle: 'A'.repeat(200),
    maxLengthDescription: 'B'.repeat(2000),
    maxLengthTargetCriteria: 'C'.repeat(500),
    minProgressValue: -999,
    maxProgressValue: 999,
    maxNumerator: 9999,
    maxDenominator: 9999,
    emptyString: '',
    nullValue: null,
    undefinedValue: undefined,
  };
}
