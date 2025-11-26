'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="w-full flex h-14 items-center px-6 justify-between">
          <h1 className="text-xl font-semibold">ClientIntel Dashboard</h1>
          <div className="flex items-center gap-3">
            <Link href="/opportunities">
              <Button variant="ghost" size="sm">Oportunidades</Button>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-4">
            ClientIntel Dashboard
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            AI-powered client intelligence dashboard for B2B sales
          </p>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Backend Status</CardTitle>
              <CardDescription>Estado de conexión con el backend</CardDescription>
            </CardHeader>
            <CardContent>
              {loading && <p className="text-muted-foreground">Checking backend...</p>}
              {error && (
                <div className="text-destructive">
                  <p className="font-semibold">Error connecting to backend:</p>
                  <p>{error}</p>
                  <p className="text-sm mt-2 text-muted-foreground">Make sure the backend is running on http://localhost:3001</p>
                </div>
              )}
              {health && (
                <div className="text-green-600 dark:text-green-400">
                  <p className="font-semibold">✓ Backend is healthy</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Service: {health.service} | Status: {health.status} | Time: {new Date(health.timestamp).toLocaleString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Link href="/clients/new">
              <Button size="lg" className="text-lg px-8 py-6">
                Crear nuevo análisis de cliente
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

