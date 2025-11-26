import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { FileText, Copy, Check } from 'lucide-react';
import type { EvidencePackSection } from '@/lib/types';

interface EvidenceCardProps {
  data: EvidencePackSection;
}

export function EvidenceCard({ data }: EvidenceCardProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'case_study':
        return 'Caso de Estudio';
      case 'kpi':
        return 'KPI';
      case 'testimonial':
        return 'Testimonial';
      case 'award':
        return 'Premio';
      case 'certification':
        return 'Certificación';
      default:
        return type;
    }
  };

  const getTypeVariant = (type: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case 'case_study':
        return 'default';
      case 'kpi':
        return 'secondary';
      case 'testimonial':
        return 'secondary';
      case 'award':
        return 'default';
      case 'certification':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <FileText className="h-3 w-3" />
          <CardTitle className="text-sm">Evidence</CardTitle>
          <Badge variant="outline" className="text-xs">{data.items.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="space-y-2">
          {data.summary && (
            <p className="text-sm text-muted-foreground">{data.summary}</p>
          )}

          <div className="space-y-2">
            {data.items.slice(0, 3).map((item) => (
              <div key={item.id} className="border rounded p-2 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Badge variant={getTypeVariant(item.type)} className="text-xs">
                      {getTypeLabel(item.type)}
                    </Badge>
                    <span className="font-medium line-clamp-1">{item.title}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{item.relevance}%</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                <div className="flex items-center justify-between">
                  {item.source && (
                    <span className="text-xs text-muted-foreground">{item.source}</span>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(item.snippet, item.id)}
                    className="h-6 text-xs px-2"
                  >
                    {copiedId === item.id ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


