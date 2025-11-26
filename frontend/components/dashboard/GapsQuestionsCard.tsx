import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HelpCircle, Copy, Check, AlertCircle } from 'lucide-react';
import type { GapsAndQuestionsSection } from '@/lib/types';

interface GapsQuestionsCardProps {
  data: GapsAndQuestionsSection;
}

export function GapsQuestionsCard({ data }: GapsQuestionsCardProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getImpactVariant = (impact: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (impact) {
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
          <HelpCircle className="h-5 w-5" />
          <div>
            <CardTitle>Gaps & Questions</CardTitle>
            <CardDescription>Gaps de información y preguntas inteligentes</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.summary && (
            <p className="text-sm text-muted-foreground">{data.summary}</p>
          )}

          <Tabs defaultValue="gaps" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="gaps">
                <AlertCircle className="h-4 w-4 mr-2" />
                Gaps ({data.gaps.length})
              </TabsTrigger>
              <TabsTrigger value="questions">
                <HelpCircle className="h-4 w-4 mr-2" />
                Preguntas ({data.questions.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="gaps" className="mt-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tema</TableHead>
                      <TableHead>Impacto</TableHead>
                      <TableHead>Descripción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.gaps.map((gap) => (
                      <TableRow key={gap.id}>
                        <TableCell className="font-medium">{gap.topic}</TableCell>
                        <TableCell>
                          <Badge variant={getImpactVariant(gap.impact)}>
                            {gap.impact}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{gap.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="questions" className="mt-4 space-y-3">
              {data.questions.map((question) => (
                <div key={question.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <p className="font-medium flex-1">{question.question}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(question.question, question.id)}
                    >
                      {copiedId === question.id ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copiar
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">{question.context}</p>
                  {question.targetStakeholder && (
                    <Badge variant="outline" className="text-xs">
                      Stakeholder: {question.targetStakeholder}
                    </Badge>
                  )}
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
}

