import { useQuery } from "@tanstack/react-query";
import ObjectiveChart from "./objective-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportingPeriod } from "@/lib/utils";

interface ObjectiveChartsForGoalProps {
  goalId: number;
  selectedPeriod?: ReportingPeriod | null;
}

export default function ObjectiveChartsForGoal({ goalId, selectedPeriod }: ObjectiveChartsForGoalProps) {
  // Get objectives for this goal
  const { data: objectives, isLoading } = useQuery({
    queryKey: [`/api/goals/${goalId}/objectives`],
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!objectives || objectives.length === 0) {
    return null; // Don't show anything if there are no objectives
  }

  return (
    <div className="space-y-6">
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Objective Charts ({objectives.length})
        </h3>
        <div className="space-y-6">
          {objectives.map((objective: any) => (
            <ObjectiveChart 
              key={objective.id} 
              objectiveId={objective.id} 
              goalId={goalId}
              selectedPeriod={selectedPeriod}
            />
          ))}
        </div>
      </div>
    </div>
  );
}