import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, GraduationCap, Users } from "lucide-react";
import { format } from "date-fns";

interface StudentInfoCardProps {
  student: {
    id: number;
    name: string;
    grade?: string;
    iepDueDate?: string;
    relatedServices?: string;
  };
}

export default function StudentInfoCard({ student }: StudentInfoCardProps) {
  const parseRelatedServices = (services: string | undefined): string[] => {
    if (!services) return [];
    try {
      // Handle both JSON array and comma-separated string
      if (services.startsWith('[')) {
        return JSON.parse(services);
      }
      return services.split(',').map(s => s.trim()).filter(Boolean);
    } catch {
      return services.split(',').map(s => s.trim()).filter(Boolean);
    }
  };

  const relatedServices = parseRelatedServices(student.relatedServices);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Student Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Grade Level */}
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Grade Level</p>
              <p className="text-sm text-muted-foreground">
                {student.grade || "Not specified"}
              </p>
            </div>
          </div>

          {/* IEP Due Date */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">IEP Due Date</p>
              <p className="text-sm text-muted-foreground">
                {student.iepDueDate 
                  ? format(new Date(student.iepDueDate), "MMM dd, yyyy")
                  : "Not set"
                }
              </p>
            </div>
          </div>

          {/* Related Services */}
          <div>
            <p className="text-sm font-medium mb-2">Related Services</p>
            {relatedServices.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {relatedServices.map((service, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {service}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">None specified</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}