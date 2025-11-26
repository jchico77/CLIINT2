'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Loader2, Circle } from 'lucide-react';

export interface AnalysisStep {
  id: string;
  label: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  message?: string;
}

interface AnalysisProgressProps {
  steps: AnalysisStep[];
  currentStep: number;
}

export function AnalysisProgress({ steps, currentStep }: AnalysisProgressProps) {
  const getStepIcon = (step: AnalysisStep, index: number) => {
    if (step.status === 'completed') {
      return <CheckCircle2 className="h-4 w-4 text-primary" />;
    }
    if (step.status === 'in-progress' || (step.status === 'pending' && index === currentStep)) {
      return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
    }
    if (step.status === 'error') {
      return <Circle className="h-4 w-4 text-destructive" />;
    }
    return <Circle className="h-4 w-4 text-muted-foreground" />;
  };

  const getStepVariant = (step: AnalysisStep): "default" | "secondary" | "destructive" | "outline" => {
    if (step.status === 'completed') {
      return 'default';
    }
    if (step.status === 'in-progress') {
      return 'secondary';
    }
    if (step.status === 'error') {
      return 'destructive';
    }
    return 'outline';
  };

  const completedSteps = steps.filter((s) => s.status === 'completed').length;
  const progress = (completedSteps / steps.length) * 100;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Análisis en progreso</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {completedSteps}/{steps.length}
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Generando dashboard con investigación profunda usando GPT-5.1
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progreso general</span>
            <span className="font-semibold">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="space-y-2">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-start gap-3 p-2 rounded border ${
                step.status === 'in-progress' ? 'bg-muted/50' : ''
              }`}
            >
              <div className="mt-0.5">{getStepIcon(step, index)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">{step.label}</span>
                  <Badge variant={getStepVariant(step)} className="text-xs">
                    {step.status === 'completed' && 'Completado'}
                    {step.status === 'in-progress' && 'En progreso...'}
                    {step.status === 'pending' && 'Pendiente'}
                    {step.status === 'error' && 'Error'}
                  </Badge>
                </div>
                {step.message && (
                  <p className="text-xs text-muted-foreground">{step.message}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

