import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingDown, Users, Package } from 'lucide-react';
import type { CompetitiveLandscapeSection } from '@/lib/types';

interface CompetitiveCardProps {
  data: CompetitiveLandscapeSection;
}

export function CompetitiveCard({ data }: CompetitiveCardProps) {
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'client_competitor':
        return 'Cliente';
      case 'vendor_competitor':
        return 'Vendor';
      case 'alternative_solution':
        return 'Alternativa';
      default:
        return type;
    }
  };

  const getTypeVariant = (type: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case 'client_competitor':
        return 'default';
      case 'vendor_competitor':
        return 'destructive';
      case 'alternative_solution':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const totalCompetitors = data.clientCompetitors.length + data.vendorCompetitors.length + data.alternatives.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Competitive Landscape</CardTitle>
            <CardDescription>Paisaje competitivo</CardDescription>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingDown className="h-4 w-4" />
            <span>{totalCompetitors} competidores</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.summary && (
            <p className="text-sm text-muted-foreground">{data.summary}</p>
          )}

          <Tabs defaultValue="client" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="client">
                Cliente ({data.clientCompetitors.length})
              </TabsTrigger>
              <TabsTrigger value="vendor">
                Vendor ({data.vendorCompetitors.length})
              </TabsTrigger>
              <TabsTrigger value="alternatives">
                Alternativas ({data.alternatives.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="client" className="space-y-3 mt-4">
              {data.clientCompetitors.map((comp) => (
                <div key={comp.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">{comp.name}</h4>
                    <Badge variant={getTypeVariant(comp.type)}>
                      {getTypeLabel(comp.type)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{comp.description}</p>
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                    {comp.strengths && comp.strengths.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-primary mb-1">Fortalezas</p>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {comp.strengths.map((s, idx) => (
                            <li key={idx} className="flex items-start gap-1">
                              <span className="text-primary">•</span>
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {comp.weaknesses && comp.weaknesses.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-destructive mb-1">Debilidades</p>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {comp.weaknesses.map((w, idx) => (
                            <li key={idx} className="flex items-start gap-1">
                              <span className="text-destructive">•</span>
                              <span>{w}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="vendor" className="space-y-3 mt-4">
              {data.vendorCompetitors.map((comp) => (
                <div key={comp.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{comp.name}</h4>
                    <Badge variant={getTypeVariant(comp.type)}>
                      {getTypeLabel(comp.type)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{comp.description}</p>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="alternatives" className="space-y-3 mt-4">
              {data.alternatives.map((alt) => (
                <div key={alt.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{alt.name}</h4>
                    <Badge variant={getTypeVariant(alt.type)}>
                      {getTypeLabel(alt.type)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{alt.description}</p>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
}

