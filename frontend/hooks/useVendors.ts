import { useCallback, useEffect, useState } from 'react';
import { getVendors } from '@/lib/api';
import type { Vendor } from '@/lib/types';
import { logger } from '@/lib/logger';

interface UseVendorsOptions {
  autoLoad?: boolean;
}

export function useVendors(options: UseVendorsOptions = {}) {
  const { autoLoad = true } = options;
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getVendors();
      setVendors(data);
      logger.info('Vendors loaded', { count: data.length });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error desconocido al cargar vendors';
      setError(message);
      logger.error('Failed to load vendors', { message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoLoad) {
      void refresh();
    }
  }, [autoLoad, refresh]);

  return {
    vendors,
    loading,
    error,
    refresh,
  };
}


