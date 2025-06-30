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

  const { goal, dataPoints } = goalProgress;

  // Prepare chart data
  const chartData = dataPoints
    .map((point) => ({
      date: format(new Date(point.date), "MMM d"),
      fullDate: point.date,
      progress: parseFloat(point.progressValue.toString()),
      support: point.levelOfSupport || 'Not specified',
    }))
    .reverse() // Show oldest to newest
    .slice(-10); // Show last 10 data points

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
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#666"
                    fontSize={12}
                  />
                  <YAxis 
                    domain={[0, 100]}
                    stroke="#666"
                    fontSize={12}
                    tickFormatter={(value) => `${value}%`}
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
                      `${value.toFixed(1)}%`,
                      "Progress"
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
                    stroke="#2563EB"
                    strokeWidth={3}
                    dot={{ fill: '#2563EB', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: '#2563EB' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Chart Statistics */}
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
                  {goalProgress.trend > 0 ? '+' : ''}{goalProgress.trend.toFixed(1)}%
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
                <strong>Recent Performance:</strong> The student's most recent score was {goalProgress.lastScore.toFixed(0)}%, 
                with an average performance of {goalProgress.averageScore.toFixed(0)}% across all data points.
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
