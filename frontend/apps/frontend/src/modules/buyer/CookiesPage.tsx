import { Cookie, ShieldCheck, Eye, AlertTriangle, Settings, X } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@zentric/ui';
import { PublicLayout } from '../../app/layouts/PublicLayout';

/**
 * Política de Cookies
 * Doctrina visual anti-IA genérica.
 */
export function CookiesPage() {
  return (
    <PublicLayout>
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <header className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-4 py-2 text-sm font-semibold text-brand mb-6">
            <Cookie className="h-4 w-4" />
            <span>Política de Cookies</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Política de Cookies
          </h1>
          <p className="mt-4 text-lg text-foreground-muted max-w-2xl mx-auto">
            Última actualización: Enero 2026. Explicamos qué cookies usamos y cómo gestionarlas.
          </p>
        </header>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cookie className="h-5 w-5 text-brand" />
                1. Qué son las Cookies
              </CardTitle>
              <CardDescription>Definición y propósito.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground-muted leading-relaxed">
              <p>Las cookies son pequeños archivos de texto que se almacenan en tu dispositivo al visitar un sitio web. Permiten recordar tus preferencias, mantener tu sesión activa y analizar el uso del sitio para mejorarlo.
            </CardContent>
          </Card>