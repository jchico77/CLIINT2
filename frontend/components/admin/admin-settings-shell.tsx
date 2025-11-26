import { ReactNode } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface AdminSettingsShellProps {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AdminSettingsShell({
  title,
  description,
  children,
  footer,
}: AdminSettingsShellProps) {
  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">{children}</CardContent>
      {footer}
    </Card>
  );
}

interface AdminSettingsGridProps {
  leftColumn: ReactNode;
  rightColumn: ReactNode;
}

export function AdminSettingsGrid({ leftColumn, rightColumn }: AdminSettingsGridProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="space-y-5">{leftColumn}</div>
      <div className="space-y-5">{rightColumn}</div>
    </div>
  );
}

interface SectionProps {
  title: string;
  helpText?: string;
  children: ReactNode;
}

export function AdminSection({ title, helpText, children }: SectionProps) {
  return (
    <section className="space-y-3">
      <div>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {helpText ? (
          <p className="text-xs text-muted-foreground">{helpText}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

