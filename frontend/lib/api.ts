import {
  Vendor,
  CreateVendorInput,
  ServiceOffering,
  CreateServiceOfferingInput,
  ClientAccount,
  CreateClientAccountInput,
  Opportunity,
  CreateOpportunityInput,
  OpportunityDossier,
  DossierTextChunk,
  AppendDossierTextInput,
  ClientIntelDashboard,
  CreateDashboardInput,
  CreateOpportunityDashboardInput,
  CreateDashboardResponse,
  AdminSettings,
  DashboardPhase,
  DashboardMetricsFilters,
  DashboardMetricsResponse,
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface APIError {
  error: string;
  code?: string;
  details?: Array<{ field: string; message: string }> | Record<string, unknown>;
  message?: string;
}

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    cache: 'no-store',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorData: APIError = await response.json().catch(() => ({ 
      error: 'Unknown error',
      code: 'UNKNOWN_ERROR'
    }));
    
    // Build user-friendly error message
    let errorMessage = errorData.error || `HTTP error! status: ${response.status}`;
    
    // Add validation details if available
    if (errorData.code === 'VALIDATION_ERROR' && Array.isArray(errorData.details)) {
      const validationErrors = errorData.details.map((d: { field: string; message: string }) => 
        `${d.field}: ${d.message}`
      ).join(', ');
      errorMessage = `Errores de validación: ${validationErrors}`;
    }
    
    // Add specific messages for common error codes
    if (errorData.code === 'NOT_FOUND') {
      errorMessage = `No se encontró el recurso solicitado: ${errorMessage}`;
    } else if (errorData.code === 'LLM_ERROR') {
      errorMessage = `Error en el análisis con IA: ${errorMessage}`;
    }
    
    const error = new Error(errorMessage);
    (error as Error & { code?: string; details?: unknown }).code = errorData.code;
    (error as Error & { code?: string; details?: unknown }).details = errorData.details;
    throw error;
  }

  return response.json();
}

// Health
export async function getHealth() {
  return fetchAPI<{ status: string; timestamp: string; service: string }>('/health');
}

// Vendors
export async function createVendor(input: CreateVendorInput): Promise<Vendor> {
  return fetchAPI<Vendor>('/vendors', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getVendor(vendorId: string): Promise<Vendor> {
  return fetchAPI<Vendor>(`/vendors/${vendorId}`);
}

// Services
export async function createService(
  vendorId: string,
  input: CreateServiceOfferingInput
): Promise<ServiceOffering> {
  return fetchAPI<ServiceOffering>(`/vendors/${vendorId}/services`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getServices(vendorId?: string): Promise<ServiceOffering[]> {
  if (vendorId) {
    return fetchAPI<ServiceOffering[]>(`/vendors/${vendorId}/services`);
  }
  return fetchAPI<ServiceOffering[]>('/services');
}

export async function getService(serviceId: string): Promise<ServiceOffering> {
  return fetchAPI<ServiceOffering>(`/services/${serviceId}`);
}

// Clients
export async function createClient(
  vendorId: string,
  input: CreateClientAccountInput
): Promise<ClientAccount> {
  return fetchAPI<ClientAccount>(`/vendors/${vendorId}/clients`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getClients(vendorId?: string): Promise<ClientAccount[]> {
  if (vendorId) {
    return fetchAPI<ClientAccount[]>(`/vendors/${vendorId}/clients`);
  }
  return fetchAPI<ClientAccount[]>('/clients');
}

export async function getClient(clientId: string): Promise<ClientAccount> {
  return fetchAPI<ClientAccount>(`/clients/${clientId}`);
}

// Dashboard
export async function createDashboard(
  vendorId: string,
  input: CreateDashboardInput
): Promise<CreateDashboardResponse> {
  return fetchAPI<CreateDashboardResponse>(`/vendors/${vendorId}/dashboard`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// Opportunities
export async function createOpportunity(
  vendorId: string,
  input: CreateOpportunityInput
): Promise<Opportunity> {
  return fetchAPI<Opportunity>(`/vendors/${vendorId}/opportunities`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getOpportunities(vendorId?: string): Promise<Opportunity[]> {
  if (vendorId) {
    return fetchAPI<Opportunity[]>(`/vendors/${vendorId}/opportunities`);
  }
  return fetchAPI<Opportunity[]>('/opportunities');
}

export async function getOpportunity(opportunityId: string): Promise<Opportunity> {
  return fetchAPI<Opportunity>(`/opportunities/${opportunityId}`);
}

// Dossier
export async function appendDossierText(
  opportunityId: string,
  input: AppendDossierTextInput,
): Promise<DossierTextChunk> {
  return fetchAPI<DossierTextChunk>(`/opportunities/${opportunityId}/dossier/text`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getOpportunityDossier(
  opportunityId: string,
): Promise<OpportunityDossier> {
  return fetchAPI<OpportunityDossier>(`/opportunities/${opportunityId}/dossier`);
}

export async function uploadDossierFile(
  opportunityId: string,
  file: File,
): Promise<{ fileId: string; originalName: string; size: number; mimetype: string }> {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(
    `${API_BASE_URL}/opportunities/${opportunityId}/dossier/files`,
    {
      method: 'POST',
      body: formData,
    },
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(errorText || 'Error subiendo el archivo');
  }

  return response.json();
}

export async function createOpportunityDashboard(
  input: CreateOpportunityDashboardInput
): Promise<CreateDashboardResponse> {
  const { vendorId, opportunityId, opportunityContextOverride, uploadedDocIds } = input;
  return fetchAPI<CreateDashboardResponse>(
    `/vendors/${vendorId}/opportunities/${opportunityId}/dashboard`,
    {
      method: 'POST',
      body: JSON.stringify({
        opportunityContextOverride,
        uploadedDocIds,
      }),
    }
  );
}

export interface ProgressEvent {
  stepId: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  message?: string;
  progress?: number;
}

export interface DashboardCompleteEvent {
  type: 'complete';
  dashboardId: string;
  dashboard: ClientIntelDashboard;
}

export interface DashboardErrorEvent {
  type: 'error';
  error: string;
}

export type DashboardEvent = ProgressEvent | DashboardCompleteEvent | DashboardErrorEvent;

export function createDashboardWithProgress(
  vendorId: string,
  input: CreateDashboardInput,
  onProgress: (event: ProgressEvent) => void
): Promise<{ dashboardId: string; dashboard: ClientIntelDashboard }> {
  return new Promise((resolve, reject) => {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    
    fetch(`${API_BASE_URL}/vendors/${vendorId}/dashboard?stream=true`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(input),
    })
      .then(async (response) => {
        if (!response.ok) {
          const errorData: APIError = await response.json().catch(() => ({ 
            error: 'Unknown error',
            code: 'UNKNOWN_ERROR'
          }));
          
          let errorMessage = errorData.error || `HTTP error! status: ${response.status}`;
          
          if (errorData.code === 'LLM_ERROR') {
            errorMessage = `Error en el análisis con IA: ${errorMessage}`;
          } else if (errorData.code === 'VALIDATION_ERROR') {
            errorMessage = `Error de validación: ${errorMessage}`;
          }
          
          const error = new Error(errorMessage);
          (error as Error & { code?: string }).code = errorData.code;
          throw error;
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('No response body');
        }

        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.type === 'complete') {
                  resolve({ dashboardId: data.dashboardId, dashboard: data.dashboard });
                  return;
                } else if (data.type === 'error') {
                  reject(new Error(data.error));
                  return;
                } else {
                  // Progress event
                  onProgress(data as ProgressEvent);
                }
              } catch (e) {
                console.error('Error parsing SSE data:', e);
              }
            }
          }
        }
      })
      .catch(reject);
  });
}

export function createOpportunityDashboardWithProgress(
  input: CreateOpportunityDashboardInput,
  onProgress: (event: ProgressEvent) => void
): Promise<{ dashboardId: string; dashboard: ClientIntelDashboard }> {
  return new Promise((resolve, reject) => {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

    fetch(
      `${API_BASE_URL}/vendors/${input.vendorId}/opportunities/${input.opportunityId}/dashboard?stream=true`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          opportunityContextOverride: input.opportunityContextOverride,
          uploadedDocIds: input.uploadedDocIds,
        }),
      }
    )
      .then(async (response) => {
        if (!response.ok) {
          const errorData: APIError = await response.json().catch(() => ({
            error: 'Unknown error',
            code: 'UNKNOWN_ERROR',
          }));

          let errorMessage = errorData.error || `HTTP error! status: ${response.status}`;

          if (errorData.code === 'LLM_ERROR') {
            errorMessage = `Error en el análisis con IA: ${errorMessage}`;
          } else if (errorData.code === 'VALIDATION_ERROR') {
            errorMessage = `Error de validación: ${errorMessage}`;
          }

          const error = new Error(errorMessage);
          (error as Error & { code?: string }).code = errorData.code;
          throw error;
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('No response body');
        }

        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === 'complete') {
                  resolve({ dashboardId: data.dashboardId, dashboard: data.dashboard });
                  return;
                } else if (data.type === 'error') {
                  reject(new Error(data.error));
                  return;
                } else {
                  onProgress(data as ProgressEvent);
                }
              } catch (e) {
                console.error('Error parsing SSE data:', e);
              }
            }
          }
        }
      })
      .catch(reject);
  });
}

export async function getDashboard(dashboardId: string): Promise<ClientIntelDashboard> {
  return fetchAPI<ClientIntelDashboard>(`/dashboard/${dashboardId}`);
}

export async function getLatestDashboardForOpportunity(
  opportunityId: string,
): Promise<ClientIntelDashboard> {
  return fetchAPI<ClientIntelDashboard>(`/opportunities/${opportunityId}/dashboard/latest`);
}

export interface DashboardSummary {
  id: string;
  vendorId: string;
  clientId: string;
  serviceOfferingId: string;
  opportunityId: string;
  opportunityName?: string;
  clientName: string;
  industry: string;
  opportunityBrief: string;
  fitScore: number;
  overallFit: 'high' | 'medium' | 'low';
  generatedAt: string;
  llmModelUsed: string;
}

export async function getAllDashboards(vendorId?: string): Promise<DashboardSummary[]> {
  const url = vendorId ? `/dashboards?vendorId=${vendorId}` : '/dashboards';
  const response = await fetchAPI<{ dashboards: DashboardSummary[] }>(url);
  return response.dashboards;
}

export async function retryDashboardPhase(
  params: {
    vendorId: string;
    opportunityId: string;
    phase: DashboardPhase;
    opportunityContextOverride?: string | null;
    uploadedDocIds?: string[];
  },
): Promise<CreateDashboardResponse> {
  const { vendorId, opportunityId, phase, opportunityContextOverride, uploadedDocIds } = params;
  return fetchAPI<CreateDashboardResponse>(
    `/vendors/${vendorId}/opportunities/${opportunityId}/phases/${phase}/retry`,
    {
      method: 'POST',
      body: JSON.stringify({
        opportunityContextOverride,
        uploadedDocIds,
      }),
    },
  );
}

function buildAdminHeaders(adminToken?: string): HeadersInit | undefined {
  if (!adminToken) {
    return undefined;
  }
  return {
    'x-admin-token': adminToken,
  };
}

export async function getAdminSettings(adminToken?: string): Promise<AdminSettings> {
  return fetchAPI<AdminSettings>('/admin/settings', {
    headers: buildAdminHeaders(adminToken),
  });
}

export async function updateAdminSettings(
  payload: AdminSettings,
  adminToken?: string,
): Promise<AdminSettings> {
  return fetchAPI<AdminSettings>('/admin/settings', {
    method: 'PUT',
    headers: buildAdminHeaders(adminToken),
    body: JSON.stringify(payload),
  });
}

export async function resetAdminSettings(adminToken?: string): Promise<AdminSettings> {
  return fetchAPI<AdminSettings>('/admin/settings/reset', {
    method: 'POST',
    headers: buildAdminHeaders(adminToken),
  });
}

export async function getDashboardMetrics(
  filters: DashboardMetricsFilters,
  adminToken?: string,
): Promise<DashboardMetricsResponse> {
  const params = new URLSearchParams();
  if (filters.from) {
    params.set('from', filters.from);
  }
  if (filters.to) {
    params.set('to', filters.to);
  }
  if (filters.vendorId) {
    params.set('vendorId', filters.vendorId);
  }
  if (filters.clientId) {
    params.set('clientId', filters.clientId);
  }
  if (filters.model) {
    params.set('model', filters.model);
  }
  if (filters.status) {
    params.set('status', filters.status);
  }

  const queryString = params.toString();
  const endpoint = queryString ? `/admin/metrics?${queryString}` : '/admin/metrics';

  return fetchAPI<DashboardMetricsResponse>(endpoint, {
    headers: buildAdminHeaders(adminToken),
  });
}

