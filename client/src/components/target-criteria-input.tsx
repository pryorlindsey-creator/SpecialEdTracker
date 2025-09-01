import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { HelpCircle, Lightbulb } from 'lucide-react';

interface TargetCriteriaInputProps {
  value: string;
  onChange: (value: string) => void;
  dataCollectionType?: string;
  placeholder?: string;
}

export default function TargetCriteriaInput({ 
  value, 
  onChange, 
  dataCollectionType = 'percentage',
  placeholder 
}: TargetCriteriaInputProps) {
  const [showTemplates, setShowTemplates] = useState(false);

  const getTemplates = () => {
    switch (dataCollectionType) {
      case 'percentage':
        return [
          '80% accuracy over 3 consecutive sessions',
          '90% accuracy for 4 consecutive trials',
          '85% accuracy across 5 sessions',
          '75% accuracy over 3 consecutive days'
        ];
      case 'frequency':
        return [
          'Reduce frequency to under 2 per hour for 3 days',
          'Increase frequency to 5 or more per session for 4 sessions',
          'Maintain frequency under 1 per day for 5 consecutive days',
          'Achieve 8 or more occurrences per session for 3 sessions'
        ];
      case 'duration':
        return [
          'Maintain attention for 10 minutes over 3 consecutive sessions',
          'Complete task within 5 minutes for 4 consecutive trials',
          'Engage for 15 minutes or longer across 3 sessions',
          'Reduce completion time to under 3 minutes for 5 trials'
        ];
      default:
        return [
          '80% accuracy over 3 consecutive sessions',
          '4 out of 5 sessions meeting criteria',
          '90% accuracy for 3 consecutive trials'
        ];
    }
  };

  const handleTemplateSelect = (template: string) => {
    onChange(template);
    setShowTemplates(false);
  };

  const getHelpText = () => {
    switch (dataCollectionType) {
      case 'percentage':
        return 'Define the percentage accuracy and how many consecutive sessions or trials are needed to demonstrate mastery.';
      case 'frequency':
        return 'Specify the target frequency (increase/decrease) and the duration needed to maintain that level.';
      case 'duration':
        return 'Set the target duration and how consistently it must be achieved for mastery.';
      default:
        return 'Define specific, measurable criteria that indicate when this goal/objective has been mastered.';
    }
  };

  const examples = getTemplates();

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || 'e.g., 80% accuracy over 3 consecutive trials'}
          className="flex-1"
        />
        
        <Popover open={showTemplates} onOpenChange={setShowTemplates}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
            >
              <Lightbulb className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-3">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Common Templates</h4>
                <p className="text-xs text-gray-600">{getHelpText()}</p>
              </div>
              
              <div className="space-y-2">
                {examples.map((template, index) => (
                  <Button
                    key={index}
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full text-left justify-start h-auto p-2 whitespace-normal"
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <div className="text-xs">{template}</div>
                  </Button>
                ))}
              </div>
              
              <div className="pt-2 border-t space-y-2">
                <h5 className="text-xs font-medium text-gray-700">Tips for Writing Criteria:</h5>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• Be specific about the percentage or level needed</li>
                  <li>• Include how many consecutive sessions/trials</li>
                  <li>• Make it measurable and observable</li>
                  <li>• Consider the student's current ability level</li>
                </ul>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0 text-gray-400 hover:text-gray-600"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72" align="end">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">What are Target Criteria?</h4>
              <p className="text-xs text-gray-600">
                Target criteria define exactly when a goal or objective is considered "mastered." 
                They should specify:
              </p>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• <strong>Performance level:</strong> What percentage, frequency, or duration</li>
                <li>• <strong>Consistency:</strong> How many consecutive sessions or trials</li>
                <li>• <strong>Context:</strong> Under what conditions or settings</li>
              </ul>
              <div className="mt-3 p-2 bg-blue-50 rounded text-xs">
                <strong>Example:</strong> "80% accuracy over 3 consecutive sessions" means the student must achieve 80% or higher performance for 3 sessions in a row to demonstrate mastery.
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      
      {value && (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Badge variant="outline" className="text-xs">
            Mastery Alert Enabled
          </Badge>
          <span>The app will notify you when this criteria is met</span>
        </div>
      )}
    </div>
  );
}