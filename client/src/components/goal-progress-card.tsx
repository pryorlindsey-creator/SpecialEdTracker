import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChartLine, Plus, Calendar, Edit } from "lucide-react";
import { format } from "date-fns";
import EditGoalModal from "./edit-goal-modal";

interface Goal {
  id: number;
  title: string;
  description: string;
  status: string;
  currentProgress: number;
  averageScore: number;
  trend: number;
  lastScore: number;
  dataPointsCount: number;
  updatedAt: string;
}

interface GoalProgressCardProps {
  goal: Goal;
  onRefresh?: () => void;
  onViewChart?: () => void;
  onAddData?: () => void;
  onEditGoal?: () => void;
}

export default function GoalProgressCard({ goal, onRefresh, onViewChart, onAddData, onEditGoal }: GoalProgressCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'mastered':
        return 'bg-green-100 text-green-800';
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'discontinued':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 60) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const formatTrend = (trend: number) => {
    if (trend > 0) return `+${trend.toFixed(1)}%`;
    if (trend < 0) return `${trend.toFixed(1)}%`;
    return '0%';
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h4 className="text-lg font-semibold text-gray-900 mb-2">{goal.title}</h4>
            <p className="text-gray-600 text-sm line-clamp-2">{goal.description}</p>
          </div>
          <div className="ml-4">
            <Badge className={getStatusColor(goal.status)}>
              {goal.status === 'mastered' ? 'Mastered' : 
               goal.status === 'active' ? 'Active' : 
               goal.status === 'discontinued' ? 'Discontinued' : goal.status}
            </Badge>
          </div>
        </div>

        {/* Goal Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Current Progress</span>
            <span className="text-sm font-semibold text-gray-900">{goal.currentProgress?.toFixed(0) || 0}%</span>
          </div>
          <Progress 
            value={goal.currentProgress || 0} 
            className="h-3"
          />
        </div>

        {/* Goal Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{goal.dataPointsCount || 0}</p>
            <p className="text-xs text-gray-600">Data Points</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{goal.averageScore?.toFixed(0) || 0}%</p>
            <p className="text-xs text-gray-600">Average Score</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className={`text-2xl font-bold ${goal.trend > 0 ? 'text-green-600' : goal.trend < 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {formatTrend(goal.trend || 0)}
            </p>
            <p className="text-xs text-gray-600">Trend</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{goal.lastScore?.toFixed(0) || 0}%</p>
            <p className="text-xs text-gray-600">Last Score</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="text-sm text-gray-600 flex items-center">
            <Calendar className="h-4 w-4 mr-1" />
            Last updated: {format(new Date(goal.updatedAt), "MMM d")}
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onViewChart}
              className="text-primary hover:bg-blue-50"
            >
              <ChartLine className="h-4 w-4 mr-1" />
              View Chart
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onEditGoal}
              className="text-primary hover:bg-blue-50"
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit Goal
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onAddData}
              className="text-primary hover:bg-blue-50"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Data
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
