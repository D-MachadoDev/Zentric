import { ShieldCheck, FileText, Cookie, Scale, Truck, RotateCcw, Gavel, Mail, Lock, Eye, AlertTriangle, Globe, UserCheck } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@zentric/ui';
import { PublicLayout } from '../../app/layouts/PublicLayout';

/**
 * Política de Privacidad (Privacy Policy)
 * Doctrina visual anti-IA genérica.
 */
export function PrivacyPage() {
  return (
    <PublicLayout>
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <header className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-4 py-2 text-sm font-semibold text-brand mb-6">
            <Lock className="h-4 w-4" />
            <span>Política de Privacidad</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Política de Privacidad
          </h1>
          <p className="mt-4 text-lg text-foreground-muted max-w-2xl mx-auto">
            Última actualización: Enero 2026. Tu privacidad es importante para nosotros.
          </p>
        </header>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-brand" />
                1. Datos que Recopilamos
              </CardTitle>
              <CardDescription>Información que recogemos cuando usas Zentric Marketplace.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground-muted leading-relaxed">
              <p>Recopilamos información que nos proporcionas directamente (nombre, email, dirección, teléfono al registrarte o comprar) y datos de uso automáticos (IP, navegador, páginas visitadas, preferencias).</p>
              <p>No vendemos tus datos personales a terceros. Los usamos solo para procesar pedidos, mejorar la experiencia y cumplir obligaciones legales.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-brand" />
                2. Cómo Usamos tu Información
              </CardTitle>
              <CardDescription>Finalidades del tratamiento de datos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground-muted leading-relaxed">
              <ul className="list-disc pl-6 space-y-2">
                <li>Procesar y gestionar tus pedidos</li>
                <li>Enviar confirmaciones y actualizaciones de estado</li>
                <li>Mejorar la plataforma y personalizar tu experiencia</li>
                <li>Cumplir obligaciones legales y fiscales</li>
                <li>Prevenir fraude y garantizar seguridad</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-brand" />
                4. Compartir con Terceros
              </CardTitle>
              <CardDescription>Cuándo y con quién compartimos información.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground-muted leading-relaxed">
              <p>Solo compartimos datos con: proveedores de pagos (para procesar transacciones), transportistas (para entregas), autoridades legales (cuando la ley lo exija). Nunca vendemos datos a anunciantes.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-brand" />
                5. Tus Derechos
              </CardTitle>
              <CardDescription>Acceso, rectificación, supresión, portabilidad, oposición.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground-muted leading-relaxed">
              <p>Puedes ejercer tus derechos contactando a privacy@zentric.com. Responderemos en un plazo máximo de 30 días según la normativa aplicable.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cookie className="h-5 w-5 text-brand" />
                6. Cookies y Tecnologías Similares
              </CardTitle>
              <CardDescription>Uso de cookies esenciales, analíticas y de preferencias.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground-muted leading-relaxed">
              <p>Usamos cookies esenciales (sesión, seguridad), analíticas (mejora de UX) y de preferencias (idioma, moneda). Puedes gestionarlas en la configuración de tu navegador.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-brand" />
                7. Menores de Edad
              </CardTitle>
              <CardDescription>Política para usuarios menores de 18 años.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground-muted leading-relaxed">
              <p>Zentric Marketplace no está dirigido a menores de 18 años. No recopilamos intencionalmente datos de menores. Si detectamos que un menor nos ha proporcionado datos, los eliminaremos.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-brand" />
                8. Cambios y Contacto
              </CardTitle>
              <CardDescription>Actualizaciones a esta política y cómo contactarnos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground-muted leading-relaxed">
              <p>Podemos actualizar esta política. Los cambios se publicarán aquí con la fecha de revisión. Para dudas: privacy@zentric.com.</p>
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