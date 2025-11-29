import moment from 'moment';

interface DataPoint {
  id: number;
  goalId: number;
  objectiveId?: number | null;
  progressValue: string;
  date: string;
  progressFormat: string;
  numerator?: number;
  denominator?: number;
}

interface Goal {
  id: number;
  title: string;
  targetCriteria?: string;
  dataCollectionType: string;
  status: string;
}

interface Objective {
  id: number;
  description: string;
  targetCriteria?: string;
  status: string;
}

export interface MasteryAlert {
  id: string;
  type: 'goal' | 'objective';
  itemId: number;
  title: string;
  description: string;
  targetCriteria: string;
  masteryDate: string;
  dataPointsUsed: number[];
  studentId: number;
}

/**
 * Parse target criteria string and extract mastery requirements
 * Examples:
 * - "80% accuracy over 3 consecutive sessions"
 * - "90% for 5 consecutive trials"
 * - "4 out of 5 sessions at 85%"
 * - "Reduce frequency to under 2 per hour for 3 days"
 */
export function parseTargetCriteria(criteria: string): {
  threshold: number;
  consecutiveCount: number;
  isFrequencyReduction?: boolean;
  totalCount?: number | null;
} | null {
  if (!criteria) return null;

  const criteriaLower = criteria.toLowerCase();
  
  // Extract percentage threshold
  const percentMatch = criteriaLower.match(/(\d+)%/);
  const threshold = percentMatch ? parseInt(percentMatch[1]) : null;
  
  // Extract consecutive count - handle various patterns including "X out of Y"
  const outOfMatch = criteriaLower.match(/(\d+(?:\.\d+)?)\s*out\s*of\s*(\d+(?:\.\d+)?)/);
  const consecutiveMatch = criteriaLower.match(/(\d+(?:\.\d+)?)\s*consecutive|over\s*(\d+(?:\.\d+)?)|for\s*(\d+(?:\.\d+)?)/);
  
  let consecutiveCount: number;
  let totalCount: number | null = null;
  
  if (outOfMatch) {
    // Handle "X out of Y" pattern
    consecutiveCount = parseInt(outOfMatch[1]);
    totalCount = parseInt(outOfMatch[2]);
  } else if (consecutiveMatch) {
    consecutiveCount = parseInt(consecutiveMatch[1] || consecutiveMatch[2] || consecutiveMatch[3]);
  } else {
    consecutiveCount = 3; // Default to 3
  }
  
  // Check for frequency reduction goals
  const isFrequencyReduction = criteriaLower.includes('reduce') || 
                               criteriaLower.includes('decrease') || 
                               criteriaLower.includes('under') ||
                               criteriaLower.includes('less than');

  if (threshold === null) return null;

  return {
    threshold,
    consecutiveCount,
    isFrequencyReduction,
    totalCount
  };
}

/**
 * Check if data points meet mastery criteria
 */
export function checkMastery(
  dataPoints: DataPoint[],
  targetCriteria: string,
  dataCollectionType: string = 'percentage'
): { isMastered: boolean; masteryDate?: string; dataPointsUsed?: number[] } {
  const criteria = parseTargetCriteria(targetCriteria);
  if (!criteria || dataPoints.length === 0) {
    return { isMastered: false };
  }

  // Sort data points by date (most recent first)
  const sortedPoints = [...dataPoints].sort((a, b) => 
    moment(b.date).valueOf() - moment(a.date).valueOf()
  );

  const { threshold, consecutiveCount, isFrequencyReduction, totalCount } = criteria;

  // Handle "X out of Y" pattern
  if (totalCount && totalCount > 0) {
    const recentPoints = sortedPoints.slice(0, totalCount);
    
    if (recentPoints.length < totalCount) {
      return { isMastered: false };
    }

    // For frequency reduction goals
    if (dataCollectionType === 'frequency' && isFrequencyReduction) {
      const belowThresholdCount = recentPoints.filter(point => {
        const value = parseFloat(point.progressValue);
        return value <= threshold;
      }).length;

      if (belowThresholdCount >= consecutiveCount) {
        return {
          isMastered: true,
          masteryDate: recentPoints[recentPoints.length - 1].date,
          dataPointsUsed: recentPoints.map(p => p.id)
        };
      }
    }
    // For percentage/accuracy goals
    else {
      const aboveThresholdCount = recentPoints.filter(point => {
        const value = parseFloat(point.progressValue);
        return value >= threshold;
      }).length;

      if (aboveThresholdCount >= consecutiveCount) {
        return {
          isMastered: true,
          masteryDate: recentPoints[recentPoints.length - 1].date,
          dataPointsUsed: recentPoints.map(p => p.id)
        };
      }
    }
  }
  // Handle consecutive pattern (original logic)
  else {
    // For frequency reduction goals, check if recent values are below threshold
    if (dataCollectionType === 'frequency' && isFrequencyReduction) {
      const recentPoints = sortedPoints.slice(0, consecutiveCount);
      
      if (recentPoints.length < consecutiveCount) {
        return { isMastered: false };
      }

      const allBelowThreshold = recentPoints.every(point => 
        parseFloat(point.progressValue) <= threshold
      );

      if (allBelowThreshold) {
        return {
          isMastered: true,
          masteryDate: recentPoints[recentPoints.length - 1].date,
          dataPointsUsed: recentPoints.map(p => p.id)
        };
      }
    }

    // For percentage/accuracy goals, check if recent values meet or exceed threshold
    else {
      const recentPoints = sortedPoints.slice(0, consecutiveCount);
      
      if (recentPoints.length < consecutiveCount) {
        return { isMastered: false };
      }

      const allMeetThreshold = recentPoints.every(point => {
        const value = parseFloat(point.progressValue);
        return value >= threshold;
      });

      if (allMeetThreshold) {
        return {
          isMastered: true,
          masteryDate: recentPoints[recentPoints.length - 1].date,
          dataPointsUsed: recentPoints.map(p => p.id)
        };
      }
    }
  }

  return { isMastered: false };
}

/**
 * Helper function to check if an objective has achieved mastery
 */
function checkObjectiveMastery(
  objective: Objective,
  allDataPoints: DataPoint[],
  dataCollectionType: string
): { isMastered: boolean; masteryDate?: string; dataPointsUsed?: number[] } {
  if (!objective.targetCriteria) {
    return { isMastered: false };
  }

  const objectiveDataPoints = allDataPoints.filter(dp => 
    dp.objectiveId === objective.id && dp.id && dp.progressValue && !isNaN(parseFloat(dp.progressValue))
  );

  if (objectiveDataPoints.length === 0) {
    return { isMastered: false };
  }

  return checkMastery(objectiveDataPoints, objective.targetCriteria, dataCollectionType);
}

/**
 * Check all goals and objectives for mastery
 * 
 * IMPORTANT: Goals with objectives only show mastery when ALL objectives are mastered.
 * Goals without objectives use the goal-level data point evaluation.
 */
export function detectMastery(
  goals: Goal[],
  objectives: { [goalId: number]: Objective[] },
  allDataPoints: DataPoint[],
  studentId: number
): MasteryAlert[] {
  const alerts: MasteryAlert[] = [];

  // First, check objectives for mastery and track which ones are mastered
  const objectiveMasteryStatus: { [objectiveId: number]: boolean } = {};
  const objectiveAlerts: MasteryAlert[] = [];

  Object.entries(objectives).forEach(([goalId, goalObjectives]) => {
    const goal = goals.find(g => g.id === parseInt(goalId));
    if (!goal || !Array.isArray(goalObjectives)) return;

    goalObjectives.forEach(objective => {
      // Check if objective is already marked as mastered in status
      if (objective.status === 'mastered') {
        objectiveMasteryStatus[objective.id] = true;
        return;
      }

      if (!objective.targetCriteria) {
        objectiveMasteryStatus[objective.id] = false;
        return;
      }

      const masteryResult = checkObjectiveMastery(objective, allDataPoints, goal.dataCollectionType);
      objectiveMasteryStatus[objective.id] = masteryResult.isMastered;
      
      if (masteryResult.isMastered) {
        console.log('🎯 MASTERY ALERT: Objective achieved mastery!', {
          objectiveId: objective.id,
          goalTitle: goal.title,
          criteria: objective.targetCriteria
        });
        
        objectiveAlerts.push({
          id: `objective-${objective.id}`,
          type: 'objective',
          itemId: objective.id,
          title: `${goal.title} - Objective`,
          description: objective.description,
          targetCriteria: objective.targetCriteria,
          masteryDate: masteryResult.masteryDate!,
          dataPointsUsed: masteryResult.dataPointsUsed!,
          studentId
        });
      }
    });
  });

  // Add all objective alerts
  alerts.push(...objectiveAlerts);

  // Check goals for mastery
  goals.forEach(goal => {
    if (goal.status === 'mastered' || !goal.targetCriteria) {
      return;
    }

    const goalObjectives = objectives[goal.id] || [];
    const hasObjectives = goalObjectives.length > 0;

    if (hasObjectives) {
      // Goal has objectives - only show mastery if ALL objectives are mastered
      const objectivesWithCriteria = goalObjectives.filter(obj => obj.targetCriteria);
      
      if (objectivesWithCriteria.length === 0) {
        // Goal has objectives but none have target criteria - fall back to goal-level evaluation
        const goalDataPoints = allDataPoints.filter(dp => 
          dp.goalId === goal.id && dp.id && dp.progressValue && !isNaN(parseFloat(dp.progressValue))
        );

        if (goalDataPoints.length === 0) return;

        const masteryResult = checkMastery(goalDataPoints, goal.targetCriteria, goal.dataCollectionType);
        
        if (masteryResult.isMastered) {
          alerts.push({
            id: `goal-${goal.id}`,
            type: 'goal',
            itemId: goal.id,
            title: goal.title,
            description: `Goal "${goal.title}" has met mastery criteria`,
            targetCriteria: goal.targetCriteria,
            masteryDate: masteryResult.masteryDate!,
            dataPointsUsed: masteryResult.dataPointsUsed!,
            studentId
          });
        }
      } else {
        // Check if ALL objectives with criteria are mastered
        const allObjectivesMastered = objectivesWithCriteria.every(obj => {
          // Check if already mastered in status OR detected as mastered in this run
          return obj.status === 'mastered' || objectiveMasteryStatus[obj.id] === true;
        });

        if (allObjectivesMastered) {
          // Find the most recent mastery date among all objectives
          const objectiveMasteryDates = objectiveAlerts
            .filter(alert => goalObjectives.some(obj => obj.id === alert.itemId))
            .map(alert => alert.masteryDate);
          
          // Also check for already-mastered objectives
          const alreadyMasteredObjectives = objectivesWithCriteria.filter(obj => obj.status === 'mastered');
          
          const latestMasteryDate = objectiveMasteryDates.length > 0 
            ? objectiveMasteryDates.sort((a, b) => moment(b).valueOf() - moment(a).valueOf())[0]
            : moment().format('YYYY-MM-DD');

          // Collect all data point IDs used for objective mastery
          const allDataPointsUsed = objectiveAlerts
            .filter(alert => goalObjectives.some(obj => obj.id === alert.itemId))
            .flatMap(alert => alert.dataPointsUsed);

          console.log('🎯 GOAL MASTERY: All objectives mastered for goal!', {
            goalId: goal.id,
            goalTitle: goal.title,
            objectiveCount: objectivesWithCriteria.length,
            masteredCount: objectivesWithCriteria.filter(obj => 
              obj.status === 'mastered' || objectiveMasteryStatus[obj.id] === true
            ).length
          });

          alerts.push({
            id: `goal-${goal.id}`,
            type: 'goal',
            itemId: goal.id,
            title: goal.title,
            description: `Goal "${goal.title}" is complete - all ${objectivesWithCriteria.length} objectives have been mastered`,
            targetCriteria: goal.targetCriteria,
            masteryDate: latestMasteryDate,
            dataPointsUsed: allDataPointsUsed,
            studentId
          });
        }
      }
    } else {
      // Goal has NO objectives - use goal-level data point evaluation (original behavior)
      const goalDataPoints = allDataPoints.filter(dp => 
        dp.goalId === goal.id && dp.id && dp.progressValue && !isNaN(parseFloat(dp.progressValue))
      );

      if (goalDataPoints.length === 0) return;

      const masteryResult = checkMastery(goalDataPoints, goal.targetCriteria, goal.dataCollectionType);
      
      if (masteryResult.isMastered) {
        alerts.push({
          id: `goal-${goal.id}`,
          type: 'goal',
          itemId: goal.id,
          title: goal.title,
          description: `Goal "${goal.title}" has met mastery criteria`,
          targetCriteria: goal.targetCriteria,
          masteryDate: masteryResult.masteryDate!,
          dataPointsUsed: masteryResult.dataPointsUsed!,
          studentId
        });
      }
    }
  });

  console.log('🎯 MASTERY ALERTS GENERATED:', alerts.length, alerts);
  return alerts;
}