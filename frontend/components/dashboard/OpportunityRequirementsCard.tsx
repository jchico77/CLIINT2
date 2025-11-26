import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Target, CheckCircle2, XCircle, Filter, AlertCircle } from 'lucide-react';
import type { OpportunityRequirementsSection } from '@/lib/types';

interface OpportunityRequirementsCardProps {
  data: OpportunityRequirementsSection;
}

export function OpportunityRequirementsCard({ data }: OpportunityRequirementsCardProps) {
  const getPriorityVariant = (priority: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (priority) {
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

  const getPriorityLevelVariant = (
    level?: 'must' | 'should' | 'nice',
  ): "default" | "secondary" | "outline" => {
    switch (level) {
      case 'must':
        return 'destructive';
      case 'should':
        return 'default';
      case 'nice':
      default:
        return 'outline';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'requirement':
        return 'Requisito';
      case 'scope':
        return 'Scope';
      case 'criteria':
        return 'Criterio';
      case 'exclusion':
        return 'Exclusión';
      case 'constraint':
        return 'Restricción';
      default:
        return category;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4" />
          <CardTitle className="text-base">Oportunidad: Requisitos y Scope</CardTitle>
        </div>
        <CardDescription className="text-xs">Qué busca el cliente, scope, criterios y exclusiones</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Tabs defaultValue="requirements" className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-8 text-xs">
            <TabsTrigger value="requirements" className="text-xs">Requisitos</TabsTrigger>
            <TabsTrigger value="seeks" className="text-xs">Busca</TabsTrigger>
            <TabsTrigger value="scope" className="text-xs">Scope</TabsTrigger>
            <TabsTrigger value="exclusions" className="text-xs">Exclusiones</TabsTrigger>
          </TabsList>

          <TabsContent value="requirements" className="mt-3 space-y-2">
            {data.requirements.length > 0 ? (
              <div className="space-y-2">
                {data.requirements.map((req) => (
                  <div key={req.id} className="border rounded p-2 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={getPriorityVariant(req.priority)} className="text-xs">
                          {req.priority}
                        </Badge>
                        {req.priorityLevel && (
                          <Badge
                            variant={getPriorityLevelVariant(req.priorityLevel)}
                            className="text-xs uppercase"
                          >
                            {req.priorityLevel}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {getCategoryLabel(req.category)}
                        </Badge>
                        <span className="font-medium">{req.title}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{req.relevanceToService}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{req.description}</p>
                    <Progress value={req.relevanceToService} className="h-1" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No hay requisitos específicos</p>
            )}
          </TabsContent>

          <TabsContent value="seeks" className="mt-3">
            {data.whatClientSeeks.length > 0 ? (
              <div className="space-y-1">
                {data.whatClientSeeks.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs">
                    <CheckCircle2 className="h-3 w-3 mt-0.5 text-primary" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No especificado</p>
            )}
          </TabsContent>

          <TabsContent value="scope" className="mt-3">
            {data.scope.length > 0 ? (
              <div className="space-y-1">
                {data.scope.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs">
                    <Filter className="h-3 w-3 mt-0.5 text-primary" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No especificado</p>
            )}
          </TabsContent>

          <TabsContent value="exclusions" className="mt-3">
            {data.exclusions.length > 0 ? (
              <div className="space-y-1">
                {data.exclusions.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs">
                    <XCircle className="h-3 w-3 mt-0.5 text-destructive" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No hay exclusiones</p>
            )}
          </TabsContent>
        </Tabs>

        {data.selectionCriteria.length > 0 && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-3 w-3" />
              <p className="text-xs font-medium">Criterios de Selección</p>
            </div>
            <div className="flex flex-wrap gap-1">
              {data.selectionCriteria.map((criteria, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {criteria}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

