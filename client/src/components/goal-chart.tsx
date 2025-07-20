import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Download, Printer } from "lucide-react";
import { format } from "date-fns";

interface GoalChartProps {
  goalId: number;
}

export default function GoalChart({ goalId }: GoalChartProps) {
  const { data: goalProgress, isLoading, error } = useQuery({
    queryKey: [`/api/goals/${goalId}`],
    enabled: !!goalId,
    staleTime: 0,
    gcTime: 0,
  });



  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-80">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !goalProgress) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <p className="text-gray-600">Failed to load goal data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { goal, dataPoints } = goalProgress as any;

  // Prepare chart data
  const chartData = dataPoints
    .map((point: any) => ({
      date: format(new Date(point.date), "MMM d"),
      fullDate: point.date,
      progress: parseFloat(point.progressValue.toString()),
      originalValue: parseFloat(point.progressValue.toString()),
      support: point.levelOfSupport || 'Not specified',
    }))
    .reverse() // Show oldest to newest
    .slice(-10); // Show last 10 data points

  // Helper function to calculate evenly spaced ticks
  const calculateEvenTicks = (min: number, max: number, idealCount: number = 5): number[] => {
    if (min === max) return [min];
    
    const range = max - min;
    const step = Math.ceil(range / (idealCount - 1));
    const ticks = [];
    
    for (let i = 0; i < idealCount; i++) {
      const tick = min + (i * step);
      if (tick <= max) ticks.push(tick);
    }
    
    // Ensure max value is included
    if (ticks[ticks.length - 1] !== max) {
      ticks.push(max);
    }
    
    return ticks;
  };

  // Calculate Y-axis configuration based on data collection type
  let yAxisConfig = {
    domain: [0, 100] as [number, number],
    ticks: [0, 25, 50, 75, 100] as number[],
    tickFormatter: (value: number) => `${value}%`,
    tooltipFormatter: (value: number) => `${value.toFixed(1)}%`,
    isFrequency: false,
    isReversed: false
  };

  if (goal.dataCollectionType === 'frequency') {
    const frequencyValues = chartData.map((d: any) => d.originalValue);
    const minValue = Math.min(...frequencyValues, 0);
    const maxValue = Math.max(...frequencyValues, 1);
    const padding = Math.ceil((maxValue - minValue) * 0.1) || 1;
    const domainMin = Math.max(0, minValue - padding);
    const domainMax = maxValue + padding;
    
    yAxisConfig = {
      domain: [domainMin, domainMax] as [number, number],
      ticks: calculateEvenTicks(domainMin, domainMax, 5),
      tickFormatter: (value: number) => Math.round(value).toString(),
      tooltipFormatter: (value: number) => Math.round(value).toString(),
      isFrequency: true,
      isReversed: goal.frequencyDirection === 'decrease'
    };
  } else if (goal.dataCollectionType === 'duration') {
    const durationValues = chartData.map((d: any) => d.originalValue);
    const minValue = Math.min(...durationValues, 0);
    const maxValue = Math.max(...durationValues, 1);
    const padding = Math.ceil((maxValue - minValue) * 0.1) || 1;
    const domainMin = Math.max(0, minValue - padding);
    const domainMax = maxValue + padding;
    
    yAxisConfig = {
      domain: [domainMin, domainMax] as [number, number],
      ticks: calculateEvenTicks(domainMin, domainMax, 5),
      tickFormatter: (value: number) => {
        // Value is in minutes (e.g., 1.10 = 1 minute 10 seconds)
        const totalMinutes = Math.floor(value);
        const seconds = Math.round((value - totalMinutes) * 100); // Convert decimal to seconds
        // For duration goals, always show in minutes:seconds format unless it's 0
        if (value === 0) {
          return "0:00";
        }
        return `${totalMinutes}:${seconds.toString().padStart(2, '0')}`;
      },
      tooltipFormatter: (value: number) => {
        // Value is in minutes (e.g., 1.10 = 1 minute 10 seconds)
        const totalMinutes = Math.floor(value);
        const seconds = Math.round((value - totalMinutes) * 100); // Convert decimal to seconds
        if (value === 0) {
          return "0 minutes 0 seconds";
        }
        return `${totalMinutes} min ${seconds} sec`;
      },
      isFrequency: false,
      isReversed: false
    };
  }

  // For frequency charts, use original values instead of progress values
  const displayData = goal.dataCollectionType === 'frequency' || goal.dataCollectionType === 'duration'
    ? chartData.map((d: any) => ({ ...d, progress: d.originalValue }))
    : chartData;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Progress Chart: {goal.title}
          </h3>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <Printer className="h-4 w-4 mr-1" />
              Print
            </Button>
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-600">No data points available for this goal</p>
            <p className="text-sm text-gray-500 mt-1">Add some data points to see the progress chart</p>
          </div>
        ) : (
          <>
            {/* Chart Container */}
            <div className="h-80 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={displayData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#666"
                    fontSize={12}
                  />
                  <YAxis 
                    domain={yAxisConfig.isReversed ? [yAxisConfig.domain[1], yAxisConfig.domain[0]] : yAxisConfig.domain}
                    ticks={yAxisConfig.isReversed ? [...yAxisConfig.ticks].reverse() : yAxisConfig.ticks}
                    stroke="#666"
                    fontSize={12}
                    tickFormatter={yAxisConfig.tickFormatter}
                    allowDecimals={!yAxisConfig.isFrequency}
                    label={{ 
                      value: goal.dataCollectionType === 'frequency' ? 'Frequency' : 
                             goal.dataCollectionType === 'duration' ? 'Duration (mm:ss)' : 'Progress (%)', 
                      angle: -90, 
                      position: 'insideLeft' 
                    }}
                  />
                  <Tooltip
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0]) {
                        const data = payload[0].payload;
                        return format(new Date(data.fullDate), "MMM d, yyyy");
                      }
                      return label;
                    }}
                    formatter={(value: number, name: string, props) => [
                      yAxisConfig.tooltipFormatter(value),
                      goal.dataCollectionType === 'frequency' ? 'Frequency' : 
                      goal.dataCollectionType === 'duration' ? 'Duration' : 'Progress'
                    ]}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="progress"
                    stroke={yAxisConfig.isReversed ? "#DC2626" : "#2563EB"}
                    strokeWidth={3}
                    dot={{ fill: yAxisConfig.isReversed ? "#DC2626" : "#2563EB", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: yAxisConfig.isReversed ? "#DC2626" : "#2563EB" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Chart Statistics */}
            {goal.dataCollectionType === 'percentage' ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-gray-100">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {goalProgress.currentProgress.toFixed(0)}%
                  </p>
                  <p className="text-sm text-gray-600">Current Progress</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {goalProgress.averageScore.toFixed(0)}%
                  </p>
                  <p className="text-sm text-gray-600">Average Score</p>
                </div>
                <div className="text-center">
                  <p className={`text-2xl font-bold ${
                    goalProgress.trend > 0 ? 'text-green-600' : 
                    goalProgress.trend < 0 ? 'text-red-600' : 'text-gray-900'
                  }`}>
                    {(goalProgress as any).trend > 0 ? '+' : ''}{((goalProgress as any).trend || 0).toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-600">Trend</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {dataPoints.length}
                  </p>
                  <p className="text-sm text-gray-600">Data Points</p>
                </div>
              </div>
            ) : goal.dataCollectionType === 'frequency' ? (
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-100">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {dataPoints.length > 0 ? Math.round(parseFloat(dataPoints[dataPoints.length - 1].progressValue?.toString() || '0')) : 0}
                  </p>
                  <p className="text-sm text-gray-600">Current Frequency</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {dataPoints.length > 0 ? Math.round(dataPoints.reduce((sum: any, point: any) => sum + parseFloat(point.progressValue?.toString() || '0'), 0) / dataPoints.length) : 0}
                  </p>
                  <p className="text-sm text-gray-600">Average Frequency</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {dataPoints.length}
                  </p>
                  <p className="text-sm text-gray-600">Data Points</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-100">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {goalProgress.currentProgress.toFixed(0)}%
                  </p>
                  <p className="text-sm text-gray-600">Current Progress</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {dataPoints.length}
                  </p>
                  <p className="text-sm text-gray-600">Data Points</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Goal Summary Report */}
        <div className="mt-8 p-6 bg-gray-50 rounded-lg">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Goal Summary Report</h4>
          <div className="prose max-w-none text-sm">
            <p className="text-gray-700 mb-4">
              <strong>Goal Statement:</strong> {goal.description}
            </p>
            <p className="text-gray-700 mb-4">
              <strong>Current Status:</strong> {goal.status === 'active' ? 'The student is actively working toward this goal.' : 
                goal.status === 'mastered' ? 'The student has mastered this goal.' : 
                'This goal has been discontinued.'}
            </p>
            {dataPoints.length > 0 && (
              <p className="text-gray-700 mb-4">
                <strong>Recent Performance:</strong> {
                  goal.dataCollectionType === 'frequency' 
                    ? `The student's most recent frequency was ${Math.round(parseFloat(dataPoints[dataPoints.length - 1].value?.toString() || '0'))}, with an average frequency of ${Math.round(dataPoints.reduce((sum, point) => sum + parseFloat(point.value?.toString() || '0'), 0) / dataPoints.length)} across all data points.`
                    : goal.dataCollectionType === 'duration'
                    ? `The student's most recent duration was ${yAxisConfig.tooltipFormatter(parseFloat(dataPoints[dataPoints.length - 1].value?.toString() || '0'))}, with an average of ${yAxisConfig.tooltipFormatter(dataPoints.reduce((sum, point) => sum + parseFloat(point.value?.toString() || '0'), 0) / dataPoints.length)} across all data points.`
                    : `The student's most recent score was ${goalProgress.lastScore.toFixed(0)}%, with an average performance of ${goalProgress.averageScore.toFixed(0)}% across all data points.`
                }
              </p>
            )}
            <p className="text-gray-700">
              <strong>Data Collection:</strong> {dataPoints.length} data points have been collected for this goal.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
