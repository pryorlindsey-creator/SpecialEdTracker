import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import { Download, Printer, LineChart as LineChartIcon, PieChart as PieChartIcon, BarChart3 } from "lucide-react";
import { format } from "date-fns";

interface GoalChartProps {
  goalId: number;
}

type ChartType = 'line' | 'pie' | 'bar';

export default function GoalChart({ goalId }: GoalChartProps) {
  const [selectedChartType, setSelectedChartType] = useState<ChartType>(() => {
    // Get chart type preference from sessionStorage
    const savedChartType = sessionStorage.getItem(`chartType_${goalId}`) as ChartType;
    return savedChartType || 'line';
  });
  
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
      notes: point.anecdotalInfo || '',
      durationUnit: point.durationUnit || '',
      numerator: point.numerator,
      denominator: point.denominator,
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

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const date = new Date(data.fullDate);
      
      // Parse level of support
      let supportLevels = [];
      try {
        if (data.support && data.support !== 'Not specified') {
          supportLevels = JSON.parse(data.support);
        }
      } catch (e) {
        supportLevels = data.support === 'Not specified' ? [] : [data.support];
      }

      // Format support levels for display
      const formatSupport = (levels: string[]) => {
        if (!levels || levels.length === 0) return 'Independent';
        return levels.map(level => {
          switch (level) {
            case 'independent': return 'Independent';
            case 'verbal-prompt': return 'Verbal Prompt';
            case 'visual-prompt': return 'Visual Prompt';
            case 'gestural-prompt': return 'Gestural Prompt';
            case 'physical-prompt': return 'Physical Prompt';
            case 'hand-over-hand': return 'Hand-over-Hand';
            default: return level;
          }
        }).join(', ');
      };

      return (
        <div className="bg-white p-4 border rounded-lg shadow-lg min-w-[250px]">
          <p className="font-semibold text-lg mb-2">{goal.title}</p>
          <div className="space-y-1 text-sm">
            <p><strong>Date:</strong> {date.toLocaleDateString('en-US', { 
              weekday: 'short', 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            })}</p>
            
            <p><strong>
              {goal.dataCollectionType === 'frequency' ? 'Count:' : 
               goal.dataCollectionType === 'duration' ? 'Duration:' : 'Progress:'}
            </strong> {yAxisConfig.tooltipFormatter(data.progress)}
            {goal.dataCollectionType === 'frequency' && ' times'}
            </p>

            {goal.dataCollectionType === 'percentage' && data.numerator !== null && data.denominator !== null && (
              <p><strong>Trials:</strong> {data.numerator} correct out of {data.denominator} attempts</p>
            )}

            <p><strong>Support Level:</strong> {formatSupport(supportLevels)}</p>
            
            {data.notes && data.notes.trim() && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <p><strong>Notes:</strong></p>
                <p className="text-gray-700 italic">{data.notes}</p>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card data-goal-id={goalId}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Progress Chart: {goal.title}
          </h3>
          <div className="flex items-center space-x-2">
            <Select
              value={selectedChartType}
              onValueChange={(value: ChartType) => {
                setSelectedChartType(value);
                sessionStorage.setItem(`chartType_${goalId}`, value);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Chart Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line">
                  <div className="flex items-center">
                    <LineChartIcon className="h-4 w-4 mr-2" />
                    Line Chart
                  </div>
                </SelectItem>
                <SelectItem value="bar">
                  <div className="flex items-center">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Bar Chart
                  </div>
                </SelectItem>
                <SelectItem value="pie">
                  <div className="flex items-center">
                    <PieChartIcon className="h-4 w-4 mr-2" />
                    Pie Chart
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
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
              {selectedChartType === 'line' && (
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
                        value: goal.dataCollectionType === 'frequency' ? 'Count' : 
                               goal.dataCollectionType === 'duration' ? 'Duration (mm:ss)' : 'Progress (%)', 
                        angle: -90, 
                        position: 'insideLeft' 
                      }}
                    />
                    <Tooltip content={<CustomTooltip />} />
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
              )}
                
              {selectedChartType === 'bar' && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={displayData}>
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
                        value: goal.dataCollectionType === 'frequency' ? 'Count' : 
                               goal.dataCollectionType === 'duration' ? 'Duration (mm:ss)' : 'Progress (%)', 
                        angle: -90, 
                        position: 'insideLeft' 
                      }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="progress"
                      fill={yAxisConfig.isReversed ? "#DC2626" : "#2563EB"}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
                
              {selectedChartType === 'pie' && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={displayData.map((item: any, index: number) => ({
                        ...item,
                        name: item.date,
                        value: item.progress,
                        fill: `hsl(${200 + (index * 30)}, 70%, 50%)`
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${yAxisConfig.tickFormatter(value)}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {displayData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={`hsl(${200 + (index * 30)}, 70%, 50%)`} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => [yAxisConfig.tickFormatter(value), goal.dataCollectionType === 'frequency' ? 'Count' : goal.dataCollectionType === 'duration' ? 'Duration' : 'Progress']} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Chart Statistics */}
            {goal.dataCollectionType === 'percentage' ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-gray-100">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {(goalProgress as any).currentProgress?.toFixed(0) || '0'}%
                  </p>
                  <p className="text-sm text-gray-600">Current Progress</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {(goalProgress as any).averageScore?.toFixed(0) || '0'}%
                  </p>
                  <p className="text-sm text-gray-600">Average Score</p>
                </div>
                <div className="text-center">
                  <p className={`text-2xl font-bold ${
                    (goalProgress as any).trend > 0 ? 'text-green-600' : 
                    (goalProgress as any).trend < 0 ? 'text-red-600' : 'text-gray-900'
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
                    {(goalProgress as any).currentProgress?.toFixed(0) || '0'}%
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
