import { useCallback, useEffect, useState } from 'react';
import { getClients } from '@/lib/api';
import type { ClientAccount } from '@/lib/types';
import { logger } from '@/lib/logger';

interface UseClientsOptions {
  vendorId?: string;
  autoLoad?: boolean;
}

export function useClients(options: UseClientsOptions = {}) {
  const { vendorId, autoLoad = true } = options;
  const [clients, setClients] = useState<ClientAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getClients(vendorId);
      setClients(data);
      logger.info('Clients loaded', { count: data.length, vendorId: vendorId ?? 'all' });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error desconocido al cargar clientes';
      setError(message);
      logger.error('Failed to load clients', { message, vendorId: vendorId ?? 'all' });
    } finally {
      setLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    if (autoLoad) {
      void refresh();
    }
  }, [autoLoad, refresh]);

  return {
    clients,
    loading,
    error,
    refresh,
  };
}


