import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import type { StakeholderMapSection } from '@/lib/types';

interface StakeholderCardProps {
  data: StakeholderMapSection;
}

export function StakeholderCard({ data }: StakeholderCardProps) {
  const getStanceVariant = (stance: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (stance) {
      case 'champion':
        return 'default';
      case 'supporter':
        return 'secondary';
      case 'neutral':
        return 'outline';
      case 'skeptic':
        return 'secondary';
      case 'blocker':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getInfluenceVariant = (influence: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (influence) {
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

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-3 w-3" />
            <CardTitle className="text-sm">Stakeholders</CardTitle>
            <Badge variant="outline" className="text-xs">{data.stakeholders.length}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="space-y-4">
          {data.summary && (
            <p className="text-sm text-muted-foreground">{data.summary}</p>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="h-7">
                  <TableHead className="text-xs py-1">Nombre</TableHead>
                  <TableHead className="text-xs py-1">Rol</TableHead>
                  <TableHead className="text-xs py-1">Influencia</TableHead>
                  <TableHead className="text-xs py-1">Stance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.stakeholders.map((stakeholder) => (
                  <TableRow key={stakeholder.id} className="h-auto">
                    <TableCell className="text-xs py-1 font-medium">{stakeholder.name}</TableCell>
                    <TableCell className="text-xs py-1">{stakeholder.role}</TableCell>
                    <TableCell className="py-1">
                      <Badge variant={getInfluenceVariant(stakeholder.influence)} className="text-xs">
                        {stakeholder.influence}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-1">
                      <Badge variant={getStanceVariant(stakeholder.stance)} className="text-xs">
                        {stakeholder.stance}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {data.stakeholders.map((stakeholder) => (
            stakeholder.notes || stakeholder.priorities ? (
              <div key={`details-${stakeholder.id}`} className="border rounded-lg p-3 bg-muted">
                <p className="font-semibold text-sm mb-2">{stakeholder.name}</p>
                {stakeholder.notes && (
                  <p className="text-xs text-muted-foreground mb-1">{stakeholder.notes}</p>
                )}
                {stakeholder.priorities && stakeholder.priorities.length > 0 && (
                  <div>
                    <p className="text-xs font-medium mb-1">Prioridades:</p>
                    <div className="flex flex-wrap gap-1">
                      {stakeholder.priorities.map((priority, idx) => (
                        <span key={idx} className="text-xs bg-background px-2 py-1 rounded">
                          {priority}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

