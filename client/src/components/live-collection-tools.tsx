import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Timer, Plus, Minus, Save, RotateCcw, Clock, Hash, Percent } from "lucide-react";
import { format } from "date-fns";

interface LiveCollectionToolsProps {
  goalId: number;
  studentId: number;
  goals: any[];
  onDataCollected: () => void;
}

export default function LiveCollectionTools({ goalId, studentId, goals, onDataCollected }: LiveCollectionToolsProps) {
  const { toast } = useToast();
  const [isCollecting, setIsCollecting] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [currentTimer, setCurrentTimer] = useState(0); // in seconds
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Data collection states
  const [frequencyCount, setFrequencyCount] = useState(0);
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [percentageTrials, setPercentageTrials] = useState({ correct: 0, total: 0 });
  const [notes, setNotes] = useState("");
  const [levelOfSupport, setLevelOfSupport] = useState<string[]>([]);

  const selectedGoal = goals.find(g => g.id === goalId);
  const dataType = selectedGoal?.dataCollectionType || 'percentage';

  // Timer functionality
  useEffect(() => {
    if (isCollecting && sessionStartTime) {
      timerRef.current = setInterval(() => {
        const totalSeconds = Math.floor((Date.now() - sessionStartTime.getTime()) / 1000);
        setCurrentTimer(totalSeconds);
        
        // For duration goals, update the duration display in real-time
        if (dataType === 'duration') {
          setDurationMinutes(Math.floor(totalSeconds / 60));
          setDurationSeconds(totalSeconds % 60);
        }
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isCollecting, sessionStartTime, dataType]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startSession = () => {
    setIsCollecting(true);
    setSessionStartTime(new Date());
    setCurrentTimer(0);
    setFrequencyCount(0);
    setDurationMinutes(0);
    setDurationSeconds(0);
    setPercentageTrials({ correct: 0, total: 0 });
    setNotes("");
    toast({
      title: "Session Started",
      description: "Live data collection session is now active.",
    });
  };

  const stopSession = () => {
    setIsCollecting(false);
    setSessionStartTime(null);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    toast({
      title: "Session Stopped",
      description: "Data collection session has ended.",
    });
  };

  const resetSession = () => {
    stopSession();
    setCurrentTimer(0);
    setFrequencyCount(0);
    setDurationMinutes(0);
    setDurationSeconds(0);
    setPercentageTrials({ correct: 0, total: 0 });
    setNotes("");
    setLevelOfSupport([]);
    toast({
      title: "Session Reset",
      description: "All data has been cleared.",
    });
  };

  const incrementFrequency = () => {
    setFrequencyCount(prev => prev + 1);
  };

  const decrementFrequency = () => {
    setFrequencyCount(prev => Math.max(0, prev - 1));
  };

  const addTrial = (isCorrect: boolean) => {
    setPercentageTrials(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1
    }));
  };

  const removeTrial = () => {
    setPercentageTrials(prev => ({
      correct: Math.max(0, prev.correct - 1),
      total: Math.max(0, prev.total - 1)
    }));
  };

  const saveData = async () => {
    try {
      let progressValue: string;
      let progressFormat: string;
      let numerator: number | null = null;
      let denominator: number | null = null;
      let durationUnit: string = 'minutes';

      switch (dataType) {
        case 'frequency':
          progressValue = frequencyCount.toString();
          progressFormat = 'frequency';
          break;
        case 'duration':
          const totalSeconds = (durationMinutes * 60) + durationSeconds;
          progressValue = (totalSeconds / 60).toFixed(2); // Convert to minutes with decimals
          progressFormat = 'duration';
          durationUnit = 'minutes';
          break;
        case 'percentage':
          if (percentageTrials.total === 0) {
            toast({
              title: "Error",
              description: "Please add at least one trial before saving.",
              variant: "destructive",
            });
            return;
          }
          const percentage = (percentageTrials.correct / percentageTrials.total) * 100;
          progressValue = percentage.toFixed(2);
          progressFormat = 'percentage';
          numerator = percentageTrials.correct;
          denominator = percentageTrials.total;
          break;
        default:
          progressValue = '0';
          progressFormat = 'percentage';
      }

      const dataPoint = {
        goalId,
        date: format(new Date(), 'yyyy-MM-dd'),
        progressFormat,
        progressValue: parseFloat(progressValue),
        numerator,
        denominator,
        durationUnit,
        levelOfSupport,
        anecdotalInfo: notes || `Live collection session: ${formatTime(currentTimer)}`
      };

      await apiRequest('POST', `/api/goals/${goalId}/data-points`, dataPoint);

      toast({
        title: "Data Saved!",
        description: `Successfully recorded ${dataType} data for ${selectedGoal?.title}.`,
      });

      onDataCollected();
      resetSession();
    } catch (error) {
      console.error('Error saving data:', error);
      toast({
        title: "Error",
        description: "Failed to save data. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Session Timer - Only show for frequency and percentage goals */}
      {dataType !== 'duration' && (
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-blue-900">
              <Clock className="h-5 w-5 mr-2" />
              Live Collection Session - {selectedGoal?.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-900 mb-1">
                  {formatTime(currentTimer)}
                </div>
                <div className="text-sm text-blue-700">Session Duration</div>
              </div>
              <div className="flex space-x-2">
                {!isCollecting ? (
                  <Button onClick={startSession} className="bg-green-600 hover:bg-green-700">
                    <Timer className="h-4 w-4 mr-2" />
                    Start Session
                  </Button>
                ) : (
                  <Button onClick={stopSession} variant="destructive">
                    <Timer className="h-4 w-4 mr-2" />
                    Stop Session
                  </Button>
                )}
                <Button onClick={resetSession} variant="outline">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Duration Goal Header - Show for duration goals only */}
      {dataType === 'duration' && (
        <Card className="border-2 border-green-200 bg-green-50">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-green-900">
              <Timer className="h-5 w-5 mr-2" />
              Duration Collection - {selectedGoal?.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-green-800">Use the duration tracker below to record the time for this goal. Click "Save Data Point" when finished.</p>
          </CardContent>
        </Card>
      )}

      {/* Data Collection Tools */}
      {dataType === 'frequency' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Hash className="h-5 w-5 mr-2" />
              Frequency Counter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-6">
              <div className="text-6xl font-bold text-blue-600 mb-2">
                {frequencyCount}
              </div>
              <div className="text-lg text-gray-600">Occurrences</div>
            </div>
            <div className="flex justify-center space-x-4">
              <Button 
                size="lg" 
                onClick={incrementFrequency}
                className="h-16 w-16 rounded-full text-2xl"
                disabled={!isCollecting}
              >
                <Plus className="h-8 w-8" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={decrementFrequency}
                className="h-16 w-16 rounded-full text-2xl"
                disabled={!isCollecting || frequencyCount === 0}
              >
                <Minus className="h-8 w-8" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {dataType === 'duration' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Timer className="h-5 w-5 mr-2" />
              Duration Tracker
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-6">
              <div className="text-6xl font-bold text-green-600 mb-2">
                {Math.floor((durationMinutes * 60 + durationSeconds) / 60)}:{((durationMinutes * 60 + durationSeconds) % 60).toString().padStart(2, '0')}
              </div>
              <div className="text-lg text-gray-600">Duration Timer</div>
            </div>
            <div className="flex justify-center space-x-4">
              {!isCollecting ? (
                <Button 
                  onClick={() => {
                    setIsCollecting(true);
                    setSessionStartTime(new Date());
                    setDurationMinutes(0);
                    setDurationSeconds(0);
                    toast({
                      title: "Duration Timer Started",
                      description: "Timing the duration for this goal.",
                    });
                  }}
                  className="bg-green-600 hover:bg-green-700 h-16 px-8"
                >
                  <Timer className="h-5 w-5 mr-2" />
                  Start Timer
                </Button>
              ) : (
                <Button 
                  onClick={() => {
                    setIsCollecting(false);
                    const totalSeconds = Math.floor((Date.now() - (sessionStartTime?.getTime() || 0)) / 1000);
                    setDurationMinutes(Math.floor(totalSeconds / 60));
                    setDurationSeconds(totalSeconds % 60);
                    if (timerRef.current) {
                      clearInterval(timerRef.current);
                    }
                    toast({
                      title: "Duration Timer Stopped",
                      description: `Recorded ${Math.floor(totalSeconds / 60)}m ${totalSeconds % 60}s`,
                    });
                  }}
                  variant="destructive" 
                  className="h-16 px-8"
                >
                  <Timer className="h-5 w-5 mr-2" />
                  Stop Timer
                </Button>
              )}
              <Button 
                onClick={() => {
                  setIsCollecting(false);
                  setSessionStartTime(null);
                  setDurationMinutes(0);
                  setDurationSeconds(0);
                  setCurrentTimer(0);
                  if (timerRef.current) {
                    clearInterval(timerRef.current);
                  }
                  toast({
                    title: "Timer Reset",
                    description: "Duration timer has been reset to 0:00",
                  });
                }}
                variant="outline" 
                className="h-16 px-8"
              >
                <RotateCcw className="h-5 w-5 mr-2" />
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {dataType === 'percentage' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Percent className="h-5 w-5 mr-2" />
              Trial Counter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-6">
              <div className="text-4xl font-bold text-purple-600 mb-2">
                {percentageTrials.total > 0 ? 
                  Math.round((percentageTrials.correct / percentageTrials.total) * 100) : 0}%
              </div>
              <div className="text-lg text-gray-600">
                {percentageTrials.correct} / {percentageTrials.total} correct
              </div>
            </div>
            <div className="flex justify-center space-x-4 mb-4">
              <Button 
                size="lg" 
                onClick={() => addTrial(true)}
                className="bg-green-600 hover:bg-green-700 h-16 px-8"
                disabled={!isCollecting}
              >
                ✓ Correct
              </Button>
              <Button 
                size="lg" 
                onClick={() => addTrial(false)}
                className="bg-red-600 hover:bg-red-700 h-16 px-8"
                disabled={!isCollecting}
              >
                ✗ Incorrect
              </Button>
            </div>
            <div className="text-center">
              <Button 
                variant="outline" 
                size="sm"
                onClick={removeTrial}
                disabled={!isCollecting || percentageTrials.total === 0}
              >
                Remove Last Trial
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Level of Support & Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Session Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Level of Support</Label>
            <Select 
              onValueChange={(value) => {
                if (!levelOfSupport.includes(value)) {
                  setLevelOfSupport([...levelOfSupport, value]);
                }
              }}
              disabled={dataType !== 'duration' && !isCollecting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Add support level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="independent">Independent</SelectItem>
                <SelectItem value="verbal-prompt">Verbal Prompt</SelectItem>
                <SelectItem value="visual-prompt">Visual Prompt</SelectItem>
                <SelectItem value="gestural-prompt">Gestural Prompt</SelectItem>
                <SelectItem value="physical-prompt">Physical Prompt</SelectItem>
                <SelectItem value="hand-over-hand">Hand Over Hand</SelectItem>
              </SelectContent>
            </Select>
            {levelOfSupport.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {levelOfSupport.map((support, index) => (
                  <div key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm flex items-center">
                    {support.replace('-', ' ')}
                    <button 
                      onClick={() => setLevelOfSupport(levelOfSupport.filter((_, i) => i !== index))}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div>
            <Label>Session Notes</Label>
            <Textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this observation session..."
              className="mt-1"
              disabled={dataType !== 'duration' && !isCollecting}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="text-center">
        <Button 
          size="lg" 
          onClick={saveData}
          disabled={(dataType !== 'duration' && isCollecting) || (dataType === 'frequency' && frequencyCount === 0) || (dataType === 'duration' && durationMinutes === 0 && durationSeconds === 0)}
          className="bg-blue-600 hover:bg-blue-700 px-8"
        >
          <Save className="h-5 w-5 mr-2" />
          Save Data Point
        </Button>
        {isCollecting && dataType !== 'duration' && (
          <p className="text-sm text-gray-600 mt-2">
            Stop the session to save your data
          </p>
        )}
        {(dataType === 'duration' || !isCollecting) && (
          <p className="text-sm text-gray-600 mt-2">
            {dataType === 'frequency' && frequencyCount === 0 && "Add at least one occurrence to save"}
            {dataType === 'duration' && durationMinutes === 0 && durationSeconds === 0 && "Set duration time to save"}
            {dataType === 'percentage' && percentageTrials.total === 0 && "Add at least one trial to save"}
            {dataType === 'frequency' && frequencyCount > 0 && "Ready to save frequency data"}
            {dataType === 'duration' && (durationMinutes > 0 || durationSeconds > 0) && "Ready to save duration data"}
            {dataType === 'percentage' && percentageTrials.total > 0 && "Ready to save percentage data"}
          </p>
        )}
      </div>
    </div>
  );
}