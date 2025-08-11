import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Line, ComposedChart, LineChart } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  frequencyDirection?: string;
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
  const [showTrendLine, setShowTrendLine] = useState(() => {
    // Get trend line preference from sessionStorage
    const savedTrendPref = sessionStorage.getItem(`scatterTrend_${studentId}_${goalId || 'all'}`);
    return savedTrendPref ? savedTrendPref === 'true' : true; // Default to true
  });
  const { data: goals = [], isLoading: goalsLoading } = useQuery({
    queryKey: [`/api/students/${studentId}/goals`],
    enabled: !!studentId,
  });

  const { data: allDataPoints = [], isLoading: dataLoading } = useQuery({
    queryKey: [`/api/students/${studentId}/all-data-points`],
    enabled: !!studentId,
  });

  // Debug logging for data persistence issues
  console.log(`[SCATTERPLOT DEBUG] Student ${studentId}, Goals: ${goals?.length || 0}, DataPoints: ${allDataPoints?.length || 0}`);
  if (allDataPoints && allDataPoints.length > 0) {
    console.log(`[SCATTERPLOT DEBUG] Data points retrieved:`, allDataPoints.map(dp => ({ id: dp.id, goalId: dp.goalId, date: dp.date, value: dp.progressValue })));
  }

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
      
      // For frequency and duration goals, use the original value instead of progress value
      let displayValue = 0;
      let yAxisLabel = "Progress (%)";
      let originalValue = dp.progressValue;
      
      // Query the allDataPoints to get the actual 'value' field for frequency/duration
      const fullDataPoint = allDataPoints?.find((fullDp: any) => 
        fullDp.id === dp.id || 
        (fullDp.goalId === dp.goalId && fullDp.date === dp.date)
      );
      
      if (dp.progressFormat === 'percentage') {
        displayValue = parseFloat(dp.progressValue);
        yAxisLabel = "Progress (%)";
      } else if (dp.progressFormat === 'frequency') {
        // Use the original frequency value, not the progress percentage
        displayValue = fullDataPoint?.value ? parseFloat(fullDataPoint.value) : parseFloat(dp.progressValue);
        originalValue = displayValue.toString();
        yAxisLabel = "Frequency (count)";
      } else if (dp.progressFormat === 'duration') {
        // Use the original duration value, not the progress percentage
        displayValue = fullDataPoint?.value ? parseFloat(fullDataPoint.value) : parseFloat(dp.progressValue);
        originalValue = displayValue.toString();
        yAxisLabel = "Duration (mm:ss)";
      }

      return {
        x: dateObj.getTime(), // Use timestamp for x-axis
        y: displayValue,
        goalId: dp.goalId,
        goalTitle: goal?.title || `Goal ${dp.goalId}`,
        date: dp.date,
        originalValue: originalValue,
        format: dp.progressFormat,
        color: goal?.color || GOAL_COLORS[0],
        yAxisLabel: yAxisLabel,
        durationUnit: fullDataPoint?.durationUnit || dp.durationUnit,
        goal: goal, // Include goal info for frequency direction
      };
    })
    .sort((a, b) => a.x - b.x);

  // Get the current goal information for title
  const currentGoal = goalId ? goals?.find(g => g.id === goalId) : null;
  const chartTitle = goalId && currentGoal 
    ? `${currentGoal.title} Progress Chart`
    : "Progress Scatterplot";
  
  const yAxisLabel = scatterData.length > 0 ? scatterData[0].yAxisLabel : "Progress";

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

  // Calculate Y-axis configuration based on data type and frequency direction
  let yAxisConfig = {
    domain: [0, 100] as [number, number],
    ticks: [0, 25, 50, 75, 100] as number[],
    tickFormatter: (value: number) => value.toString(),
    allowDecimals: true,
    reversed: false
  };

  if (scatterData.length > 0) {
    const firstDataPoint = scatterData[0];
    const goal = firstDataPoint.goal;
    
    if (firstDataPoint.format === 'frequency') {
      const frequencyValues = scatterData.map((d: any) => d.y);
      const minValue = Math.min(...frequencyValues, 0);
      const maxValue = Math.max(...frequencyValues, 1);
      const padding = Math.ceil((maxValue - minValue) * 0.1) || 1;
      const domainMin = Math.max(0, minValue - padding);
      const domainMax = maxValue + padding;
      
      yAxisConfig = {
        domain: [domainMin, domainMax] as [number, number],
        ticks: calculateEvenTicks(domainMin, domainMax, 5),
        tickFormatter: (value: number) => Math.round(value).toString(),
        allowDecimals: false,
        reversed: goal?.frequencyDirection === 'decrease'
      };
    } else if (firstDataPoint.format === 'duration') {
      const durationValues = scatterData.map((d: any) => d.y);
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
          if (value === 0) {
            return "0:00";
          }
          return `${totalMinutes}:${seconds.toString().padStart(2, '0')}`;
        },
        allowDecimals: false,
        reversed: false
      };
    } else {
      // Percentage type - use default 0-100 with even ticks
      yAxisConfig = {
        domain: [0, 100] as [number, number],
        ticks: [0, 20, 40, 60, 80, 100],
        tickFormatter: (value: number) => `${value}%`,
        allowDecimals: true,
        reversed: false
      };
    }
  }

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
            {data.format === 'frequency' ? 'Count:' : 'Progress:'} {data.originalValue}
            {data.format === 'percentage' && '%'}
            {data.format === 'frequency' && ' times'}
            {data.format === 'duration' && (data.durationUnit === 'seconds' ? ' seconds' : ' minutes')}
          </p>
          {data.format === 'duration' && (
            <p className="text-sm text-gray-600">
              {data.durationUnit === 'seconds' ? 
                `${data.y} seconds` : 
                `${Math.floor(data.y)} min ${Math.round((data.y - Math.floor(data.y)) * 100)} sec`
              }
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card data-goal-id={goalId || 'combined'}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            <CardTitle>{chartTitle}</CardTitle>
          </div>
          
          {hasData && (
            <Button
              variant={showTrendLine ? "default" : "outline"}
              size="sm"
              onClick={() => {
                const newValue = !showTrendLine;
                setShowTrendLine(newValue);
                sessionStorage.setItem(`scatterTrend_${studentId}_${goalId || 'all'}`, String(newValue));
              }}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              {showTrendLine ? "Hide" : "Show"} Trend
            </Button>
          )}
        </div>
        
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
              <ComposedChart data={scatterData} margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  type="number" 
                  dataKey="x" 
                  name="Date"
                  label={{ value: 'Date', position: 'insideBottom', offset: -10 }}
                  domain={['dataMin', 'dataMax']}
                  ticks={scatterData.map(point => point.x)}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    });
                  }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  type="number" 
                  dataKey="y" 
                  name={yAxisLabel}
                  label={{ value: yAxisLabel, angle: -90, position: 'insideLeft' }}
                  domain={yAxisConfig.reversed ? [yAxisConfig.domain[1], yAxisConfig.domain[0]] : yAxisConfig.domain}
                  ticks={yAxisConfig.reversed ? [...yAxisConfig.ticks].reverse() : yAxisConfig.ticks}
                  tickFormatter={yAxisConfig.tickFormatter}
                  allowDecimals={yAxisConfig.allowDecimals}
                />
                <Tooltip content={<CustomTooltip />} />
                
                {/* Trend Line */}
                {showTrendLine && (
                <Line
                  type="monotone"
                  dataKey="y"
                  stroke={
                    scatterData.length > 0 && scatterData[0].format === 'frequency' && scatterData[0].goal?.frequencyDirection === 'decrease'
                      ? "#DC2626" // red for decrease frequency goals
                      : scatterData.length > 0 ? scatterData[0].color : "#8884d8"
                  }
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  connectNulls={true}
                  name="Trend"
                />
                )}
                
                {/* Scatter Points */}
                <Scatter
                  name={goalId ? currentGoal?.title : "Progress"}
                  data={scatterData}
                  fill={
                    scatterData.length > 0 && scatterData[0].format === 'frequency' && scatterData[0].goal?.frequencyDirection === 'decrease'
                      ? "#DC2626" // red for decrease frequency goals
                      : scatterData.length > 0 ? scatterData[0].color : "#8884d8"
                  }
                  stroke={
                    scatterData.length > 0 && scatterData[0].format === 'frequency' && scatterData[0].goal?.frequencyDirection === 'decrease'
                      ? "#DC2626" // red for decrease frequency goals
                      : scatterData.length > 0 ? scatterData[0].color : "#8884d8"
                  }
                  strokeWidth={2}
                  r={6}
                />
              </ComposedChart>
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