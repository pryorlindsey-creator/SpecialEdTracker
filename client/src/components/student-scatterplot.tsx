import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Line, ComposedChart, LineChart, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TrendingUp, Calendar, ChevronDown, LineChart as LineChartIcon, BarChart3, PieChart, Filter } from "lucide-react";
import { format } from "date-fns";
import { filterDataPointsByPeriod, type ReportingPeriod } from "@/lib/utils";

interface StudentScatterplotProps {
  studentId: number;
  goalId?: number; // Optional: if provided, show only this goal's data
  selectedPeriod?: ReportingPeriod | null; // Optional: if provided, filter data by specific reporting period
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

type ChartType = 'line' | 'bar' | 'pie';

export default function StudentScatterplot({ studentId, goalId, selectedPeriod }: StudentScatterplotProps) {
  const [showTrendLine, setShowTrendLine] = useState(() => {
    // Get trend line preference from sessionStorage
    const savedTrendPref = sessionStorage.getItem(`scatterTrend_${studentId}_${goalId || 'all'}`);
    return savedTrendPref ? savedTrendPref === 'true' : true; // Default to true
  });

  const [selectedChartType, setSelectedChartType] = useState<ChartType>(() => {
    const savedChartType = sessionStorage.getItem(`goalChartType_${goalId || 'all'}_${studentId}`) as ChartType;
    // If saved type is scatter, default to line instead since scatter is removed
    return (savedChartType && savedChartType !== 'scatter') ? savedChartType : 'line';
  });

  const [supportFilter, setSupportFilter] = useState<'all' | 'split'>(() => {
    const savedSupportFilter = sessionStorage.getItem(`supportFilter_${goalId || 'all'}_${studentId}`) as 'all' | 'split';
    return savedSupportFilter || 'all';
  });


  // Save chart type preference when it changes
  const handleChartTypeChange = (chartType: ChartType) => {
    setSelectedChartType(chartType);
    sessionStorage.setItem(`goalChartType_${goalId || 'all'}_${studentId}`, chartType);
  };

  const getChartIcon = (chartType: ChartType) => {
    switch (chartType) {
      case 'line':
        return <LineChartIcon className="h-4 w-4" />;
      case 'bar':
        return <BarChart3 className="h-4 w-4" />;
      case 'pie':
        return <PieChart className="h-4 w-4" />;
      default:
        return <LineChartIcon className="h-4 w-4" />;
    }
  };

  const getChartLabel = (chartType: ChartType) => {
    switch (chartType) {
      case 'line':
        return 'Line Chart';
      case 'bar':
        return 'Bar Chart';
      case 'pie':
        return 'Pie Chart';
      default:
        return 'Line Chart';
    }
  };
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
  let filteredDataPoints = goalId 
    ? allDataPoints?.filter((dp: DataPoint) => dp.goalId === goalId) || []
    : allDataPoints || [];

  // Apply reporting period filtering if a specific period is selected
  if (selectedPeriod) {
    filteredDataPoints = filterDataPointsByPeriod(filteredDataPoints, selectedPeriod);
  }

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
        levelOfSupport: fullDataPoint?.levelOfSupport || dp.levelOfSupport || '[]',
      };
    })
    .sort((a, b) => a.x - b.x);

  // Get the current goal information for title
  const currentGoal = goalId ? goals?.find(g => g.id === goalId) : null;
  const chartTitle = goalId && currentGoal 
    ? `${currentGoal.title} Progress Chart`
    : "Progress Scatterplot";
  
  // Reset support filter when switching to non-percentage goals
  useEffect(() => {
    if (goalId && currentGoal && currentGoal.dataCollectionType !== 'percentage' && supportFilter === 'split') {
      setSupportFilter('all');
      sessionStorage.setItem(`supportFilter_${goalId}_${studentId}`, 'all');
    }
  }, [goalId, currentGoal, supportFilter, studentId]);
  
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
    reversed: false,
    formatType: 'default' as 'default' | 'frequency' | 'duration' | 'percentage'
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
        reversed: goal?.frequencyDirection === 'decrease',
        formatType: 'frequency' as const
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
        reversed: false,
        formatType: 'duration' as const
      };
    } else {
      // Percentage type - use default 0-100 with even ticks
      yAxisConfig = {
        domain: [0, 100] as [number, number],
        ticks: [0, 20, 40, 60, 80, 100],
        tickFormatter: (value: number) => `${value}%`,
        allowDecimals: true,
        reversed: false,
        formatType: 'percentage' as const
      };
    }
  }

  // Helper function to check if support level includes 'independent'
  const isIndependentSupport = (levelOfSupport: string): boolean => {
    try {
      const supportArray = JSON.parse(levelOfSupport || '[]');
      if (Array.isArray(supportArray)) {
        return supportArray.length === 0 || supportArray.some(level => 
          level.toLowerCase().includes('independent')
        );
      }
      return false;
    } catch {
      return false;
    }
  };

  // Filter data based on support level for split mode
  const independentData = supportFilter === 'split' 
    ? scatterData.filter(point => isIndependentSupport(point.levelOfSupport))
    : scatterData;
    
  const otherSupportData = supportFilter === 'split'
    ? scatterData.filter(point => !isIndependentSupport(point.levelOfSupport))
    : [];

  const hasData = scatterData.length > 0;
  
  // Determine if we should show percentage units
  const isPercentageFormat = scatterData.length > 0 && scatterData[0].format === 'percentage';

  // Prepare data for different chart types
  const prepareChartData = (data: any[]) => data.map((point: any) => ({
    date: new Date(point.x).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    progress: point.y,
    originalValue: point.originalValue,
    goalTitle: point.goalTitle,
    color: point.color,
  }));

  const lineBarData = prepareChartData(scatterData);
  const independentLineBarData = prepareChartData(independentData);
  const otherSupportLineBarData = prepareChartData(otherSupportData);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

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
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5" />
              <CardTitle>{chartTitle}</CardTitle>
              {selectedPeriod && (
                <div className="flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                  <Filter className="h-3 w-3" />
                  Period {selectedPeriod.periodNumber}
                </div>
              )}
            </div>
            {goalId && currentGoal && (
              <div className="space-y-1">
                <p className="text-sm text-gray-600">
                  <strong>Goal:</strong> {currentGoal.title}
                </p>
                {currentGoal.targetCriteria && (
                  <p className="text-sm text-blue-600">
                    <strong>Target:</strong> {currentGoal.targetCriteria}
                  </p>
                )}
              </div>
            )}
          </div>
          
          {hasData && (
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    {getChartIcon(selectedChartType)}
                    {getChartLabel(selectedChartType)}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleChartTypeChange('line')}>
                    <LineChartIcon className="h-4 w-4 mr-2" />
                    Line Chart
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleChartTypeChange('bar')}>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Bar Chart
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleChartTypeChange('pie')}>
                    <PieChart className="h-4 w-4 mr-2" />
                    Pie Chart
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* Support Level Filter for Percentage Goals Only */}
              {goalId && currentGoal && currentGoal.dataCollectionType === 'percentage' && (
                <Button
                  variant={supportFilter === 'split' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    const newFilter = supportFilter === 'split' ? 'all' : 'split';
                    setSupportFilter(newFilter);
                    sessionStorage.setItem(`supportFilter_${goalId || 'all'}_${studentId}`, newFilter);
                  }}
                  className="flex items-center gap-2"
                  data-testid="split-by-support-btn"
                >
                  {supportFilter === 'split' ? 'Show All Together' : 'Split by Support'}
                </Button>
              )}
            </div>
          )}
        </div>
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
        ) : supportFilter === 'split' && goalId && currentGoal && currentGoal.dataCollectionType === 'percentage' ? (
          /* Dual Chart Layout */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Other Support Chart */}
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <h4 className="text-sm font-semibold text-purple-800 mb-3 text-center">
                With Support-Data
              </h4>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  {selectedChartType === 'line' && (
                    <LineChart data={otherSupportLineBarData} margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        domain={yAxisConfig.reversed ? [yAxisConfig.domain[1], yAxisConfig.domain[0]] : yAxisConfig.domain}
                        ticks={yAxisConfig.reversed ? [...yAxisConfig.ticks].reverse() : yAxisConfig.ticks}
                        tickFormatter={yAxisConfig.tickFormatter}
                        allowDecimals={yAxisConfig.allowDecimals}
                      />
                      <Tooltip 
                        formatter={(value: any, name: string) => [`${value}${yAxisConfig.formatType === 'percentage' ? '%' : ''}`, 'Progress']}
                        labelFormatter={(label) => `Date: ${label}`}
                      />

                      <Line 
                        type="monotone" 
                        dataKey="progress" 
                        stroke="#A855F7" 
                        strokeWidth={2}
                        dot={{ fill: '#A855F7', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6 }}
                        name="Other Support"
                      />
                    </LineChart>
                  )}

                  {selectedChartType === 'bar' && (
                    <BarChart data={otherSupportLineBarData} margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        domain={yAxisConfig.reversed ? [yAxisConfig.domain[1], yAxisConfig.domain[0]] : yAxisConfig.domain}
                        ticks={yAxisConfig.reversed ? [...yAxisConfig.ticks].reverse() : yAxisConfig.ticks}
                        tickFormatter={yAxisConfig.tickFormatter}
                        allowDecimals={yAxisConfig.allowDecimals}
                      />
                      <Tooltip 
                        formatter={(value: any, name: string) => [`${value}${yAxisConfig.formatType === 'percentage' ? '%' : ''}`, 'Progress']}
                        labelFormatter={(label) => `Date: ${label}`}
                      />

                      <Bar 
                        dataKey="progress" 
                        fill="#A855F7" 
                        name="Other Support"
                      />
                    </BarChart>
                  )}

                  {selectedChartType === 'pie' && otherSupportLineBarData.length > 0 && (
                    <RechartsPieChart>
                      <Pie
                        data={otherSupportLineBarData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ date, progress }: any) => `${date}: ${progress}${isPercentageFormat ? '%' : ''}`}
                        outerRadius={80}
                        fill="#A855F7"
                        dataKey="progress"
                      >
                        {otherSupportLineBarData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill="#A855F7" />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => [`${value}${isPercentageFormat ? '%' : ''}`, 'Progress']} />
                    </RechartsPieChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            {/* Independent Support Chart */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="text-sm font-semibold text-blue-800 mb-3 text-center">
                Independent-Data
              </h4>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  {selectedChartType === 'line' && (
                    <LineChart data={independentLineBarData} margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        domain={yAxisConfig.reversed ? [yAxisConfig.domain[1], yAxisConfig.domain[0]] : yAxisConfig.domain}
                        ticks={yAxisConfig.reversed ? [...yAxisConfig.ticks].reverse() : yAxisConfig.ticks}
                        tickFormatter={yAxisConfig.tickFormatter}
                        allowDecimals={yAxisConfig.allowDecimals}
                      />
                      <Tooltip 
                        formatter={(value: any, name: string) => [`${value}${yAxisConfig.formatType === 'percentage' ? '%' : ''}`, 'Progress']}
                        labelFormatter={(label) => `Date: ${label}`}
                      />

                      <Line 
                        type="monotone" 
                        dataKey="progress" 
                        stroke="#2563EB" 
                        strokeWidth={2}
                        dot={{ fill: '#2563EB', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6 }}
                        name="Independent"
                      />
                    </LineChart>
                  )}

                  {selectedChartType === 'bar' && (
                    <BarChart data={independentLineBarData} margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        domain={yAxisConfig.reversed ? [yAxisConfig.domain[1], yAxisConfig.domain[0]] : yAxisConfig.domain}
                        ticks={yAxisConfig.reversed ? [...yAxisConfig.ticks].reverse() : yAxisConfig.ticks}
                        tickFormatter={yAxisConfig.tickFormatter}
                        allowDecimals={yAxisConfig.allowDecimals}
                      />
                      <Tooltip 
                        formatter={(value: any, name: string) => [`${value}${yAxisConfig.formatType === 'percentage' ? '%' : ''}`, 'Progress']}
                        labelFormatter={(label) => `Date: ${label}`}
                      />

                      <Bar 
                        dataKey="progress" 
                        fill="#2563EB" 
                        name="Independent"
                      />
                    </BarChart>
                  )}

                  {selectedChartType === 'pie' && independentLineBarData.length > 0 && (
                    <RechartsPieChart>
                      <Pie
                        data={independentLineBarData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ date, progress }: any) => `${date}: ${progress}${isPercentageFormat ? '%' : ''}`}
                        outerRadius={80}
                        fill="#2563EB"
                        dataKey="progress"
                      >
                        {independentLineBarData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill="#2563EB" />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => [`${value}${isPercentageFormat ? '%' : ''}`, 'Progress']} />
                    </RechartsPieChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : (
          /* Single Chart Layout */
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              {selectedChartType === 'line' && (
                <LineChart data={lineBarData} margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    domain={yAxisConfig.reversed ? [yAxisConfig.domain[1], yAxisConfig.domain[0]] : yAxisConfig.domain}
                    ticks={yAxisConfig.reversed ? [...yAxisConfig.ticks].reverse() : yAxisConfig.ticks}
                    tickFormatter={yAxisConfig.tickFormatter}
                    allowDecimals={yAxisConfig.allowDecimals}
                  />
                  <Tooltip 
                    formatter={(value: any, name: string) => [`${value}${isPercentageFormat ? '%' : ''}`, 'Progress']}
                    labelFormatter={(label) => `Date: ${label}`}
                  />

                  <Line 
                    type="monotone" 
                    dataKey="progress" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Progress"
                  />
                </LineChart>
              )}

              {selectedChartType === 'bar' && (
                <BarChart data={lineBarData} margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    domain={yAxisConfig.reversed ? [yAxisConfig.domain[1], yAxisConfig.domain[0]] : yAxisConfig.domain}
                    ticks={yAxisConfig.reversed ? [...yAxisConfig.ticks].reverse() : yAxisConfig.ticks}
                    tickFormatter={yAxisConfig.tickFormatter}
                    allowDecimals={yAxisConfig.allowDecimals}
                  />
                  <Tooltip 
                    formatter={(value: any, name: string) => [`${value}${isPercentageFormat ? '%' : ''}`, 'Progress']}
                    labelFormatter={(label) => `Date: ${label}`}
                  />

                  <Bar 
                    dataKey="progress" 
                    fill="#3b82f6" 
                    name="Progress"
                  />
                </BarChart>
              )}

              {selectedChartType === 'pie' && lineBarData.length > 0 && (
                <RechartsPieChart>
                  <Pie
                    data={lineBarData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ date, progress }: any) => `${date}: ${progress}${isPercentageFormat ? '%' : ''}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="progress"
                  >
                    {lineBarData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [`${value}${isPercentageFormat ? '%' : ''}`, 'Progress']} />
                </RechartsPieChart>
              )}
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