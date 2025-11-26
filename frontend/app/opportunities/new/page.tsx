'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Button,
} from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  createVendor,
  createClient,
  createService,
  getClients,
  getServices,
  createOpportunity,
} from '@/lib/api';
import type {
  ClientAccount,
  ServiceOffering,
} from '@/lib/types';
import {
  Building2,
  Briefcase,
  FileText,
  Target,
  Sparkles,
} from 'lucide-react';

export default function NewOpportunityPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Vendor
  const [createNewVendor, setCreateNewVendor] = useState(true);
  const [vendorId, setVendorId] = useState('');
  const [vendorName, setVendorName] = useState('Indra Sistemas');
  const [vendorWebsite, setVendorWebsite] = useState('https://www.indracompany.com');
  const [vendorDescription, setVendorDescription] = useState(
    'Indra es una de las principales empresas globales de tecnología y consultoría.'
  );
  // Client
  const [createNewClient, setCreateNewClient] = useState(true);
  const [clientId, setClientId] = useState('');
  const [clientName, setClientName] = useState('Telefónica');
  const [clientWebsite, setClientWebsite] = useState('https://www.telefonica.com');
  const [clientCountry, setClientCountry] = useState('España');
  const [clientSector, setClientSector] = useState('Telecomunicaciones');
  const [existingClients, setExistingClients] = useState<ClientAccount[]>([]);

  // Service
  const [createNewService, setCreateNewService] = useState(true);
  const [serviceId, setServiceId] = useState('');
  const [serviceName, setServiceName] = useState('Plataforma de Transformación Digital');
  const [serviceDescription, setServiceDescription] = useState(
    'Solución integral de modernización tecnológica, automatización e IA.'
  );
  const [serviceTags, setServiceTags] = useState('consultoria, ia, cloud');
  const [existingServices, setExistingServices] = useState<ServiceOffering[]>([]);

  // Opportunity
  const [opportunityName, setOpportunityName] = useState('Transformación Telefónica 2025');
  const [opportunityDeadline, setOpportunityDeadline] = useState('');
  const [opportunityValue, setOpportunityValue] = useState('');
  const [opportunityCurrency, setOpportunityCurrency] = useState('EUR');
  const [opportunityNotes, setOpportunityNotes] = useState(
    'Telefónica busca acelerar la transformación digital en 2025 con un partner estratégico.'
  );

  useEffect(() => {
    if (!createNewVendor && vendorId) {
      void loadVendorDependencies(vendorId);
    }
  }, [createNewVendor, vendorId]);

  const loadVendorDependencies = async (vendor: string) => {
    try {
      const [clients, services] = await Promise.all([
        getClients(vendor),
        getServices(vendor),
      ]);
      setExistingClients(clients);
      setExistingServices(services);
    } catch (err) {
      console.error('Error loading vendor dependencies', err);
      setExistingClients([]);
      setExistingServices([]);
    }
  };

  const sanitizeCurrency = (value: string) => value.trim().toUpperCase().slice(0, 3);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let finalVendorId = vendorId;
      let finalClientId = clientId;
      let finalServiceId = serviceId;

      if (createNewVendor) {
        const vendor = await createVendor({
          name: vendorName.trim(),
          websiteUrl: vendorWebsite.trim(),
          description: vendorDescription || undefined,
        });
        finalVendorId = vendor.id;
      } else if (!vendorId) {
        throw new Error('Debes indicar el ID del vendor.');
      }

      if (createNewClient) {
        const client = await createClient(finalVendorId, {
          vendorId: finalVendorId,
          name: clientName.trim(),
          websiteUrl: clientWebsite.trim(),
          country: clientCountry || undefined,
          sectorHint: clientSector || undefined,
        });
        finalClientId = client.id;
      } else if (!clientId) {
        throw new Error('Selecciona un cliente existente.');
      }

      if (createNewService) {
        const tags = serviceTags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean);
        const service = await createService(finalVendorId, {
          vendorId: finalVendorId,
          name: serviceName.trim(),
          shortDescription: serviceDescription.trim(),
          categoryTags: tags,
        });
        finalServiceId = service.id;
      } else if (!serviceId) {
        throw new Error('Selecciona un servicio existente.');
      }

      const opportunity = await createOpportunity(finalVendorId, {
        clientId: finalClientId,
        serviceOfferingId: finalServiceId,
        name: opportunityName.trim(),
        estimatedValue: opportunityValue ? Number(opportunityValue) : undefined,
        currency: opportunityCurrency ? sanitizeCurrency(opportunityCurrency) : undefined,
        deadline: opportunityDeadline
          ? new Date(opportunityDeadline).toISOString()
          : undefined,
        notes: opportunityNotes.trim() || undefined,
      });

      if (typeof window !== 'undefined') {
        window.localStorage.setItem('cliint:lastVendorId', finalVendorId);
      }

      router.push(`/opportunities/${opportunity.id}`);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Error inesperado al crear la oportunidad';
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 shrink-0">
        <div className="w-full flex h-14 items-center px-6 justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                ← Inicio
              </Button>
            </Link>
            <h1 className="text-xl font-semibold">Nueva oportunidad</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                Admin
              </Button>
            </Link>
            <Link href="/opportunities">
              <Button variant="ghost" size="sm">
                Oportunidades
              </Button>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-6xl mx-auto space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Base comercial</CardTitle>
              <CardDescription>
                Define vendor, cliente y servicio antes de registrar la oportunidad.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Vendor */}
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
                          id="newVendor"
                          checked={createNewVendor}
                          onCheckedChange={(checked) =>
                            setCreateNewVendor(checked as boolean)
                          }
                        />
                        <Label htmlFor="newVendor" className="text-xs font-normal">
                          Crear nuevo vendor
                        </Label>
                      </div>
                      {createNewVendor ? (
                        <>
                          <div className="space-y-1">
                            <Label htmlFor="vendorName" className="text-xs">
                              Nombre *
                            </Label>
                            <Input
                              id="vendorName"
                              value={vendorName}
                              onChange={(e) => setVendorName(e.target.value)}
                              required
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="vendorWebsite" className="text-xs">
                              Website *
                            </Label>
                            <Input
                              id="vendorWebsite"
                              value={vendorWebsite}
                              onChange={(e) => setVendorWebsite(e.target.value)}
                              required
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="vendorDescription" className="text-xs">
                              Descripción
                            </Label>
                            <Textarea
                              id="vendorDescription"
                              value={vendorDescription}
                              onChange={(e) => setVendorDescription(e.target.value)}
                              className="h-20 text-xs resize-none"
                            />
                          </div>
                        </>
                      ) : (
                        <div className="space-y-1">
                          <Label htmlFor="vendorId" className="text-xs">
                            Vendor ID *
                          </Label>
                          <Input
                            id="vendorId"
                            value={vendorId}
                            onChange={(e) => setVendorId(e.target.value)}
                            placeholder="vendor_xxx"
                            required
                            className="h-8 text-xs"
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Client */}
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
                          id="newClient"
                          checked={createNewClient}
                          onCheckedChange={(checked) =>
                            setCreateNewClient(checked as boolean)
                          }
                          disabled={createNewVendor && !vendorId}
                        />
                        <Label htmlFor="newClient" className="text-xs font-normal">
                          Crear nuevo cliente
                        </Label>
                      </div>
                      {createNewClient ? (
                        <>
                          <div className="space-y-1">
                            <Label htmlFor="clientName" className="text-xs">
                              Nombre *
                            </Label>
                            <Input
                              id="clientName"
                              value={clientName}
                              onChange={(e) => setClientName(e.target.value)}
                              required
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="clientWebsite" className="text-xs">
                              Website *
                            </Label>
                            <Input
                              id="clientWebsite"
                              value={clientWebsite}
                              onChange={(e) => setClientWebsite(e.target.value)}
                              required
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label htmlFor="clientCountry" className="text-xs">
                                País
                              </Label>
                              <Input
                                id="clientCountry"
                                value={clientCountry}
                                onChange={(e) => setClientCountry(e.target.value)}
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="clientSector" className="text-xs">
                                Sector
                              </Label>
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
                            <Label className="text-xs">Cliente *</Label>
                            <Select value={clientId} onValueChange={setClientId}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Selecciona un cliente" />
                              </SelectTrigger>
                              <SelectContent>
                                {existingClients.map((client) => (
                                  <SelectItem key={client.id} value={client.id}>
                                    {client.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Service */}
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
                          id="newService"
                          checked={createNewService}
                          onCheckedChange={(checked) =>
                            setCreateNewService(checked as boolean)
                          }
                          disabled={createNewVendor && !vendorId}
                        />
                      <Label htmlFor="newService" className="text-xs font-normal">
                        Crear nuevo servicio
                      </Label>
                      </div>
                      {createNewService ? (
                        <>
                          <div className="space-y-1">
                            <Label htmlFor="serviceName" className="text-xs">
                              Nombre *
                            </Label>
                            <Input
                              id="serviceName"
                              value={serviceName}
                              onChange={(e) => setServiceName(e.target.value)}
                              required
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="serviceDescription" className="text-xs">
                              Descripción *
                            </Label>
                            <Textarea
                              id="serviceDescription"
                              value={serviceDescription}
                              onChange={(e) => setServiceDescription(e.target.value)}
                              required
                              className="h-20 text-xs resize-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="serviceTags" className="text-xs">
                              Tags
                            </Label>
                            <Input
                              id="serviceTags"
                              value={serviceTags}
                              onChange={(e) => setServiceTags(e.target.value)}
                              placeholder="tag1, tag2..."
                              className="h-8 text-xs"
                            />
                          </div>
                        </>
                      ) : (
                          <div className="space-y-1">
                            <Label className="text-xs">Servicio *</Label>
                            <Select value={serviceId} onValueChange={setServiceId}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Selecciona un servicio" />
                              </SelectTrigger>
                              <SelectContent>
                                {existingServices.map((service) => (
                                  <SelectItem key={service.id} value={service.id}>
                                    {service.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Opportunity */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        <CardTitle className="text-sm">Oportunidad</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1">
                        <Label htmlFor="opportunityName" className="text-xs">
                          Nombre *
                        </Label>
                        <Input
                          id="opportunityName"
                          value={opportunityName}
                          onChange={(e) => setOpportunityName(e.target.value)}
                          required
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label htmlFor="deadline" className="text-xs">
                            Deadline
                          </Label>
                          <Input
                            id="deadline"
                            type="date"
                            value={opportunityDeadline}
                            onChange={(e) => setOpportunityDeadline(e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="estimatedValue" className="text-xs">
                            Valor estimado (€)
                          </Label>
                          <Input
                            id="estimatedValue"
                            type="number"
                            min="0"
                            value={opportunityValue}
                            onChange={(e) => setOpportunityValue(e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="currency" className="text-xs">
                          Divisa
                        </Label>
                        <Input
                          id="currency"
                          value={opportunityCurrency}
                          onChange={(e) => setOpportunityCurrency(e.target.value)}
                          maxLength={3}
                          className="h-8 text-xs uppercase"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="opportunityNotes" className="text-xs">
                          Notas / Contexto
                        </Label>
                        <Textarea
                          id="opportunityNotes"
                          value={opportunityNotes}
                          onChange={(e) => setOpportunityNotes(e.target.value)}
                          className="h-24 text-xs resize-none"
                          placeholder="Describe motivaciones, stakeholders o inputs clave..."
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

                <div className="flex items-center justify-end gap-3">
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
                        Registrando oportunidad...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Crear oportunidad
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}


