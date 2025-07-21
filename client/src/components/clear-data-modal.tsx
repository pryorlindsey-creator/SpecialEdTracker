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
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const expectedText = type === "student" ? "CLEAR STUDENT" : "CLEAR ALL DATA";
  const isConfirmed = confirmText === expectedText;

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

  const handleSubmit = () => {
    if (isConfirmed) {
      clearMutation.mutate();
    }
  };

  const handleClose = () => {
    onClose();
    setConfirmText("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                {type === "student" ? "Clear Student Data" : "Clear All Data"}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600">
                This action cannot be undone
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-red-50 p-4 border border-red-200">
            <h4 className="font-medium text-red-800 mb-2">
              {type === "student" ? "Student Data to be Deleted:" : "All Data to be Deleted:"}
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

          <div className="space-y-2">
            <label className="text-sm font-medium">
              To confirm, type <span className="font-bold text-red-600">{expectedText}</span> below:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder={expectedText}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={clearMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!isConfirmed || clearMutation.isPending}
            className="min-w-[120px]"
          >
            {clearMutation.isPending ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Clearing...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Clear Data
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}