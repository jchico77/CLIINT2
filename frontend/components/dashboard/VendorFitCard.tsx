import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { VendorFitAndPlaysSection } from '@/lib/types';

interface VendorFitCardProps {
  data: VendorFitAndPlaysSection;
  compact?: boolean;
}

export function VendorFitCard({ data, compact = false }: VendorFitCardProps) {
  const getFitVariant = (fit: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (fit) {
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Vendor Fit</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{data.fitScore}%</p>
                <Badge variant={getFitVariant(data.overallFit)} className="mt-1">
                  {data.overallFit.toUpperCase()}
                </Badge>
              </div>
            </div>
            <Progress value={data.fitScore} className="h-2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vendor Fit & Plays</CardTitle>
        <CardDescription>Encaje y estrategias recomendadas</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex items-center justify-between p-6 border rounded-lg bg-muted/50">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Overall Fit</p>
              <p className="text-4xl font-bold">{data.fitScore}%</p>
            </div>
            <Badge variant={getFitVariant(data.overallFit)} className="text-lg px-4 py-2">
              {data.overallFit.toUpperCase()}
            </Badge>
          </div>
          <Progress value={data.fitScore} className="h-3" />

          {data.summary && (
            <p className="text-sm text-muted-foreground">{data.summary}</p>
          )}

          {data.fitDimensions.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Dimensiones de Fit</h3>
              <div className="space-y-4">
                {data.fitDimensions.map((dim, idx) => (
                  <div key={idx} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{dim.dimension}</p>
                      <span className="text-sm font-semibold">{dim.score}%</span>
                    </div>
                    <Progress value={dim.score} className="h-2" />
                    <p className="text-sm text-muted-foreground">{dim.reasoning}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.recommendedPlays.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Plays Recomendados</h3>
              <div className="space-y-4">
                {data.recommendedPlays.map((play) => (
                  <div key={play.id} className="border rounded-lg p-4 bg-muted">
                    <h4 className="font-semibold mb-2">{play.name}</h4>
                    <p className="text-sm text-muted-foreground mb-3">{play.description}</p>
                    <div className="mb-3">
                      <p className="text-xs font-medium mb-1">Rationale:</p>
                      <p className="text-xs text-muted-foreground">{play.rationale}</p>
                    </div>
                    {play.targetStakeholders.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs font-medium mb-1">Stakeholders objetivo:</p>
                        <div className="flex flex-wrap gap-1">
                          {play.targetStakeholders.map((sh, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {sh}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {play.successFactors.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-1">Factores de éxito:</p>
                        <ul className="text-xs text-muted-foreground list-disc list-inside">
                          {play.successFactors.map((factor, idx) => (
                            <li key={idx}>{factor}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

