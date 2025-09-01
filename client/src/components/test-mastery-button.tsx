import React from 'react';
import { Button } from '@/components/ui/button';
import { detectMastery } from '@/lib/masteryDetection';

interface TestMasteryButtonProps {
  goals: any[];
  objectives: any;
  dataPoints: any[];
  studentId: number;
  onMasteryDetected: (alerts: any[]) => void;
}

export default function TestMasteryButton({ 
  goals, 
  objectives, 
  dataPoints, 
  studentId, 
  onMasteryDetected 
}: TestMasteryButtonProps) {
  const handleTest = () => {
    console.log('Manual mastery test triggered');
    console.log('Goals:', goals);
    console.log('Data points:', dataPoints);
    
    const alerts = detectMastery(goals, objectives, dataPoints, studentId);
    console.log('Manual test - alerts found:', alerts);
    
    if (alerts.length > 0) {
      onMasteryDetected(alerts);
    } else {
      alert('No mastery alerts detected. Check console for details.');
    }
  };

  return (
    <Button onClick={handleTest} variant="outline" size="sm">
      Test Mastery Detection
    </Button>
  );
}