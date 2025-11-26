import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Clock, Users } from 'lucide-react';
import type { CriticalDatesSection } from '@/lib/types';

interface CriticalDatesCardProps {
  data: CriticalDatesSection;
}

export function CriticalDatesCard({ data }: CriticalDatesCardProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'deadline':
        return '⏰';
      case 'milestone':
        return '🎯';
      case 'meeting':
        return '🤝';
      case 'decision':
        return '✅';
      default:
        return '📅';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'deadline':
        return 'Deadline';
      case 'milestone':
        return 'Hito';
      case 'meeting':
        return 'Reunión';
      case 'decision':
        return 'Decisión';
      default:
        return 'Otro';
    }
  };

  const getImportanceVariant = (importance: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (importance) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  // Ordenar fechas por fecha (más próximas primero)
  const sortedDates = [...data.dates].sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  // Obtener fechas próximas (próximos 30 días)
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const upcomingDates = sortedDates.filter(
    (d) => new Date(d.date) >= now && new Date(d.date) <= thirtyDaysFromNow
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <CardTitle className="text-base">Fechas Críticas</CardTitle>
          </div>
          {upcomingDates.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {upcomingDates.length} próximas
            </Badge>
          )}
        </div>
        <CardDescription className="text-xs">Deadlines, hitos, reuniones y decisiones clave</CardDescription>
      </CardHeader>
      <CardContent>
        {data.dates.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="h-8">
                  <TableHead className="text-xs">Fecha</TableHead>
                  <TableHead className="text-xs">Evento</TableHead>
                  <TableHead className="text-xs">Tipo</TableHead>
                  <TableHead className="text-xs">Importancia</TableHead>
                  <TableHead className="text-xs">Stakeholders</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedDates.map((date) => {
                  const isUpcoming = new Date(date.date) >= now && new Date(date.date) <= thirtyDaysFromNow;
                  const isPast = new Date(date.date) < now;
                  
                  return (
                    <TableRow
                      key={date.id}
                      className={`h-auto ${isUpcoming ? 'bg-muted/50' : ''} ${isPast ? 'opacity-60' : ''}`}
                    >
                      <TableCell className="text-xs py-2">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className={isUpcoming ? 'font-semibold' : ''}>
                            {new Date(date.date).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs py-2">
                        <div className="space-y-1">
                          <span className="font-medium">{date.event}</span>
                          {date.description && (
                            <p className="text-xs text-muted-foreground">{date.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="flex items-center gap-1">
                          <span>{getTypeIcon(date.type)}</span>
                          <span className="text-xs">{getTypeLabel(date.type)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge variant={getImportanceVariant(date.importance)} className="text-xs">
                          {date.importance}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs py-2">
                        {date.stakeholders && date.stakeholders.length > 0 ? (
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              {date.stakeholders.slice(0, 2).join(', ')}
                              {date.stakeholders.length > 2 && ` +${date.stakeholders.length - 2}`}
                            </span>
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No hay fechas críticas registradas</p>
        )}
      </CardContent>
    </Card>
  );
}

