'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getDashboard, retryDashboardPhase } from '@/lib/api';
import type { ClientIntelDashboard, DashboardPhase } from '@/lib/types';
import { AccountSnapshotCard } from '@/components/dashboard/AccountSnapshotCard';
import { OpportunitySummaryCard } from '@/components/dashboard/OpportunitySummaryCard';
import { MarketContextCard } from '@/components/dashboard/MarketContextCard';
import { OpportunityRequirementsCard } from '@/components/dashboard/OpportunityRequirementsCard';
import { StakeholderCard } from '@/components/dashboard/StakeholderCard';
import { CompetitiveCard } from '@/components/dashboard/CompetitiveCard';
import { VendorFitCard } from '@/components/dashboard/VendorFitCard';
import { EvidenceCard } from '@/components/dashboard/EvidenceCard';
import { GapsQuestionsCard } from '@/components/dashboard/GapsQuestionsCard';
import { NewsOfInterestCard } from '@/components/dashboard/NewsOfInterestCard';
import { CriticalDatesCard } from '@/components/dashboard/CriticalDatesCard';
import { ProposalOutlineCard } from '@/components/dashboard/ProposalOutlineCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Eye, RefreshCcw, AlertCircle, Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const params = useParams();
  const router = useRouter();
  const dashboardId = params.id as string;

  const [dashboard, setDashboard] = useState<ClientIntelDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailSection, setDetailSection] = useState<{ title: string; data: unknown } | null>(null);
  const [retryPhase, setRetryPhase] = useState<DashboardPhase | null>(null);
  const [retryError, setRetryError] = useState<string | null>(null);

  useEffect(() => {
    if (dashboardId) {
      getDashboard(dashboardId)
        .then(setDashboard)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [dashboardId]);

  const handleOpenDetail = (title: string, data: unknown) => {
    setDetailSection({ title, data });
  };

  const handleRetryPhase = async (phase: DashboardPhase) => {
    if (!dashboard) return;
    setRetryPhase(phase);
    setRetryError(null);
    try {
      const response = await retryDashboardPhase({
        vendorId: dashboard.vendorId,
        opportunityId: dashboard.opportunityId,
        phase,
        opportunityContextOverride: dashboard.opportunityContext,
      });
      router.push(`/dashboard/${response.dashboardId}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo relanzar la fase seleccionada';
      setRetryError(message);
    } finally {
      setRetryPhase(null);
    }
  };

  const renderSection = (
    node: React.ReactNode,
    options: { title: string; data: unknown; phase?: DashboardPhase },
  ) => (
    <div className="space-y-2">
      {node}
      <div className="flex justify-end gap-2 text-xs">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1"
          onClick={() => handleOpenDetail(options.title, options.data)}
        >
          <Eye className="h-3 w-3" />
          Detalle
        </Button>
        {options.phase && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            disabled={retryPhase === options.phase}
            onClick={() => handleRetryPhase(options.phase!)}
          >
            {retryPhase === options.phase ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Relanzando...
              </>
            ) : (
              <>
                <RefreshCcw className="h-3 w-3" />
                Relanzar fase
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-semibold text-destructive mb-4">Error cargando dashboard</p>
          <p className="text-muted-foreground mb-4">{error || 'Dashboard no encontrado'}</p>
          <Link href="/">
            <Button>Volver al inicio</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="w-full flex h-14 items-center px-6">
          <div className="flex-1">
            <h1 className="text-xl font-semibold">Client Intelligence Dashboard</h1>
            <p className="text-xs text-muted-foreground">
              {dashboard.sections.accountSnapshot.companyName} • Generado el {new Date(dashboard.generatedAt).toLocaleString('es-ES')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                Admin
              </Button>
            </Link>
            <Link href="/opportunities">
              <Button variant="ghost" size="sm">Oportunidades</Button>
            </Link>
            <ThemeToggle />
            <Link href="/">
              <Button variant="outline" size="sm">Inicio</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content - Compact Dense Layout */}
      <main className="w-full px-4 py-3 space-y-3">
        {retryError && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{retryError}</span>
          </div>
        )}
        {/* Main Dashboard Grid - Dense 4 Columns */}
        <div className="grid gap-3 grid-cols-4">
          <div className="col-span-1">
            {renderSection(
              <OpportunitySummaryCard data={dashboard.sections.opportunitySummary} />,
              {
                title: 'Opportunity summary',
                data: dashboard.sections.opportunitySummary,
                phase: 'clientResearch',
              },
            )}
          </div>
          <div className="col-span-1">
            {renderSection(
              <OpportunityRequirementsCard data={dashboard.sections.opportunityRequirements} />,
              {
                title: 'Opportunity requirements',
                data: dashboard.sections.opportunityRequirements,
                phase: 'clientResearch',
              },
            )}
          </div>
          <div className="col-span-1">
            {renderSection(<StakeholderCard data={dashboard.sections.stakeholderMap} />, {
              title: 'Stakeholder map',
              data: dashboard.sections.stakeholderMap,
              phase: 'fitStrategy',
            })}
          </div>
          <div className="col-span-1">
            {renderSection(<VendorFitCard data={dashboard.sections.vendorFitAndPlays} />, {
              title: 'Vendor fit & plays',
              data: dashboard.sections.vendorFitAndPlays,
              phase: 'fitStrategy',
            })}
          </div>
        </div>

        {/* Second Row - Dense 4 Columns */}
        <div className="grid gap-3 grid-cols-4">
          <div className="col-span-2">
            {renderSection(
              <CompetitiveCard data={dashboard.sections.competitiveLandscape} />,
              {
                title: 'Competitive landscape',
                data: dashboard.sections.competitiveLandscape,
                phase: 'fitStrategy',
              },
            )}
          </div>
          <div className="col-span-1">
            {renderSection(<EvidenceCard data={dashboard.sections.evidencePack} />, {
              title: 'Evidence pack',
              data: dashboard.sections.evidencePack,
              phase: 'vendorResearch',
            })}
          </div>
          <div className="col-span-1">
            {renderSection(<CriticalDatesCard data={dashboard.sections.criticalDates} />, {
              title: 'Critical dates',
              data: dashboard.sections.criticalDates,
            })}
          </div>
        </div>

        {/* Third Row - Dense 4 Columns */}
        <div className="grid gap-3 grid-cols-4">
          <div className="col-span-2">
            {renderSection(<GapsQuestionsCard data={dashboard.sections.gapsAndQuestions} />, {
              title: 'Gaps & intelligent questions',
              data: dashboard.sections.gapsAndQuestions,
              phase: 'fitStrategy',
            })}
          </div>
          <div className="col-span-1">
            {renderSection(<NewsOfInterestCard data={dashboard.sections.newsOfInterest} />, {
              title: 'News of interest',
              data: dashboard.sections.newsOfInterest,
              phase: 'deepResearch',
            })}
          </div>
          <div className="col-span-1">
            {renderSection(<MarketContextCard data={dashboard.sections.marketContext} />, {
              title: 'Market context',
              data: dashboard.sections.marketContext,
              phase: 'clientResearch',
            })}
          </div>
        </div>

        {/* Fourth Row - Proposal Outline */}
        <div className="grid gap-3 grid-cols-4">
          <div className="col-span-4">
            {renderSection(
              <ProposalOutlineCard
                data={dashboard.sections.proposalOutline ?? dashboard.proposalOutline}
              />,
              {
                title: 'Proposal outline',
                data: dashboard.sections.proposalOutline ?? dashboard.proposalOutline,
                phase: 'proposalOutline',
              },
            )}
          </div>
        </div>
      </main>
      <Dialog open={Boolean(detailSection)} onOpenChange={(open) => !open && setDetailSection(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{detailSection?.title}</DialogTitle>
            <DialogDescription>Vista detallada de la sección seleccionada.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto rounded-md bg-muted/50 p-4 text-xs font-mono">
            <pre>{JSON.stringify(detailSection?.data, null, 2)}</pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

