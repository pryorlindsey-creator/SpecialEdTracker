import { useQuery } from "@tanstack/react-query";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Calendar } from "lucide-react";
import { format } from "date-fns";

interface StudentScatterplotProps {
  studentId: number;
  goalId?: number; // Optional: if provided, show only this goal's data
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

export default function StudentScatterplot({ studentId, goalId }: StudentScatterplotProps) {
  const { data: goals = [], isLoading: goalsLoading } = useQuery({
    queryKey: [`/api/students/${studentId}/goals`],
    enabled: !!studentId,
  });

  const { data: allDataPoints = [], isLoading: dataLoading } = useQuery({
    queryKey: [`/api/students/${studentId}/all-data-points`],
    enabled: !!studentId,
  });

  // Debug logging
  console.log(`StudentScatterplot: studentId=${studentId}, goals=`, goals, `allDataPoints=`, allDataPoints);
  console.log(`Filtered data points:`, allDataPoints?.filter((dp: DataPoint) => dp.progressValue && dp.date));

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

  // Filter data points by goal if goalId is provided
  const filteredDataPoints = goalId 
    ? allDataPoints?.filter((dp: DataPoint) => dp.goalId === goalId) || []
    : allDataPoints || [];

  // Process data points for scatterplot
  const scatterData = filteredDataPoints
    .filter((dp: DataPoint) => dp.progressValue !== null && dp.progressValue !== undefined && dp.date)
    .map((dp: DataPoint) => {
      const goal = goalsMap.get(dp.goalId);
      const dateObj = new Date(dp.date);
      
      // Convert progress value to percentage for consistent display
      let progressPercentage = 0;
      let yAxisLabel = "Progress (%)";
      
      if (dp.progressFormat === 'percentage') {
        progressPercentage = parseFloat(dp.progressValue);
        yAxisLabel = "Progress (%)";
      } else if (dp.progressFormat === 'frequency') {
        progressPercentage = parseFloat(dp.progressValue);
        yAxisLabel = "Frequency (count)";
      } else if (dp.progressFormat === 'duration') {
        progressPercentage = parseFloat(dp.progressValue);
        yAxisLabel = "Duration (seconds)";
      }

      return {
        x: dateObj.getTime(), // Use timestamp for x-axis
        y: progressPercentage,
        goalId: dp.goalId,
        goalTitle: goal?.title || `Goal ${dp.goalId}`,
        date: dp.date,
        originalValue: dp.progressValue,
        format: dp.progressFormat,
        color: goal?.color || GOAL_COLORS[0],
        yAxisLabel: yAxisLabel,
      };
    })
    .sort((a, b) => a.x - b.x);

  // Get the current goal information for title
  const currentGoal = goalId ? goals?.find(g => g.id === goalId) : null;
  const chartTitle = goalId && currentGoal 
    ? `${currentGoal.title} Progress Chart`
    : "Progress Scatterplot";
  
  const yAxisLabel = scatterData.length > 0 ? scatterData[0].yAxisLabel : "Progress";

  const hasData = scatterData.length > 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const date = new Date(data.x);
      
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold">{data.goalTitle}</p>
          <p className="text-sm text-gray-600">
            Date: {date.toLocaleDateString()}
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
          {chartTitle}
        </CardTitle>
        {hasData && (
          <p className="text-sm text-muted-foreground">
            {goalId ? `Track progress over time for ${currentGoal?.title}` : "Track progress trends across all goals over time"}
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
                  name="Date"
                  label={{ value: 'Date', position: 'insideBottom', offset: -10 }}
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString();
                  }}
                />
                <YAxis 
                  type="number" 
                  dataKey="y" 
                  name={yAxisLabel}
                  label={{ value: yAxisLabel, angle: -90, position: 'insideLeft' }}
                  domain={[0, 'dataMax']}
                />
                <Tooltip content={<CustomTooltip />} />
                
                <Scatter
                  name={goalId ? currentGoal?.title : "Progress"}
                  data={scatterData}
                  fill={scatterData.length > 0 ? scatterData[0].color : "#8884d8"}
                  stroke={scatterData.length > 0 ? scatterData[0].color : "#8884d8"}
                  strokeWidth={2}
                  r={6}
                />
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