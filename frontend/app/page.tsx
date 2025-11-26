'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AppShell } from '@/components/app-shell';
import { getHealth } from '@/lib/api';

export default function Home() {
  const [health, setHealth] = useState<{ status: string; timestamp: string; service: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell
      title="Inicio"
      description="Estado general del sistema y accesos rápidos"
      actions={
        <Link href="/opportunities/new">
          <Button size="sm">Nueva oportunidad</Button>
        </Link>
      }
    >
      <div className="max-w-4xl space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">ClientIntel Dashboard</h1>
          <p className="text-xl text-muted-foreground">
            Inteligencia comercial asistida por IA para oportunidades B2B.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Estado del backend</CardTitle>
            <CardDescription>Verifica la conectividad con los servicios core.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && <p className="text-muted-foreground">Comprobando backend...</p>}
            {error && (
              <div className="text-destructive">
                <p className="font-semibold">Error al conectar con el backend:</p>
                <p>{error}</p>
                <p className="text-sm mt-2 text-muted-foreground">
                  Asegúrate de que el backend está activo en http://localhost:3001
                </p>
              </div>
            )}
            {health && (
              <div className="text-green-600 dark:text-green-400">
                <p className="font-semibold">✓ Backend operativo</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Servicio: {health.service} · Estado: {health.status} · Hora:{' '}
                  {new Date(health.timestamp).toLocaleString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próximos pasos</CardTitle>
            <CardDescription>Comienza siempre desde una oportunidad B2B.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Link href="/opportunities/new" className="flex-1">
              <Button size="lg" className="w-full gap-2 justify-center">
                Crear oportunidad
              </Button>
            </Link>
            <Link href="/opportunities" className="flex-1">
              <Button variant="outline" size="lg" className="w-full gap-2 justify-center">
                Ver oportunidades
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

