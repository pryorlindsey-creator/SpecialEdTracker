import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChartLine, Download, Printer, BarChart3, PieChart } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Cell,
  Pie,
} from "recharts";
import { format } from "date-fns";

interface ObjectiveChartProps {
  objectiveId: number;
  goalId: number;
}

type ChartType = 'line' | 'pie' | 'bar';

export default function ObjectiveChart({ objectiveId, goalId }: ObjectiveChartProps) {
  const [selectedChartType, setSelectedChartType] = useState<ChartType>(() => {
    const savedChartType = sessionStorage.getItem(`objectiveChartType_${objectiveId}`) as ChartType;
    return savedChartType || 'line';
  });

  // Get objective data
  const { data: objective, isLoading: objectiveLoading } = useQuery({
    queryKey: [`/api/objectives/${objectiveId}/progress`],
  });

  // Get data points for this objective
  const { data: dataPoints, isLoading: dataLoading } = useQuery({
    queryKey: [`/api/goals/${goalId}/data-points`],
  });

  // Save chart type preference when it changes
  useEffect(() => {
    sessionStorage.setItem(`objectiveChartType_${objectiveId}`, selectedChartType);
  }, [selectedChartType, objectiveId]);

  if (objectiveLoading || dataLoading) {
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

  if (!objective || !dataPoints) {
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

  // Filter data points for this specific objective
  const objectiveDataPoints = Array.isArray(dataPoints) ? dataPoints.filter(
    (point: any) => point.objectiveId === objectiveId
  ) : [];

  const chartData = objectiveDataPoints
    .map((point: any, index: number) => ({
      index: index + 1,
      date: format(new Date(point.date), "MMM d"),
      fullDate: point.date,
      progress: parseFloat(point.progressValue.toString()),
      originalValue: parseFloat(point.progressValue.toString()),
      support: point.levelOfSupport || 'Not specified',
      notes: point.anecdotalInfo || '',
    }))
    .sort((a: any, b: any) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime())
    .slice(-10);

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

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-gray-900 mb-2">
              Objective Progress Chart
            </CardTitle>
            <p className="text-gray-600 text-sm mb-2">
              {objective?.objective?.description || 'Loading...'}
            </p>
            {objective?.objective?.targetCriteria && (
              <p className="text-sm text-blue-600 mb-2">
                <strong>Target:</strong> {objective.objective.targetCriteria}
              </p>
            )}
            <Badge className={getStatusColor(objective?.objective?.status || 'active')}>
              {objective?.objective?.status === 'mastered' ? 'Mastered' : 
               objective?.objective?.status === 'active' ? 'Active' : 
               objective?.objective?.status === 'discontinued' ? 'Discontinued' : 
               objective?.objective?.status || 'Active'}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={selectedChartType === 'line' ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedChartType('line')}
            >
              <ChartLine className="h-4 w-4" />
            </Button>
            
            <Button
              variant={selectedChartType === 'bar' ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedChartType('bar')}
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            
            <Button
              variant={selectedChartType === 'pie' ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedChartType('pie')}
            >
              <PieChart className="h-4 w-4" />
            </Button>
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
                  <Legend />
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
                  <Legend />
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

        {/* Objective Statistics */}
        {objective?.currentProgress !== undefined && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{objective?.dataPointsCount || 0}</p>
              <p className="text-xs text-gray-600">Data Points</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{objective?.averageScore?.toFixed(0) || 0}%</p>
              <p className="text-xs text-gray-600">Average Score</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className={`text-2xl font-bold ${(objective?.trend || 0) > 0 ? 'text-green-600' : (objective?.trend || 0) < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {(objective?.trend || 0) > 0 ? `+${objective.trend.toFixed(1)}%` : (objective?.trend || 0) < 0 ? `${objective.trend.toFixed(1)}%` : '0%'}
              </p>
              <p className="text-xs text-gray-600">Trend</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{objective?.lastScore?.toFixed(0) || 0}%</p>
              <p className="text-xs text-gray-600">Last Score</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}