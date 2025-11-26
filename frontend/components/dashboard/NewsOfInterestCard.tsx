import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExternalLink, Newspaper } from 'lucide-react';
import type { NewsOfInterestSection } from '@/lib/types';

interface NewsOfInterestCardProps {
  data: NewsOfInterestSection;
}

export function NewsOfInterestCard({ data }: NewsOfInterestCardProps) {
  const getRelevanceVariant = (relevance: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (relevance) {
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
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Newspaper className="h-4 w-4" />
            <CardTitle className="text-base">Noticias de Interés</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            {data.items.length}
          </Badge>
        </div>
        <CardDescription className="text-xs">Noticias relevantes sobre el cliente y la industria</CardDescription>
      </CardHeader>
      <CardContent>
        {data.items.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="h-8">
                  <TableHead className="text-xs">Fecha</TableHead>
                  <TableHead className="text-xs">Título</TableHead>
                  <TableHead className="text-xs">Fuente</TableHead>
                  <TableHead className="text-xs">Relevancia</TableHead>
                  <TableHead className="text-xs">Impacto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((item) => (
                  <TableRow key={item.id} className="h-auto">
                    <TableCell className="text-xs py-2">
                      {new Date(item.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                    </TableCell>
                    <TableCell className="text-xs py-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">{item.title}</span>
                          {item.url && (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{item.summary}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs py-2">{item.source}</TableCell>
                    <TableCell className="py-2">
                      <Badge variant={getRelevanceVariant(item.relevance)} className="text-xs">
                        {item.relevance}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs py-2 text-muted-foreground">
                      {item.impactOnOpportunity || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No hay noticias disponibles</p>
        )}
      </CardContent>
    </Card>
  );
}

