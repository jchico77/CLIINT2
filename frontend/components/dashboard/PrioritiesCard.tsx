import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Target } from 'lucide-react';
import type { StrategicPrioritiesSection } from '@/lib/types';

interface PrioritiesCardProps {
  data: StrategicPrioritiesSection;
}

export function PrioritiesCard({ data }: PrioritiesCardProps) {
  const getSeverityVariant = (severity: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (severity) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          <div>
            <CardTitle>Strategic Priorities</CardTitle>
            <CardDescription>Prioridades estratégicas y pain points</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {data.summary && (
            <p className="text-sm text-muted-foreground">{data.summary}</p>
          )}

          <div className="space-y-4">
            {data.priorities.map((priority) => (
              <div key={priority.id} className="border rounded-lg p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{priority.name}</h3>
                    <p className="text-sm text-muted-foreground">{priority.description}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Relevancia al servicio</span>
                    <span className="font-semibold">{priority.relevanceToService}%</span>
                  </div>
                  <Progress value={priority.relevanceToService} className="h-2" />
                </div>

                {priority.painPoints.length > 0 && (
                  <div className="space-y-2 pt-2 border-t">
                    <p className="text-xs font-medium text-muted-foreground">Pain Points</p>
                    <div className="flex flex-wrap gap-2">
                      {priority.painPoints.map((pain) => (
                        <Badge
                          key={pain.id}
                          variant={getSeverityVariant(pain.severity)}
                          className="text-xs"
                        >
                          {pain.severity}: {pain.description}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

