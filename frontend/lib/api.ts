import {
  Vendor,
  CreateVendorInput,
  ServiceOffering,
  CreateServiceOfferingInput,
  ClientAccount,
  CreateClientAccountInput,
  ClientIntelDashboard,
  CreateDashboardInput,
  CreateDashboardResponse,
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
    ...options,
    headers: {
      'Content-Type': 'application/json',
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

export async function getServices(vendorId: string): Promise<ServiceOffering[]> {
  return fetchAPI<ServiceOffering[]>(`/vendors/${vendorId}/services`);
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

export async function getClients(vendorId: string): Promise<ClientAccount[]> {
  return fetchAPI<ClientAccount[]>(`/vendors/${vendorId}/clients`);
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

export async function getDashboard(dashboardId: string): Promise<ClientIntelDashboard> {
  return fetchAPI<ClientIntelDashboard>(`/dashboard/${dashboardId}`);
}

export interface DashboardSummary {
  id: string;
  vendorId: string;
  clientId: string;
  serviceOfferingId: string;
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

