import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, Search, Filter, Calendar, Target, TrendingUp, Edit } from 'lucide-react';
import { format } from 'date-fns';
import EditDataPointModal from './edit-data-point-modal';

interface RawDataTableProps {
  studentId: number;
}

interface DataPoint {
  id: number;
  goalId: number;
  goalTitle: string;
  date: string;
  progressValue: string;
  progressFormat: 'percentage' | 'frequency' | 'duration';
  numerator?: number;
  denominator?: number;
  durationUnit?: string;
  levelOfSupport?: string;
  anecdotalInfo?: string;
  createdAt: string;
}

export default function RawDataTable({ studentId }: RawDataTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGoal, setSelectedGoal] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date-desc');
  const [editingDataPoint, setEditingDataPoint] = useState<DataPoint | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch all data points for this student
  const { data: rawData, isLoading, error } = useQuery({
    queryKey: [`/api/students/${studentId}/all-data-points`],
    enabled: !!studentId,
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: 'always',
  });

  // Fetch goals for filter dropdown
  const { data: goals } = useQuery({
    queryKey: [`/api/students/${studentId}/goals`],
    enabled: !!studentId,
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: 'always',
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <p className="text-red-600">Error loading raw data: {error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!rawData || rawData.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <Table className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Data Points</h3>
            <p className="text-gray-600">
              No data points have been recorded for this student yet.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter and sort data
  let filteredData = rawData.filter((item: DataPoint) => {
    const matchesSearch = !searchTerm || 
      item.goalTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.anecdotalInfo && item.anecdotalInfo.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesGoal = selectedGoal === 'all' || item.goalId.toString() === selectedGoal;
    
    return matchesSearch && matchesGoal;
  });

  // Sort data
  filteredData = filteredData.sort((a: DataPoint, b: DataPoint) => {
    switch (sortBy) {
      case 'date-desc':
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      case 'date-asc':
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      case 'goal':
        return a.goalTitle.localeCompare(b.goalTitle);
      case 'progress-desc':
        return parseFloat(b.progressValue) - parseFloat(a.progressValue);
      case 'progress-asc':
        return parseFloat(a.progressValue) - parseFloat(b.progressValue);
      default:
        return 0;
    }
  });

  const formatProgressDisplay = (item: DataPoint) => {
    switch (item.progressFormat) {
      case 'percentage':
        if (item.numerator !== null && item.denominator !== null) {
          return `${item.numerator}/${item.denominator} (${item.progressValue}%)`;
        }
        return `${item.progressValue}%`;
      case 'frequency':
        return `${item.progressValue} occurrences`;
      case 'duration':
        return `${item.progressValue} ${item.durationUnit || 'seconds'}`;
      default:
        return item.progressValue;
    }
  };

  const formatLevelOfSupport = (levelOfSupport: string | null) => {
    if (!levelOfSupport) return 'None';
    
    try {
      const parsed = JSON.parse(levelOfSupport);
      if (Array.isArray(parsed)) {
        return parsed.map(level => {
          switch (level) {
            case 'independent': return 'Independent';
            case 'verbal-prompt': return 'Verbal Prompt';
            case 'visual-prompt': return 'Visual Prompt';
            case 'physical-prompt': return 'Physical Prompt';
            case 'full-assistance': return 'Full Assistance';
            default: return level;
          }
        }).join(', ');
      }
      return levelOfSupport;
    } catch {
      return levelOfSupport;
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Goal', 'Progress', 'Level of Support', 'Notes', 'Recorded'];
    const csvData = filteredData.map((item: DataPoint) => [
      format(new Date(item.date), 'MM/dd/yyyy'),
      item.goalTitle,
      formatProgressDisplay(item),
      formatLevelOfSupport(item.levelOfSupport),
      item.anecdotalInfo || '',
      format(new Date(item.createdAt), 'MM/dd/yyyy h:mm a')
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `student-raw-data-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Table className="h-5 w-5" />
            <span className="whitespace-nowrap">Raw Data Table</span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportToCSV}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by goal or notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={selectedGoal} onValueChange={setSelectedGoal}>
            <SelectTrigger className="w-48">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <SelectValue placeholder="Filter by goal" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Goals</SelectItem>
              {goals?.map((goal: any) => (
                <SelectItem key={goal.id} value={goal.id.toString()}>
                  {goal.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Date (Newest First)</SelectItem>
              <SelectItem value="date-asc">Date (Oldest First)</SelectItem>
              <SelectItem value="goal">Goal Name</SelectItem>
              <SelectItem value="progress-desc">Progress (High to Low)</SelectItem>
              <SelectItem value="progress-asc">Progress (Low to High)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{filteredData.length}</div>
            <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
              <Calendar className="h-4 w-4" />
              Total Data Points
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {goals?.filter((goal: any) => filteredData.some((item: DataPoint) => item.goalId === goal.id)).length || 0}
            </div>
            <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
              <Target className="h-4 w-4" />
              Goals with Data
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Goal</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Level of Support</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Recorded</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((item: DataPoint) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {format(new Date(item.date), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.goalTitle}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {formatProgressDisplay(item)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatLevelOfSupport(item.levelOfSupport)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-600 max-w-xs truncate">
                      {item.anecdotalInfo || '—'}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {format(new Date(item.createdAt), 'MMM dd, h:mm a')}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingDataPoint(item);
                        setIsEditModalOpen(true);
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredData.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-600">No data points match your current filters.</p>
          </div>
        )}
      </CardContent>

      {/* Edit Data Point Modal */}
      {editingDataPoint && (
        <EditDataPointModal
          dataPoint={editingDataPoint}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingDataPoint(null);
          }}
          onSuccess={() => {
            // Refresh the data after successful update
            queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}/all-data-points`] });
            queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}/goals`] });
            queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}`] });
            setIsEditModalOpen(false);
            setEditingDataPoint(null);
          }}
        />
      )}
    </Card>
  );
}