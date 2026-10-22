import { Cookie, ShieldCheck, Eye, AlertTriangle, X } from 'lucide-react';
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
                <ShieldCheck className="h-5 w-5 text-brand" />
                2. Tipos de Cookies que Usamos
              </CardTitle>
              <CardDescription>Categorías y propósitos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground-muted leading-relaxed">
              <dl className="space-y-4">
                <div>
                  <dt className="font-semibold text-brand">Esenciales (Obligatorias)</dt>
                  <dd className="text-foreground-muted mt-1">Sesión, autenticación, seguridad, carrito. No se pueden desactivar.</dd>
                </div>
                <div>
                  <dt className="font-semibold text-brand">Analíticas</dt>
                  <dd className="text-foreground-muted mt-1">Google Analytics / interno: páginas vistas, tiempo, errores. Anónimas.</dd>
                </div>
                <div>
                  <dt className="font-semibold text-brand">Preferencias</dt>
                  <dd className="text-foreground-muted mt-1">Idioma, moneda, tema (claro/oscuro), región.</dd>
                </div>
                <div>
                  <dt className="font-semibold text-brand">Marketing (Opcionales)</dt>
                  <dd className="text-foreground-muted mt-1">Personalización de ofertas. Solo con consentimiento explícito.</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-brand" />
                3. Cookies de Terceros
              </CardTitle>
              <CardDescription>Proveedores externos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground-muted leading-relaxed">
              <p>Usamos: Google Analytics (análisis), Stripe (pagos), proveedores de envío (tracking). Cada uno tiene su propia política de cookies.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-brand" />
                5. Consecuencias de Desactivar
              </CardTitle>
              <CardDescription>Qué ocurre si bloqueas cookies.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground-muted leading-relaxed">
              <ul className="list-disc pl-6 space-y-2">
                <li>Esenciales bloqueadas: el sitio no funcionará (carrito, login, checkout).</li>
                <li>Analíticas bloqueadas: no podremos mejorar la UX basada en datos reales.</li>
                <li>Preferencias bloqueadas: se resetearán idioma, moneda, tema en cada visita.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <X className="h-5 w-5 text-brand" />
                7. Cómo Eliminar Cookies
              </CardTitle>
              <CardDescription>Pasos por navegador.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground-muted leading-relaxed">
              <p><span className="font-bold">Chrome:</span> Configuración &gt; Privacidad &gt; Cookies &gt; Ver/Eliminar.</p>
              <p><span className="font-bold">Firefox:</span> Opciones &gt; Privacidad &gt; Cookies &gt; Gestionar.</p>
              <p><span className="font-bold">Safari:</span> Preferencias &gt; Privacidad &gt; Gestionar datos.</p>
              <p><span className="font-bold">Edge:</span> Configuración &gt; Cookies &gt; Ver todas.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-brand" />
                8. Contacto
              </CardTitle>
              <CardDescription>Dudas sobre cookies.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground-muted leading-relaxed">
              <p>Para dudas sobre esta política: cookies@zentric.com</p>
            </CardContent>
          </Card>

        </div>

        <footer className="mt-16 pt-8 border-t border-border text-center text-sm text-foreground-muted">
          <p>© 2026 Zentric Marketplace. Todos los derechos reservados.
          </p>
        </footer>
      </main>
    </PublicLayout>
  );
}