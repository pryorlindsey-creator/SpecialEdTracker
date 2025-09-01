import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Check, X } from "lucide-react";

const RELATED_SERVICES_OPTIONS = [
  "None",
  "Speech-Language Therapy",
  "Physical Therapy", 
  "Occupational Therapy",
  "Nursing",
  "Hearing",
  "Vision"
];

const addStudentSchema = z.object({
  name: z.string().min(1, "Student name is required"),
  grade: z.string().optional(),
  iepDueDate: z.string().optional(),
  relatedServices: z.array(z.string()).optional(),
});

type AddStudentFormData = z.infer<typeof addStudentSchema>;

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AddStudentModal({ isOpen, onClose, onSuccess }: AddStudentModalProps) {
  const { toast } = useToast();
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const form = useForm<AddStudentFormData>({
    resolver: zodResolver(addStudentSchema),
    defaultValues: {
      name: "",
      grade: "",
      iepDueDate: "",
      relatedServices: [],
    },
  });

  const addStudentMutation = useMutation({
    mutationFn: async (data: AddStudentFormData) => {
      // Convert array of services to comma-separated string for backend
      const formattedData = {
        ...data,
        relatedServices: data.relatedServices?.join(", ") || "",
      };
      console.log("Frontend: Sending student data:", formattedData);
      await apiRequest("POST", "/api/students", formattedData);
    },
    onSuccess: () => {
      // Invalidate the students cache to refresh the dashboard
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      
      toast({
        title: "Success",
        description: "Student added successfully!",
      });
      form.reset();
      setSelectedServices([]);
      onSuccess?.();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      toast({
        title: "Error",
        description: "Failed to add student. Please try again.",
        variant: "destructive",
      });
      console.error("Error adding student:", error);
    },
  });

  const onSubmit = (data: AddStudentFormData) => {
    addStudentMutation.mutate(data);
  };

  const handleClose = () => {
    form.reset();
    setSelectedServices([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Student</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Student Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter student name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="grade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Grade Level</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select grade..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="PreK">Pre-K</SelectItem>
                      <SelectItem value="K">Kindergarten</SelectItem>
                      <SelectItem value="1">1st Grade</SelectItem>
                      <SelectItem value="2">2nd Grade</SelectItem>
                      <SelectItem value="3">3rd Grade</SelectItem>
                      <SelectItem value="4">4th Grade</SelectItem>
                      <SelectItem value="5">5th Grade</SelectItem>
                      <SelectItem value="6">6th Grade</SelectItem>
                      <SelectItem value="7">7th Grade</SelectItem>
                      <SelectItem value="8">8th Grade</SelectItem>
                      <SelectItem value="9">9th Grade</SelectItem>
                      <SelectItem value="10">10th Grade</SelectItem>
                      <SelectItem value="11">11th Grade</SelectItem>
                      <SelectItem value="12">12th Grade</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="iepDueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>IEP Due Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="relatedServices"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Related Services</FormLabel>
                  <div className="space-y-2 mt-2">
                    {RELATED_SERVICES_OPTIONS.map((service) => (
                      <div key={service} className="flex items-center space-x-2">
                        <Checkbox
                          id={service}
                          checked={field.value?.includes(service) || false}
                          onCheckedChange={(checked) => {
                            const currentServices = field.value || [];
                            let updatedServices;
                            
                            if (service === "None") {
                              // If "None" is selected, clear all other services
                              updatedServices = checked ? ["None"] : [];
                            } else {
                              // If any other service is selected, remove "None" and add/remove the service
                              if (checked) {
                                updatedServices = [...currentServices.filter(s => s !== "None"), service];
                              } else {
                                updatedServices = currentServices.filter(s => s !== service);
                              }
                            }
                            
                            field.onChange(updatedServices);
                            setSelectedServices(updatedServices);
                          }}
                        />
                        <label 
                          htmlFor={service} 
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {service}
                        </label>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-3 pt-4">
              <Button 
                type="button" 
                variant="outline"
                onClick={handleClose}
                disabled={addStudentMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={addStudentMutation.isPending}
              >
                {addStudentMutation.isPending && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                )}
                Add Student
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
