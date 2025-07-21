import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ClearDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "student" | "all";
  studentId?: number;
  studentName?: string;
}

export function ClearDataModal({ isOpen, onClose, type, studentId, studentName }: ClearDataModalProps) {
  const [confirmText, setConfirmText] = useState("");
  const [currentStep, setCurrentStep] = useState(1);
  const [finalConfirmation, setFinalConfirmation] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const expectedText = type === "student" ? "CLEAR STUDENT" : "CLEAR ALL DATA";
  const isTextConfirmed = confirmText === expectedText;
  const isReadyForFinalStep = currentStep === 3 && isTextConfirmed && finalConfirmation;

  const clearMutation = useMutation({
    mutationFn: async () => {
      if (type === "student" && studentId) {
        await apiRequest(`/api/students/${studentId}/clear-data`, {
          method: "DELETE"
        });
      } else {
        await apiRequest("/api/users/clear-all-data", {
          method: "DELETE"
        });
      }
    },
    onSuccess: () => {
      // Invalidate relevant caches
      if (type === "student") {
        queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}/goals`] });
        queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}/all-data-points`] });
        queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}/objectives`] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/students"] });
        queryClient.invalidateQueries({ queryKey: ["/api/reporting-periods"] });
      }
      
      toast({
        title: "Data Cleared",
        description: type === "student" 
          ? `All data for ${studentName} has been cleared.`
          : "All students and data have been cleared from your caseload.",
        variant: "default",
      });
      
      onClose();
      setConfirmText("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to clear data: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSubmit = () => {
    if (isReadyForFinalStep) {
      clearMutation.mutate();
    }
  };

  const handleClose = () => {
    onClose();
    setConfirmText("");
    setCurrentStep(1);
    setFinalConfirmation(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg font-semibold">
                {type === "student" ? "Clear Student Data" : "Clear All Data"} - Step {currentStep} of 3
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600">
                Multiple confirmations required - This action cannot be undone
              </DialogDescription>
            </div>
            <div className="flex space-x-1">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`w-3 h-3 rounded-full ${
                    step <= currentStep 
                      ? 'bg-red-500' 
                      : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step 1: Warning */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="rounded-lg bg-red-50 p-4 border border-red-200">
                <h4 className="font-medium text-red-800 mb-2">
                  ⚠️ WARNING: This is a PERMANENT action
                </h4>
                <p className="text-sm text-red-700">
                  {type === "student" 
                    ? `You are about to permanently delete ALL data for ${studentName}. This includes goals, objectives, and all progress tracking data.`
                    : "You are about to permanently delete YOUR ENTIRE CASELOAD. This includes all students, goals, objectives, progress data, and reporting periods."
                  }
                </p>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-2">Important considerations:</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• This action cannot be undone</li>
                  <li>• Data cannot be recovered after deletion</li>
                  <li>• Consider exporting reports before proceeding</li>
                  {type === "all" && <li>• You will lose all your teaching portfolio data</li>}
                </ul>
              </div>
            </div>
          )}

          {/* Step 2: Data Review */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="rounded-lg bg-red-50 p-4 border border-red-200">
                <h4 className="font-medium text-red-800 mb-2">
                  Data that will be PERMANENTLY DELETED:
                </h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {type === "student" ? (
                    <>
                      <li>• All goals for {studentName}</li>
                      <li>• All objectives for {studentName}</li>
                      <li>• All progress data points for {studentName}</li>
                      <li>• The student will remain in your caseload</li>
                    </>
                  ) : (
                    <>
                      <li>• All students in your caseload</li>
                      <li>• All goals and objectives</li>
                      <li>• All progress data points</li>
                      <li>• All reporting periods</li>
                      <li>• Your entire teaching portfolio</li>
                    </>
                  )}
                </ul>
              </div>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  Are you absolutely certain you want to proceed with this permanent deletion?
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Final Confirmation */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="rounded-lg bg-red-100 p-4 border-2 border-red-300">
                <h4 className="font-bold text-red-900 mb-2">
                  🚨 FINAL CONFIRMATION REQUIRED
                </h4>
                <p className="text-sm text-red-800 mb-3">
                  This is your last chance to cancel. Once you proceed, all data will be permanently lost.
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Type <span className="font-bold text-red-600">{expectedText}</span> to continue:
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder={expectedText}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="finalConfirm"
                    checked={finalConfirmation}
                    onChange={(e) => setFinalConfirmation(e.target.checked)}
                    className="w-4 h-4 text-red-600 border-red-300 rounded focus:ring-red-500"
                  />
                  <label htmlFor="finalConfirm" className="text-sm text-gray-700">
                    I understand this action is permanent and cannot be undone
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={clearMutation.isPending}
          >
            Cancel
          </Button>
          
          {currentStep < 3 ? (
            <Button
              variant="outline"
              onClick={handleNext}
              disabled={clearMutation.isPending}
              className="bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100"
            >
              Continue
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={handleSubmit}
              disabled={!isReadyForFinalStep || clearMutation.isPending}
              className="min-w-[140px]"
            >
              {clearMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Clearing...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  PERMANENTLY DELETE
                </div>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}