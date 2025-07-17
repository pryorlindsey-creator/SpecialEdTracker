import { useQuery } from "@tanstack/react-query";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Calendar } from "lucide-react";
import { format } from "date-fns";

interface StudentScatterplotProps {
  studentId: number;
}

interface DataPoint {
  id: number;
  goalId: number;
  date: string;
  progressValue: string;
  progressFormat: string;
  goalTitle?: string;
  goalColor?: string;
}

interface Goal {
  id: number;
  title: string;
  dataCollectionType: string;
}

// Color palette for different goals
const GOAL_COLORS = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#84cc16", // lime
  "#f97316", // orange
];

export default function StudentScatterplot({ studentId }: StudentScatterplotProps) {
  const { data: goals = [], isLoading: goalsLoading } = useQuery({
    queryKey: ["/api/students", studentId, "goals"],
    enabled: !!studentId,
  });

  const { data: allDataPoints = [], isLoading: dataLoading } = useQuery({
    queryKey: ["/api/students", studentId, "all-data-points"],
    enabled: !!studentId,
  });

  if (goalsLoading || dataLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Progress Scatterplot
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Create a map of goals for easy lookup
  const goalsMap = new Map(goals.map((goal: Goal, index: number) => [
    goal.id, 
    { 
      ...goal, 
      color: GOAL_COLORS[index % GOAL_COLORS.length] 
    }
  ]));

  // Process data points for scatterplot
  const scatterData = allDataPoints
    .filter((dp: DataPoint) => dp.progressValue && dp.date)
    .map((dp: DataPoint) => {
      const goal = goalsMap.get(dp.goalId);
      const dateObj = new Date(dp.date);
      const daysSinceStart = Math.floor((dateObj.getTime() - new Date('2025-01-01').getTime()) / (1000 * 60 * 60 * 24));
      
      // Convert progress value to percentage for consistent display
      let progressPercentage = 0;
      if (dp.progressFormat === 'percentage') {
        progressPercentage = parseFloat(dp.progressValue);
      } else if (dp.progressFormat === 'frequency') {
        // For frequency, assume it's out of attempts (could be enhanced with denominator)
        progressPercentage = parseFloat(dp.progressValue) * 10; // Scale for visibility
      } else if (dp.progressFormat === 'duration') {
        // For duration, convert to a percentage scale (could be enhanced with target duration)
        progressPercentage = Math.min(parseFloat(dp.progressValue) / 60 * 100, 100); // Convert seconds to percentage of a minute
      }

      return {
        x: daysSinceStart,
        y: progressPercentage,
        goalId: dp.goalId,
        goalTitle: goal?.title || `Goal ${dp.goalId}`,
        date: dp.date,
        originalValue: dp.progressValue,
        format: dp.progressFormat,
        color: goal?.color || GOAL_COLORS[0],
      };
    })
    .sort((a, b) => a.x - b.x);

  // Group data by goal for multiple scatter series
  const goalGroups = scatterData.reduce((acc: any, point) => {
    if (!acc[point.goalId]) {
      acc[point.goalId] = {
        goalTitle: point.goalTitle,
        color: point.color,
        data: [],
      };
    }
    acc[point.goalId].data.push(point);
    return acc;
  }, {});

  const hasData = scatterData.length > 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const date = new Date('2025-01-01');
      date.setDate(date.getDate() + data.x);
      
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold">{data.goalTitle}</p>
          <p className="text-sm text-gray-600">
            Date: {format(date, "MMM dd, yyyy")}
          </p>
          <p className="text-sm">
            Progress: {data.originalValue}
            {data.format === 'percentage' && '%'}
            {data.format === 'frequency' && ' times'}
            {data.format === 'duration' && ' seconds'}
          </p>
          <p className="text-sm text-gray-600">
            Display Value: {data.y.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Progress Scatterplot
        </CardTitle>
        {hasData && (
          <p className="text-sm text-muted-foreground">
            Track progress trends across all goals over time
          </p>
        )}
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="h-80 flex flex-col items-center justify-center text-center">
            <Calendar className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Points Yet</h3>
            <p className="text-gray-600 max-w-sm">
              Start collecting data on student goals to see progress trends in this scatterplot.
            </p>
          </div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  type="number" 
                  dataKey="x" 
                  name="Days Since Start"
                  label={{ value: 'Days Since January 1st', position: 'insideBottom', offset: -10 }}
                  domain={['dataMin', 'dataMax']}
                />
                <YAxis 
                  type="number" 
                  dataKey="y" 
                  name="Progress %" 
                  label={{ value: 'Progress (%)', angle: -90, position: 'insideLeft' }}
                  domain={[0, 'dataMax']}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="top" 
                  height={36}
                  iconType="circle"
                />
                
                {Object.values(goalGroups).map((group: any, index) => (
                  <Scatter
                    key={group.goalTitle}
                    name={group.goalTitle}
                    data={group.data}
                    fill={group.color}
                    stroke={group.color}
                    strokeWidth={2}
                    r={6}
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}
        
        {hasData && (
          <div className="mt-4 text-xs text-gray-600">
            <p>
              * Different data collection types are normalized to percentage scale for comparison
            </p>
            <p>
              * Frequency data is scaled (×10), Duration data shows seconds as % of minute
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}