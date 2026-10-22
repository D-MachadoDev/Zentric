import { ShieldCheck, FileText, Cookie, Scale, Truck, Gavel, Mail } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@zentric/ui';
import { PublicLayout } from '../../app/layouts/PublicLayout';

/**
 * Página de Términos y Condiciones (Terms of Service)
 * Doctrina visual anti-IA genérica:
 * - Neutros tintados, acento único #00D4AA, Geist Sans/Mono
 * - Sin gradientes perezosos, sin neones
 */
export function TermsPage() {
  return (
    <PublicLayout>
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <header className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-4 py-2 text-sm font-semibold text-brand-strong mb-6">
            <Gavel className="h-4 w-4" />
            <span>Términos y Condiciones</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Términos y Condiciones de Uso
          </h1>
          <p className="mt-4 text-lg text-foreground-muted max-w-2xl mx-auto">
            Última actualización: Enero 2026. Al usar Zentric Marketplace, aceptas estos términos.
          </p>
        </header>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-brand" />
                1. Aceptación de los Términos
              </CardTitle>
              <CardDescription>Al acceder y usar Zentric Marketplace, aceptas vincularte a estos términos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground-muted leading-relaxed">
              <p>Al crear una cuenta o realizar una compra en Zentric Marketplace, confirmas que has leído, entendido y aceptado estos Términos y Condiciones, así como nuestra Política de Privacidad y Política de Cookies.</p>
              <p>Si no estás de acuerdo con alguna parte de estos términos, no debes usar nuestros servicios.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-brand" />
                2. Cuentas de Usuario y Seguridad
              </CardTitle>
              <CardDescription>Responsabilidades del usuario sobre su cuenta.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground-muted leading-relaxed">
              <p>Eres responsable de mantener la confidencialidad de tus credenciales de acceso y de todas las actividades que ocurran bajo tu cuenta.</p>
              <p>Debes notificarnos inmediatamente de cualquier uso no autorizado de tu cuenta.</p>
              <p>Nos reservamos el derecho de suspender o cerrar cuentas que violen estos términos.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cookie className="h-5 w-5 text-brand" />
                3. Compras, Pagos y Reservas
              </CardTitle>
              <CardDescription>Proceso de compra, reserva de 15 minutos y políticas de pago.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground-muted leading-relaxed">
              <p>Al agregar productos al carrito y proceder al checkout, se inicia una reserva de inventario de 15 minutos. Durante este tiempo, los productos quedan reservados para ti.</p>
              <p>El pago debe completarse dentro de la ventana de 15 minutos. Si el pago no se confirma, la reserva se libera y los productos vuelven a estar disponibles.</p>
              <p>Los precios mostrados incluyen impuestos aplicables. Los costos de envío se calculan en el checkout.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-brand" />
                4. Envíos, Entregas y Devoluciones
              </CardTitle>
              <CardDescription>Políticas de envío, inspección y devolución segura.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground-muted leading-relaxed">
              <p>Los envíos se realizan desde nuestra red de bodegas certificadas. Los tiempos de entrega varían según la ubicación.</p>
              <p>Tienes derecho a solicitar devolución dentro de los plazos legales. Los productos físicos pasan por inspección técnica en bodega antes de procesar el reembolso.</p>
              <p>Los productos digitales se entregan instantáneamente tras la confirmación del pago.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-brand" />
                5. Propiedad Intelectual
              </CardTitle>
              <CardDescription>Derechos sobre contenido, marcas y tecnología de la plataforma.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground-muted leading-relaxed">
              <p>Todo el contenido de Zentric Marketplace (textos, imágenes, logos, software, diseño) es propiedad de Zentric o de sus licenciantes y está protegido por leyes de propiedad intelectual.</p>
              <p>Queda prohibida la reproducción, distribución o modificación sin autorización expresa por escrito.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-brand" />
                6. Limitación de Responsabilidad
              </CardTitle>
              <CardDescription>Exclusiones y límites de responsabilidad legal.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground-muted leading-relaxed">
              <p>Zentric Marketplace actúa como intermediario entre compradores y vendedores. No somos responsables por:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Productos defectuosos o que no cumplen descripciones (responsabilidad del vendedor)</li>
                <li>Retrasos en envíos por causas de fuerza mayor</li>
                <li>Daños indirectos, incidentales o consecuentes</li>
              </ul>
              <p>Nuestra responsabilidad total se limita al monto de la transacción en cuestión.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-brand" />
                7. Modificaciones y Terminación
              </CardTitle>
              <CardDescription>Cambios a los términos y cierre de cuenta.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground-muted leading-relaxed">
              <p>Podemos modificar estos términos en cualquier momento. Los cambios entrarán en vigor tras su publicación en esta página.</p>
              <p>Podemos suspender o terminar tu acceso a la plataforma por violación de estos términos, fraude o inactividad prolongada.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-brand" />
                8. Ley Aplicable y Jurisdicción
              </CardTitle>
              <CardDescription>Marco legal aplicable.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground-muted leading-relaxed">
              <p>Estos términos se rigen por las leyes de la República de Colombia. Cualquier disputa se resolverá en los tribunales competentes de Bogotá D.C.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-brand" />
                9. Contacto
              </CardTitle>
              <CardDescription>Para dudas sobre estos términos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground-muted leading-relaxed">
              <p>Si tienes preguntas sobre estos Términos y Condiciones, contáctanos:</p>
              <address className="not-italic space-y-1">
                <p>Zentric Marketplace S.A.S.</p>
                <p>Email: legal@zentric.com</p>
                <p>Dirección: Carrera 7 # 71-21, Bogotá D.C., Colombia</p>
              </address>
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