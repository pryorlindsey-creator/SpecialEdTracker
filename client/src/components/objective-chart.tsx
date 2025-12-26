import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, LineChart as LineChartIcon, BarChart3, PieChart, Filter } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts";
import { format } from "date-fns";
import { filterDataPointsByPeriod, type ReportingPeriod } from "@/lib/utils";
import type { GoalProgressResponse, ObjectiveProgressResponse, DataPoint } from "@shared/schema";

interface ObjectiveChartProps {
  objectiveId: number;
  goalId: number;
  selectedPeriod?: ReportingPeriod | null;
}

type ChartType = 'line' | 'bar' | 'pie';

export default function ObjectiveChart({ objectiveId, goalId, selectedPeriod }: ObjectiveChartProps) {
  const [selectedChartType, setSelectedChartType] = useState<ChartType>(() => {
    const savedChartType = sessionStorage.getItem(`objectiveChartType_${objectiveId}`) as ChartType;
    return savedChartType || 'line';
  });

  const [supportFilter, setSupportFilter] = useState<'all' | 'split'>(() => {
    const savedSupportFilter = sessionStorage.getItem(`objectiveSupportFilter_${objectiveId}`) as 'all' | 'split';
    return savedSupportFilter || 'all';
  });

  // Save chart type preference when it changes
  useEffect(() => {
    sessionStorage.setItem(`objectiveChartType_${objectiveId}`, selectedChartType);
  }, [selectedChartType, objectiveId]);

  // Helper function to check if support levels include "independent"
  const hasIndependentSupport = (supportData: string): boolean => {
    if (!supportData || supportData === 'Not specified') return true;
    try {
      const supportLevels = JSON.parse(supportData);
      return Array.isArray(supportLevels) && supportLevels.includes('independent');
    } catch {
      return supportData === 'independent';
    }
  };

  // Get goal data to access dataCollectionType
  const { data: goalData, isLoading: goalLoading } = useQuery<GoalProgressResponse>({
    queryKey: [`/api/goals/${goalId}`],
  });

  // Get objective data
  const { data: objectiveData, isLoading: objectiveLoading } = useQuery<ObjectiveProgressResponse>({
    queryKey: [`/api/objectives/${objectiveId}/progress`],
  });

  // Get data points for this objective
  const { data: dataPointsList, isLoading: dataLoading } = useQuery<DataPoint[]>({
    queryKey: [`/api/goals/${goalId}/data-points`],
  });

  if (objectiveLoading || dataLoading || goalLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!objectiveData || !dataPointsList) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Objective Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-600">Unable to load objective data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Extract objective and goal from responses
  const objective = objectiveData.objective;
  const goal = goalData?.goal;

  // Filter data points for this specific objective
  let objectiveDataPoints = Array.isArray(dataPointsList) 
    ? dataPointsList.filter((point) => point.objectiveId === objectiveId) 
    : [];

  // Apply reporting period filtering if a specific period is selected
  if (selectedPeriod) {
    objectiveDataPoints = filterDataPointsByPeriod(objectiveDataPoints, selectedPeriod);
  }

  // Chart data type for proper typing
  interface ChartDataPoint {
    index: number;
    date: string;
    fullDate: Date | string;
    progress: number;
    originalValue: number;
    support: string;
    notes: string;
  }

  const chartData: ChartDataPoint[] = objectiveDataPoints
    .map((point, index) => ({
      index: index + 1,
      date: format(new Date(point.date), "MMM d"),
      fullDate: point.date,
      progress: parseFloat(point.progressValue.toString()),
      originalValue: parseFloat(point.progressValue.toString()),
      support: point.levelOfSupport || 'Not specified',
      notes: point.anecdotalInfo || '',
    }))
    .sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime())
    .slice(-10);

  // Split data by support level for percentage goals when support filter is 'split'
  const isPercentageGoal = goal?.dataCollectionType === 'percentage';
  const independentData = supportFilter === 'split' && isPercentageGoal
    ? chartData.filter(item => hasIndependentSupport(item.support))
    : chartData;

  const otherSupportData = supportFilter === 'split' && isPercentageGoal
    ? chartData.filter(item => !hasIndependentSupport(item.support))
    : [];

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

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  // Helper function to render charts for split view - With Support
  const renderWithSupportChart = () => {
    switch (selectedChartType) {
      case 'line':
        return (
          <LineChart data={otherSupportData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" stroke="#666" fontSize={11} />
            <YAxis domain={[0, 100]} stroke="#666" fontSize={11} tickFormatter={(value) => `${value}%`} />
            <Tooltip formatter={(value: number) => [`${value}%`, 'Progress']} labelFormatter={(label) => `Date: ${label}`} />
            <Line type="monotone" dataKey="progress" stroke="#A855F7" strokeWidth={2} dot={{ fill: "#A855F7", r: 4 }} name="With Support" />
          </LineChart>
        );
      case 'bar':
        return (
          <BarChart data={otherSupportData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" stroke="#666" fontSize={11} />
            <YAxis domain={[0, 100]} stroke="#666" fontSize={11} tickFormatter={(value) => `${value}%`} />
            <Tooltip formatter={(value: number) => [`${value}%`, 'Progress']} labelFormatter={(label) => `Date: ${label}`} />
            <Bar dataKey="progress" fill="#A855F7" radius={[4, 4, 0, 0]} />
          </BarChart>
        );
      case 'pie':
        return (
          <RechartsPieChart>
            <Pie data={otherSupportData} cx="50%" cy="50%" outerRadius={80} fill="#A855F7" dataKey="progress" label={({ date, progress }) => `${date}: ${progress}%`} />
            <Tooltip formatter={(value: number) => [`${value}%`, 'With Support']} />
          </RechartsPieChart>
        );
    }
  };

  // Helper function to render charts for split view - Independent
  const renderIndependentChart = () => {
    switch (selectedChartType) {
      case 'line':
        return (
          <LineChart data={independentData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" stroke="#666" fontSize={11} />
            <YAxis domain={[0, 100]} stroke="#666" fontSize={11} tickFormatter={(value) => `${value}%`} />
            <Tooltip formatter={(value: number) => [`${value}%`, 'Progress']} labelFormatter={(label) => `Date: ${label}`} />
            <Line type="monotone" dataKey="progress" stroke="#2563EB" strokeWidth={2} dot={{ fill: "#2563EB", r: 4 }} name="Independent" />
          </LineChart>
        );
      case 'bar':
        return (
          <BarChart data={independentData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" stroke="#666" fontSize={11} />
            <YAxis domain={[0, 100]} stroke="#666" fontSize={11} tickFormatter={(value) => `${value}%`} />
            <Tooltip formatter={(value: number) => [`${value}%`, 'Progress']} labelFormatter={(label) => `Date: ${label}`} />
            <Bar dataKey="progress" fill="#2563EB" radius={[4, 4, 0, 0]} />
          </BarChart>
        );
      case 'pie':
        return (
          <RechartsPieChart>
            <Pie data={independentData} cx="50%" cy="50%" outerRadius={80} fill="#2563EB" dataKey="progress" label={({ date, progress }) => `${date}: ${progress}%`} />
            <Tooltip formatter={(value: number) => [`${value}%`, 'Independent']} />
          </RechartsPieChart>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-lg font-semibold text-gray-900">
                Objective Progress Chart
              </CardTitle>
              {selectedPeriod && (
                <div className="flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                  <Filter className="h-3 w-3" />
                  Period {selectedPeriod.periodNumber}
                </div>
              )}
            </div>
            <p className="text-gray-600 text-sm mb-2">
              {objective?.description || 'Loading...'}
            </p>
            {objective?.targetCriteria && (
              <p className="text-sm text-blue-600 mb-2">
                <strong>Target:</strong> {objective.targetCriteria}
              </p>
            )}
            <Badge className={getStatusColor(objective?.status || 'active')}>
              {objective?.status === 'mastered' ? 'Mastered' : 
               objective?.status === 'active' ? 'Active' : 
               objective?.status === 'discontinued' ? 'Discontinued' : 
               objective?.status || 'Active'}
            </Badge>
          </div>
          
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
                <DropdownMenuItem onClick={() => setSelectedChartType('line')}>
                  <LineChartIcon className="h-4 w-4 mr-2" />
                  Line Chart
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedChartType('bar')}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Bar Chart
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedChartType('pie')}>
                  <PieChart className="h-4 w-4 mr-2" />
                  Pie Chart
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Support Level Filter Toggle - Only for percentage goals */}
            {isPercentageGoal && (
              <Button
                variant={supportFilter === 'split' ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  const newFilter = supportFilter === 'all' ? 'split' : 'all';
                  setSupportFilter(newFilter);
                  sessionStorage.setItem(`objectiveSupportFilter_${objectiveId}`, newFilter);
                }}
              >
                {supportFilter === 'all' ? 'Split by Support' : 'Show All Together'}
              </Button>
            )}
          </div>

        </div>
      </CardHeader>

      <CardContent>
        {chartData.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-600">No data points available for this objective</p>
            <p className="text-sm text-gray-500 mt-1">Add some objective-specific data points to see the progress chart</p>
          </div>
        ) : (
          <>
            {/* Chart Container - Single or Dual based on support filter */}
            {supportFilter === 'split' && isPercentageGoal ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* With Support Chart */}
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <h4 className="text-sm font-semibold text-purple-800 mb-3 text-center">
                    With Support-Data
                  </h4>
                  <div className="h-80">
                    {otherSupportData.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                        No with support data points
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        {renderWithSupportChart()}
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
                
                {/* Independent Support Chart */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-semibold text-blue-800 mb-3 text-center">
                    Independent-Data
                  </h4>
                  <div className="h-80">
                    {independentData.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                        No independent data points
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        {renderIndependentChart()}
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Single Chart Layout */
              <div className="h-80 mb-4">
                {selectedChartType === 'line' && (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#666"
                        fontSize={12}
                      />
                      <YAxis 
                        stroke="#666"
                        fontSize={12}
                        domain={[0, 100]}
                        tickFormatter={(value) => `${value}%`}
                      />
                      <Tooltip
                        formatter={(value: any, name: string) => [`${value}%`, 'Progress']}
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
                  </ResponsiveContainer>
                )}

                {selectedChartType === 'bar' && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#666"
                        fontSize={12}
                      />
                      <YAxis 
                        stroke="#666"
                        fontSize={12}
                        domain={[0, 100]}
                        tickFormatter={(value) => `${value}%`}
                      />
                      <Tooltip
                        formatter={(value: any) => [`${value}%`, 'Progress']}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      <Bar 
                        dataKey="progress" 
                        fill="#3b82f6" 
                        name="Progress"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}

                {selectedChartType === 'pie' && chartData.length > 0 && (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ date, progress }: any) => `${date}: ${progress}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="progress"
                      >
                        {chartData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => [`${value}%`, 'Progress']} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}
          </>
        )}
        
        {/* Objective Statistics */}
        {objectiveData?.currentProgress !== undefined && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{objectiveData?.dataPointsCount || 0}</p>
              <p className="text-xs text-gray-600">Data Points</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{objectiveData?.averageScore?.toFixed(0) || 0}%</p>
              <p className="text-xs text-gray-600">Average Score</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className={`text-2xl font-bold ${(objectiveData?.trend || 0) > 0 ? 'text-green-600' : (objectiveData?.trend || 0) < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {(objectiveData?.trend || 0) > 0 ? `+${objectiveData.trend.toFixed(1)}%` : (objectiveData?.trend || 0) < 0 ? `${objectiveData.trend.toFixed(1)}%` : '0%'}
              </p>
              <p className="text-xs text-gray-600">Trend</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{objectiveData?.lastScore?.toFixed(0) || 0}%</p>
              <p className="text-xs text-gray-600">Last Score</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}