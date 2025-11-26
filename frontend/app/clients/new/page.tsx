'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ThemeToggle } from '@/components/theme-toggle';
import { AnalysisProgress, type AnalysisStep } from '@/components/analysis-progress';
import {
  createVendor,
  createClient,
  createService,
  createDashboard,
  getVendor,
  getClients,
  getServices,
} from '@/lib/api';
import type { Vendor, ClientAccount, ServiceOffering } from '@/lib/types';
import { Building2, Briefcase, Target, FileText, Sparkles } from 'lucide-react';

export default function NewClientAnalysisPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Form state with default dummy values
  const [vendorId, setVendorId] = useState<string>('');
  const [vendorName, setVendorName] = useState('Indra Sistemas');
  const [vendorWebsite, setVendorWebsite] = useState('https://www.indracompany.com');
  const [vendorDescription, setVendorDescription] = useState('Indra es una de las principales empresas globales de tecnología y consultoría, líder en soluciones de transformación digital para empresas e instituciones.');

  const [clientId, setClientId] = useState<string>('');
  const [clientName, setClientName] = useState('Telefónica');
  const [clientWebsite, setClientWebsite] = useState('https://www.telefonica.com');
  const [clientCountry, setClientCountry] = useState('España');
  const [clientSector, setClientSector] = useState('Telecomunicaciones');

  const [serviceId, setServiceId] = useState<string>('');
  const [serviceName, setServiceName] = useState('Plataforma de Transformación Digital Empresarial');
  const [serviceDescription, setServiceDescription] = useState('Solución integral para la transformación digital que incluye migración a la nube, automatización de procesos, análisis de datos y servicios de consultoría estratégica.');
  const [serviceTags, setServiceTags] = useState('consultoria, digital-transformation, cloud, analytics, ia');

  const [opportunityContext, setOpportunityContext] = useState('Telefónica está buscando modernizar su infraestructura tecnológica y acelerar su transformación digital. La empresa necesita mejorar la eficiencia operativa, reducir costos y mejorar la experiencia del cliente. Tienen un presupuesto aprobado para 2024 y están evaluando varias soluciones de consultoría y tecnología. El Director de Transformación Digital es el sponsor principal del proyecto. Hay interés en soluciones de IA y automatización.');

  const [existingVendors, setExistingVendors] = useState<Vendor[]>([]);
  const [existingClients, setExistingClients] = useState<ClientAccount[]>([]);
  const [existingServices, setExistingServices] = useState<ServiceOffering[]>([]);

  const [createNewVendor, setCreateNewVendor] = useState(true);
  const [createNewClient, setCreateNewClient] = useState(true);
  const [createNewService, setCreateNewService] = useState(true);

  useEffect(() => {
    if (vendorId) {
      loadClientsAndServices();
    }
  }, [vendorId]);

  const loadClientsAndServices = async () => {
    try {
      const [clients, services] = await Promise.all([
        getClients(vendorId),
        getServices(vendorId),
      ]);
      setExistingClients(clients);
      setExistingServices(services);
    } catch (err) {
      console.error('Error loading clients/services:', err);
    }
  };

  const updateStep = (stepId: string, status: AnalysisStep['status'], message?: string) => {
    setAnalysisSteps((prev) =>
      prev.map((step) =>
        step.id === stepId ? { ...step, status, message } : step
      )
    );
  };

  const initializeSteps = () => {
    const steps: AnalysisStep[] = [
      {
        id: 'vendor',
        label: 'Creando/Validando Vendor',
        status: 'pending',
      },
      {
        id: 'client',
        label: 'Creando/Validando Cliente',
        status: 'pending',
      },
      {
        id: 'service',
        label: 'Creando/Validando Servicio',
        status: 'pending',
      },
      {
        id: 'deep-research',
        label: 'Investigación Profunda del Cliente',
        status: 'pending',
        message: 'Buscando información actualizada sobre la empresa...',
      },
      {
        id: 'client-analysis',
        label: 'Análisis del Cliente con GPT-4o',
        status: 'pending',
        message: 'Analizando account snapshot, market context y prioridades...',
      },
      {
        id: 'vendor-research',
        label: 'Investigación del Vendor',
        status: 'pending',
        message: 'Extrayendo evidencias y capacidades del vendor...',
      },
      {
        id: 'competitive',
        label: 'Análisis Competitivo',
        status: 'pending',
        message: 'Investigando competidores y alternativas...',
      },
      {
        id: 'fit-strategy',
        label: 'Análisis de Fit y Estrategia',
        status: 'pending',
        message: 'Generando stakeholder map, vendor fit y plays estratégicos...',
      },
      {
        id: 'news',
        label: 'Investigación de Noticias',
        status: 'pending',
        message: 'Buscando noticias relevantes de los últimos 6 meses...',
      },
      {
        id: 'finalize',
        label: 'Finalizando Dashboard',
        status: 'pending',
        message: 'Combinando todos los análisis y generando dashboard...',
      },
    ];
    setAnalysisSteps(steps);
    setCurrentStepIndex(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    initializeSteps();

    try {
      let finalVendorId = vendorId;
      let finalClientId = clientId;
      let finalServiceId = serviceId;

      // Step 1: Vendor
      if (createNewVendor) {
        updateStep('vendor', 'in-progress', 'Creando vendor...');
        await new Promise((resolve) => setTimeout(resolve, 500)); // Simular delay
        const vendor = await createVendor({
          name: vendorName,
          websiteUrl: vendorWebsite,
          description: vendorDescription || undefined,
        });
        finalVendorId = vendor.id;
        setVendorId(vendor.id);
        updateStep('vendor', 'completed', `Vendor creado: ${vendor.name}`);
        setCurrentStepIndex(1);
      } else {
        updateStep('vendor', 'completed', 'Vendor existente validado');
        setCurrentStepIndex(1);
      }

      // Step 2: Client
      if (createNewClient) {
        updateStep('client', 'in-progress', 'Creando cliente...');
        await new Promise((resolve) => setTimeout(resolve, 500));
        const client = await createClient(finalVendorId, {
          vendorId: finalVendorId,
          name: clientName,
          websiteUrl: clientWebsite,
          country: clientCountry || undefined,
          sectorHint: clientSector || undefined,
        });
        finalClientId = client.id;
        updateStep('client', 'completed', `Cliente creado: ${client.name}`);
        setCurrentStepIndex(2);
      } else {
        updateStep('client', 'completed', 'Cliente existente validado');
        setCurrentStepIndex(2);
      }

      // Step 3: Service
      if (createNewService) {
        updateStep('service', 'in-progress', 'Creando servicio...');
        await new Promise((resolve) => setTimeout(resolve, 500));
        const tags = serviceTags.split(',').map((t) => t.trim()).filter(Boolean);
        const service = await createService(finalVendorId, {
          vendorId: finalVendorId,
          name: serviceName,
          shortDescription: serviceDescription,
          categoryTags: tags,
        });
        finalServiceId = service.id;
        updateStep('service', 'completed', `Servicio creado: ${service.name}`);
        setCurrentStepIndex(3);
      } else {
        updateStep('service', 'completed', 'Servicio existente validado');
        setCurrentStepIndex(3);
      }

      // Initialize dashboard generation steps
      updateStep('deep-research', 'pending');
      updateStep('client-analysis', 'pending');
      updateStep('vendor-research', 'pending');
      updateStep('competitive', 'pending');
      updateStep('fit-strategy', 'pending');
      updateStep('news', 'pending');
      updateStep('finalize', 'pending');

      // Generate dashboard with REAL progress tracking
      updateStep('finalize', 'in-progress', 'Generando dashboard...');
      setCurrentStepIndex(9);

      const { createDashboardWithProgress } = await import('@/lib/api');
      const response = await createDashboardWithProgress(
        finalVendorId,
        {
          vendorId: finalVendorId,
          clientId: finalClientId,
          serviceOfferingId: finalServiceId,
          opportunityContext,
        },
        (progressEvent) => {
          // Update step based on real progress from backend
          updateStep(progressEvent.stepId, progressEvent.status, progressEvent.message);
          
          // Update current step index based on stepId
          const stepIndexMap: Record<string, number> = {
            'deep-research': 3,
            'client-analysis': 4,
            'vendor-research': 5,
            'competitive': 6,
            'fit-strategy': 7,
            'news': 8,
            'finalize': 9,
          };
          if (stepIndexMap[progressEvent.stepId] !== undefined) {
            setCurrentStepIndex(stepIndexMap[progressEvent.stepId]);
          }
        }
      );

      updateStep('finalize', 'completed', 'Dashboard generado exitosamente');
      await new Promise((resolve) => setTimeout(resolve, 500));

      router.push(`/dashboard/${response.dashboardId}`);
    } catch (err) {
      let errorMessage = 'Error desconocido al crear el dashboard';
      
      if (err instanceof Error) {
        errorMessage = err.message;
        
        // Provide more context for specific error types
        const errorCode = (err as Error & { code?: string }).code;
        if (errorCode === 'VALIDATION_ERROR') {
          errorMessage = `Datos inválidos: ${err.message}`;
        } else if (errorCode === 'LLM_ERROR') {
          errorMessage = `Error en el análisis con IA. Por favor, verifica tu configuración de API o intenta de nuevo.`;
        } else if (errorCode === 'NOT_FOUND') {
          errorMessage = `Recurso no encontrado: ${err.message}`;
        }
      }
      
      setError(errorMessage);
      setLoading(false);
      
      // Marcar el paso actual como error
      if (currentStepIndex < analysisSteps.length) {
        updateStep(analysisSteps[currentStepIndex].id, 'error', errorMessage);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 shrink-0">
        <div className="w-full flex h-14 items-center px-6 justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">← Volver</Button>
            </Link>
            <h1 className="text-xl font-semibold">Nueva Oportunidad</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button variant="ghost" size="sm">Admin</Button>
            </Link>
            <Link href="/opportunities">
              <Button variant="ghost" size="sm">Oportunidades</Button>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content - Full Width, No Scroll */}
      <main className="flex-1 overflow-hidden">
        {loading && analysisSteps.length > 0 ? (
          // Progress View
          <div className="h-full flex items-center justify-center p-6">
            <div className="w-full max-w-2xl">
              <AnalysisProgress steps={analysisSteps} currentStep={currentStepIndex} />
            </div>
          </div>
        ) : (
          // Form View - Full Width Grid
          <div className="h-full overflow-y-auto">
            <div className="w-full px-6 py-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  {/* Panel 1: Vendor */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        <CardTitle className="text-sm">Vendor</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="createVendor"
                          checked={createNewVendor}
                          onCheckedChange={(checked) => setCreateNewVendor(checked as boolean)}
                        />
                        <Label htmlFor="createVendor" className="text-xs font-normal cursor-pointer">
                          Nuevo vendor
                        </Label>
                      </div>

                      {createNewVendor ? (
                        <>
                          <div className="space-y-1">
                            <Label htmlFor="vendorName" className="text-xs">Nombre *</Label>
                            <Input
                              id="vendorName"
                              value={vendorName}
                              onChange={(e) => setVendorName(e.target.value)}
                              required
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="vendorWebsite" className="text-xs">Website *</Label>
                            <Input
                              id="vendorWebsite"
                              type="text"
                              value={vendorWebsite}
                              onChange={(e) => setVendorWebsite(e.target.value)}
                              required
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="vendorDescription" className="text-xs">Descripción</Label>
                            <Textarea
                              id="vendorDescription"
                              value={vendorDescription}
                              onChange={(e) => setVendorDescription(e.target.value)}
                              className="h-16 text-xs resize-none"
                            />
                          </div>
                        </>
                      ) : (
                        <div className="space-y-1">
                          <Label htmlFor="vendorId" className="text-xs">Vendor ID *</Label>
                          <Input
                            id="vendorId"
                            value={vendorId}
                            onChange={(e) => setVendorId(e.target.value)}
                            required
                            className="h-8 text-xs"
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Panel 2: Cliente */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        <CardTitle className="text-sm">Cliente</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="createClient"
                          checked={createNewClient}
                          onCheckedChange={(checked) => setCreateNewClient(checked as boolean)}
                          disabled={!vendorId}
                        />
                        <Label htmlFor="createClient" className="text-xs font-normal cursor-pointer">
                          Nuevo cliente
                        </Label>
                      </div>

                      {createNewClient ? (
                        <>
                          <div className="space-y-1">
                            <Label htmlFor="clientName" className="text-xs">Nombre *</Label>
                            <Input
                              id="clientName"
                              value={clientName}
                              onChange={(e) => setClientName(e.target.value)}
                              required
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="clientWebsite" className="text-xs">Website *</Label>
                            <Input
                              id="clientWebsite"
                              type="text"
                              value={clientWebsite}
                              onChange={(e) => setClientWebsite(e.target.value)}
                              required
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label htmlFor="clientCountry" className="text-xs">País</Label>
                              <Input
                                id="clientCountry"
                                value={clientCountry}
                                onChange={(e) => setClientCountry(e.target.value)}
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="clientSector" className="text-xs">Sector</Label>
                              <Input
                                id="clientSector"
                                value={clientSector}
                                onChange={(e) => setClientSector(e.target.value)}
                                className="h-8 text-xs"
                              />
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="space-y-1">
                          <Label htmlFor="clientSelect" className="text-xs">Cliente *</Label>
                          <Select value={clientId} onValueChange={setClientId} required>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>
                            <SelectContent>
                              {existingClients.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Panel 3: Servicio */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <CardTitle className="text-sm">Servicio</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="createService"
                          checked={createNewService}
                          onCheckedChange={(checked) => setCreateNewService(checked as boolean)}
                          disabled={!vendorId}
                        />
                        <Label htmlFor="createService" className="text-xs font-normal cursor-pointer">
                          Nuevo servicio
                        </Label>
                      </div>

                      {createNewService ? (
                        <>
                          <div className="space-y-1">
                            <Label htmlFor="serviceName" className="text-xs">Nombre *</Label>
                            <Input
                              id="serviceName"
                              value={serviceName}
                              onChange={(e) => setServiceName(e.target.value)}
                              required
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="serviceDescription" className="text-xs">Descripción *</Label>
                            <Textarea
                              id="serviceDescription"
                              value={serviceDescription}
                              onChange={(e) => setServiceDescription(e.target.value)}
                              required
                              className="h-16 text-xs resize-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="serviceTags" className="text-xs">Tags</Label>
                            <Input
                              id="serviceTags"
                              value={serviceTags}
                              onChange={(e) => setServiceTags(e.target.value)}
                              placeholder="tag1, tag2, tag3"
                              className="h-8 text-xs"
                            />
                          </div>
                        </>
                      ) : (
                        <div className="space-y-1">
                          <Label htmlFor="serviceSelect" className="text-xs">Servicio *</Label>
                          <Select value={serviceId} onValueChange={setServiceId} required>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>
                            <SelectContent>
                              {existingServices.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Panel 4: Oportunidad */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        <CardTitle className="text-sm">Oportunidad</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1">
                        <Label htmlFor="opportunityContext" className="text-xs">Contexto *</Label>
                        <Textarea
                          id="opportunityContext"
                          value={opportunityContext}
                          onChange={(e) => setOpportunityContext(e.target.value)}
                          required
                          className="h-32 text-xs resize-none"
                          placeholder="Describe el contexto de esta oportunidad..."
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {error && (
                  <Card className="border-destructive bg-destructive/10">
                    <CardContent className="pt-4">
                      <p className="text-sm text-destructive">{error}</p>
                    </CardContent>
                  </Card>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/')}
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading} className="gap-2">
                    {loading ? (
                      <>
                        <Sparkles className="h-4 w-4 animate-pulse" />
                        Generando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Generar Dashboard
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
