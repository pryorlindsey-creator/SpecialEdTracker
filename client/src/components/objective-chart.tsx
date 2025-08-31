import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Minus, LineChart as LineChartIcon, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { format } from "date-fns";

interface DataPoint {
  id: number;
  date: string;
  progressValue: string;
  progressFormat: string;
  levelOfSupport: string;
  anecdotalInfo: string;
  createdAt: string;
}

interface ObjectiveChartProps {
  objectiveId: number;
  objectiveDescription: string;
  studentId: number;
  goalId: number;
}

export default function ObjectiveChart({ objectiveId, objectiveDescription, studentId, goalId }: ObjectiveChartProps) {
  const [chartType, setChartType] = useState<"line" | "bar" | "pie">(() => {
    return (sessionStorage.getItem(`objectiveChartType_${objectiveId}`) as "line" | "bar" | "pie") || "line";
  });

  // Fetch data points for this specific objective
  const { data: dataPoints = [], isLoading } = useQuery<DataPoint[]>({
    queryKey: [`/api/objectives/${objectiveId}/data-points`],
  });

  // Update sessionStorage when chart type changes
  const handleChartTypeChange = (newType: "line" | "bar" | "pie") => {
    setChartType(newType);
    sessionStorage.setItem(`objectiveChartType_${objectiveId}`, newType);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Objective Progress Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!dataPoints || dataPoints.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Objective Progress Chart</CardTitle>
          <p className="text-sm text-gray-600">{objectiveDescription}</p>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <LineChartIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
            <p className="text-gray-600">No data points have been collected for this objective yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Process data for charts
  const chartData = dataPoints
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((point, index) => ({
      index: index + 1,
      date: format(new Date(point.date), "MMM d"),
      fullDate: point.date,
      value: parseFloat(point.progressValue),
      progressFormat: point.progressFormat,
      levelOfSupport: point.levelOfSupport,
      anecdotalInfo: point.anecdotalInfo,
    }));

  // Calculate statistics
  const latestValue = chartData[chartData.length - 1]?.value || 0;
  const previousValue = chartData[chartData.length - 2]?.value;
  const trend = previousValue !== undefined 
    ? latestValue > previousValue ? "up" 
    : latestValue < previousValue ? "down" 
    : "stable" 
    : "stable";

  const averageScore = chartData.length > 0 
    ? Math.round((chartData.reduce((sum, point) => sum + point.value, 0) / chartData.length) * 10) / 10
    : 0;

  // Data for pie chart (support levels distribution)
  const supportLevels = chartData.reduce((acc, point) => {
    try {
      const supports = JSON.parse(point.levelOfSupport || '[]');
      supports.forEach((support: string) => {
        acc[support] = (acc[support] || 0) + 1;
      });
    } catch {
      const support = point.levelOfSupport || 'Unknown';
      acc[support] = (acc[support] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(supportLevels).map(([support, count]) => ({
    name: support,
    value: count,
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  const renderChart = () => {
    switch (chartType) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 100]} />
              <Tooltip 
                formatter={(value: number) => [`${value}%`, "Progress"]}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Legend />
              <Bar dataKey="value" fill="#3B82F6" name="Progress %" />
            </BarChart>
          </ResponsiveContainer>
        );
      
      case "pie":
        return (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Support Levels Distribution</h4>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        );
      
      default: // line chart
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 100]} />
              <Tooltip 
                formatter={(value: number) => [`${value}%`, "Progress"]}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#3B82F6" 
                strokeWidth={2}
                dot={{ fill: "#3B82F6", strokeWidth: 2, r: 4 }}
                name="Progress %"
              />
            </LineChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <Card className="mb-6" data-objective-id={objectiveId}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg">Objective Progress Chart</CardTitle>
            <p className="text-sm text-gray-600 mt-1">{objectiveDescription}</p>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Latest:</span>
                <span className="text-lg font-semibold text-blue-600">{latestValue}%</span>
                {trend === "up" && <TrendingUp className="h-4 w-4 text-green-500" />}
                {trend === "down" && <TrendingDown className="h-4 w-4 text-red-500" />}
                {trend === "stable" && <Minus className="h-4 w-4 text-gray-500" />}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Average:</span>
                <span className="text-lg font-semibold text-gray-800">{averageScore}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Data Points:</span>
                <span className="text-lg font-semibold text-gray-800">{chartData.length}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={chartType} onValueChange={handleChartTypeChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line">
                  <div className="flex items-center gap-2">
                    <LineChartIcon className="h-4 w-4" />
                    Line
                  </div>
                </SelectItem>
                <SelectItem value="bar">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Bar
                  </div>
                </SelectItem>
                <SelectItem value="pie">
                  <div className="flex items-center gap-2">
                    <PieChartIcon className="h-4 w-4" />
                    Pie
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {renderChart()}
      </CardContent>
    </Card>
  );
}