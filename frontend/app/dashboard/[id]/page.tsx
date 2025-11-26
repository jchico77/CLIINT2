'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getDashboard } from '@/lib/api';
import type { ClientIntelDashboard } from '@/lib/types';
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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';

export default function DashboardPage() {
  const params = useParams();
  const router = useRouter();
  const dashboardId = params.id as string;

  const [dashboard, setDashboard] = useState<ClientIntelDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (dashboardId) {
      getDashboard(dashboardId)
        .then(setDashboard)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [dashboardId]);

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
        {/* Main Dashboard Grid - Dense 4 Columns */}
        <div className="grid gap-3 grid-cols-4">
          {/* Column 1: Opportunity Summary */}
          <div className="col-span-1">
            <OpportunitySummaryCard data={dashboard.sections.opportunitySummary} />
          </div>

          {/* Column 2: Opportunity Requirements */}
          <div className="col-span-1">
            <OpportunityRequirementsCard data={dashboard.sections.opportunityRequirements} />
          </div>

          {/* Column 3: Stakeholders */}
          <div className="col-span-1">
            <StakeholderCard data={dashboard.sections.stakeholderMap} />
          </div>

          {/* Column 4: Vendor Fit */}
          <div className="col-span-1">
            <VendorFitCard data={dashboard.sections.vendorFitAndPlays} />
          </div>
        </div>

        {/* Second Row - Dense 4 Columns */}
        <div className="grid gap-3 grid-cols-4">
          {/* Column 1: Competitive Landscape */}
          <div className="col-span-2">
            <CompetitiveCard data={dashboard.sections.competitiveLandscape} />
          </div>

          {/* Column 2: Evidence Pack */}
          <div className="col-span-1">
            <EvidenceCard data={dashboard.sections.evidencePack} />
          </div>

          {/* Column 3: Critical Dates */}
          <div className="col-span-1">
            <CriticalDatesCard data={dashboard.sections.criticalDates} />
          </div>
        </div>

        {/* Third Row - Dense 4 Columns */}
        <div className="grid gap-3 grid-cols-4">
          {/* Column 1: Gaps & Questions */}
          <div className="col-span-2">
            <GapsQuestionsCard data={dashboard.sections.gapsAndQuestions} />
          </div>

          {/* Column 2: News of Interest */}
          <div className="col-span-1">
            <NewsOfInterestCard data={dashboard.sections.newsOfInterest} />
          </div>

          {/* Column 3: Market Context (moved to bottom) */}
          <div className="col-span-1">
            <MarketContextCard data={dashboard.sections.marketContext} />
          </div>
        </div>
      </main>
    </div>
  );
}

