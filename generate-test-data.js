// Test data generation script for database capacity testing
// Creates 10 users, 20 students each, 5-7 goals per student, 10-15 data points per goal

const API_BASE = 'http://localhost:5000';

// Helper function to make API requests
async function apiRequest(method, endpoint, data = null) {
  const url = `${API_BASE}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

// Generate random data helpers
function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

// Sample data arrays
const firstNames = [
  'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'William', 'Sophia', 'Mason', 'Isabella', 'James',
  'Charlotte', 'Benjamin', 'Amelia', 'Lucas', 'Mia', 'Henry', 'Harper', 'Alexander', 'Evelyn', 'Sebastian'
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'
];

const grades = ['PreK', 'K', '1', '2', '3', '4', '5', '6', '7', '8'];

const relatedServices = [
  'Speech-Language Therapy',
  'Occupational Therapy', 
  'Physical Therapy',
  'Vision',
  'Hearing',
  'Nursing'
];

const goalTemplates = [
  { title: 'Reading Comprehension', description: 'Student will answer comprehension questions about grade-level text', type: 'percentage' },
  { title: 'Math Problem Solving', description: 'Student will solve multi-step math problems with visual supports', type: 'percentage' },
  { title: 'Social Interaction', description: 'Student will initiate peer interactions during structured activities', type: 'frequency' },
  { title: 'Task Completion', description: 'Student will complete assigned tasks within given time frame', type: 'duration' },
  { title: 'Following Directions', description: 'Student will follow 2-3 step directions independently', type: 'percentage' },
  { title: 'Behavioral Regulation', description: 'Student will use coping strategies when frustrated', type: 'frequency' },
  { title: 'Communication Skills', description: 'Student will use appropriate communication methods to express needs', type: 'frequency' },
  { title: 'Attention to Task', description: 'Student will maintain attention to academic tasks', type: 'duration' },
  { title: 'Writing Skills', description: 'Student will write complete sentences with proper grammar', type: 'percentage' },
  { title: 'Self-Advocacy', description: 'Student will request help when needed using appropriate methods', type: 'frequency' }
];

const supportLevels = [
  'Independent',
  'Verbal Prompt',
  'Visual Prompt', 
  'Gestural Prompt',
  'Physical Prompt',
  'Hand-over-Hand'
];

// Generate test data
async function generateTestData() {
  console.log('Starting test data generation...');
  console.log('Target: 10 users, 200 students, 1000-1400 goals, 10000-21000 data points');
  
  let totalStudents = 0;
  let totalGoals = 0;
  let totalDataPoints = 0;
  
  for (let userIndex = 1; userIndex <= 10; userIndex++) {
    const userId = `test_user_${userIndex.toString().padStart(3, '0')}`;
    console.log(`\nCreating data for User ${userIndex} (${userId})...`);
    
    // Create 20 students for this user
    for (let studentIndex = 1; studentIndex <= 20; studentIndex++) {
      const studentName = `${randomChoice(firstNames)} ${randomChoice(lastNames)} ${userIndex}-${studentIndex}`;
      const grade = randomChoice(grades);
      const iepDueDate = new Date(2025, randomInt(8, 11), randomInt(1, 28)).toISOString().split('T')[0];
      const selectedServices = [];
      const numServices = randomInt(1, 3);
      for (let i = 0; i < numServices; i++) {
        const service = randomChoice(relatedServices);
        if (!selectedServices.includes(service)) {
          selectedServices.push(service);
        }
      }
      
      try {
        // Create student
        const student = await apiRequest('POST', '/api/students', {
          userId,
          name: studentName,
          grade,
          iepDueDate,
          relatedServices: selectedServices.join(', ')
        });
        
        totalStudents++;
        console.log(`  Created student ${studentIndex}/20: ${studentName} (ID: ${student.id})`);
        
        // Create 5-7 goals for this student
        const numGoals = randomInt(5, 7);
        for (let goalIndex = 1; goalIndex <= numGoals; goalIndex++) {
          const goalTemplate = randomChoice(goalTemplates);
          const goalData = {
            studentId: student.id,
            title: `${goalTemplate.title} - Goal ${goalIndex}`,
            description: goalTemplate.description,
            targetCriteria: `80% accuracy over 3 consecutive sessions`,
            dataCollectionType: goalTemplate.type,
            status: randomChoice(['Active', 'In Progress']),
            levelOfSupport: [randomChoice(supportLevels)]
          };
          
          const goal = await apiRequest('POST', '/api/goals', goalData);
          totalGoals++;
          
          // Create 10-15 data points for this goal
          const numDataPoints = randomInt(10, 15);
          for (let dpIndex = 1; dpIndex <= numDataPoints; dpIndex++) {
            // Generate date within last 60 days
            const date = new Date();
            date.setDate(date.getDate() - randomInt(1, 60));
            
            let dataPointData = {
              goalId: goal.id,
              studentId: student.id,
              date: date.toISOString().split('T')[0],
              levelOfSupport: [randomChoice(supportLevels)],
              notes: `Data point ${dpIndex} for ${goalTemplate.title}`
            };
            
            // Add type-specific data
            if (goalTemplate.type === 'percentage') {
              dataPointData.correctTrials = randomInt(6, 10);
              dataPointData.totalTrials = 10;
            } else if (goalTemplate.type === 'frequency') {
              dataPointData.frequency = randomInt(1, 8);
            } else if (goalTemplate.type === 'duration') {
              dataPointData.durationValue = randomFloat(1.0, 10.0);
              dataPointData.durationUnit = randomChoice(['minutes', 'seconds']);
            }
            
            await apiRequest('POST', '/api/data-points', dataPointData);
            totalDataPoints++;
          }
        }
        
        // Progress indicator
        if (studentIndex % 5 === 0) {
          console.log(`    Progress: ${studentIndex}/20 students completed for User ${userIndex}`);
        }
        
      } catch (error) {
        console.error(`Error creating data for student ${studentIndex}:`, error.message);
      }
    }
    
    console.log(`Completed User ${userIndex}: 20 students, ~${numGoals * 20} goals, ~${numGoals * 20 * 12} data points`);
  }
  
  console.log('\n=== TEST DATA GENERATION COMPLETE ===');
  console.log(`Total Students Created: ${totalStudents}`);
  console.log(`Total Goals Created: ${totalGoals}`);
  console.log(`Total Data Points Created: ${totalDataPoints}`);
  console.log('Database capacity test data generation finished successfully!');
}

// Run the generation
generateTestData().catch(console.error);