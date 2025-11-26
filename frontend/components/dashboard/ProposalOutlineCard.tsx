import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ProposalOutlineLite } from '@/lib/types';

interface ProposalOutlineCardProps {
  data?: ProposalOutlineLite;
}

export function ProposalOutlineCard({ data }: ProposalOutlineCardProps) {
  if (!data || data.sections.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Proposal Outline</CardTitle>
        <CardDescription>Estructura recomendada para el deliverable</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.sections.map((section, idx) => (
          <div key={section.id || idx} className="border rounded p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-sm">{section.title}</div>
              <Badge variant="secondary" className="text-[10px] uppercase">
                Sección {idx + 1}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{section.purpose}</p>
            <ul className="list-disc pl-4 text-xs space-y-1">
              {section.suggestedContent.map((item, itemIdx) => (
                <li key={itemIdx}>{item}</li>
              ))}
            </ul>
            {section.linkedEvidenceIds.length > 0 && (
              <div className="text-[11px] text-muted-foreground">
                Evidencias: {section.linkedEvidenceIds.join(', ')}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

