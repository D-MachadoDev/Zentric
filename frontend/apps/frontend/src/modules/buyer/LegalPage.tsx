import { Scale, FileText, ShieldCheck, Mail, Gavel, Building, AlertTriangle, ExternalLink, CheckCircle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@zentric/ui';
import { PublicLayout } from '../../app/layouts/PublicLayout';

/**
 * Aviso Legal (Legal Notice)
 * Doctrina visual anti-IA genérica.
 */
export function LegalPage() {
  return (
    <PublicLayout>
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <header className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-4 py-2 text-sm font-semibold text-brand mb-6">
            <Gavel className="h-4 w-4" />
            <span>Aviso Legal</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Aviso Legal
          </h1>
          <p className="mt-4 text-lg text-foreground-muted max-w-2xl mx-auto">
            Información legal de Zentric Marketplace. Última actualización: Enero 2026.
          </p>
        </header>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5 text-brand" />
                1. Datos del Responsable
              </CardTitle>
              <CardDescription>Identificación del titular de la plataforma.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground-muted leading-relaxed">
              <p><strong>Denominación social:</strong> Zentric Marketplace S.A.S.</p>
              <p><strong>NIT:</strong> 900.123.456-7</p>
              <p><strong>Domicilio social:</strong> Carrera 7 # 71-21, Bogotá D.C., Colombia</p>
              <p><strong>Email:</strong> legal@zentric.com</p>
              <p><strong>Teléfono:</strong> +57 1 234 5678</p>
              <p><strong>Registro Mercantil:</strong> Cámara de Comercio de Bogotá, Matrícula N° 1234567</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-brand" />
                2. Objeto y Ámbito de Aplicación
              </CardTitle>
              <CardDescription>Qué regula este aviso legal.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground-muted leading-relaxed">
              <p>El presente Aviso Legal regula el acceso y uso de la plataforma Zentric Marketplace (en adelante, \"la Plataforma\"), accesible a través del dominio zentric.com y subdominios asociados.</              <p>El acceso y uso de la Plataforma implica la aceptación plena y sin reservas de todas las disposiciones incluidas en este Aviso Legal, así como en los Términos y Condiciones, Política de Privacidad y Política de Cookies.
            </CardContent>
          </Card>
<Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-brand" />
                3. Condiciones de Acceso y Uso
              </CardTitle>
              <CardDescription>Reglas para el uso correcto de la plataforma.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground-muted leading-relaxed">
              <p>El usuario se compromete a hacer un uso lícito, diligente y honesto de la Plataforma, de conformidad con la <strong>Ley 1480 de 2011</strong> y la legislación vigente, absteniéndose de:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Realizar actividades ilícitas, fraudulentas o contrarias a la buena fe.</li>
                <li>Dañar los sistemas, introducir virus o realizar ingeniería inversa.</li>
                <li>Suplantar identidades o realizar actividades de phishing.</li>
                <li>Recopilar datos de otros usuarios sin consentimiento expreso (Ley 1581/2012).</li>
                <li>Publicar contenido ofensivo, difamatorio o que vulnere derechos de terceros.</li>
                <li>Interferir en la operatividad de la Plataforma o de los vendedores.</li>
              </ul>
              <p className="text-sm text-foreground-muted/80">
                El incumplimiento de estas condiciones facultará a Zentric Marketplace a suspender o cancelar el acceso del usuario, sin perjuicio de las acciones legales que correspondan.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-brand" />
                4. Propiedad Intelectual e Industrial
              </CardTitle>
              <CardDescription>Derechos sobre contenidos, marcas y software.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground-muted leading-relaxed">
              <p>Todos los contenidos de la Plataforma (textos, imágenes, logos, software, bases de datos, diseños, código fuente, marcas, nombres comerciales, signos distintivos) son propiedad de <strong>Zentric Marketplace S.A.S.</strong> o de sus licenciantes y están protegidos por la legislación colombiana e internacional de propiedad intelectual e industrial (Ley 23 de 1982, Decisión 351/1993, Decisión 486/2000).</p>
              <p>Queda expresamente prohibida la reproducción, distribución, comunicación pública, transformación, puesta a disposición o cualquier otra forma de explotación, total o parcial, sin autorización expresa y por escrito de Zentric Marketplace S.A.S.</p>
              <p>Los vendedores mantienen la titularidad de sus respectivos contenidos (fotos de productos, descripciones), otorgando a Zentric Marketplace una licencia no exclusiva, mundial y libre de regalías para usar, reproducir y mostrar dichos contenidos en la Plataforma.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-brand" />
                5. Exclusión de Garantías y Responsabilidad
              </CardTitle>
              <CardDescription>Límites de responsabilidad legal.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground-muted leading-relaxed">
              <p>Zentric Marketplace actúa como <strong>intermediario tecnológico</strong> (marketplace) entre compradores y vendedores independientes, de conformidad con la <strong>Ley 527 de 1999</strong> y la <strong>Ley 1480 de 2011</strong>. No es parte en los contratos de compraventa celebrados entre usuarios.</p>
              <p><strong>No garantiza:</strong></p>
              <ul className="list-disc pl-6 space-y-2">
                <li>La disponibilidad continua e ininterrumpida de la Plataforma.</li>
                <li>La ausencia de virus, malware u otros componentes dañinos.</li>
                <li>La veracidad, exactitud, exhaustividad o actualidad de la información publicada por vendedores terceros.</li>
                <li>El cumplimiento por parte de los vendedores de sus obligaciones contractuales.</li>
              </ul>
              <p>La responsabilidad de Zentric Marketplace se limita a los <strong>daños directos e imputables</strong> probados, excluyendo en todo caso daños indirectos, lucro cesante, daño moral, pérdida de datos o de oportunidades de negocio.</p>
              <p>Los vendedores son los únicos responsables de la licitud, calidad, seguridad y garantía de los productos y servicios que ofrecen, conforme al <strong>artículo 7 de la Ley 1480/2011</strong>.</p>
            </CardContent>
          </Card>
<Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5 text-brand" />
                6. Enlaces a Terceros
              </CardTitle>
              <CardDescription>Responsabilidad sobre enlaces externos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground-muted leading-relaxed">
              <p>La Plataforma puede contener enlaces a sitios web de terceros (proveedores de pago como PayU, MercadoPago, Wompi; redes sociales; transportadoras; entidades gubernamentales). Zentric Marketplace no controla ni se responsabiliza del contenido, políticas de privacidad, prácticas de seguridad o cumplimiento legal de dichos sitios.</p>
              <p>El acceso a enlaces de terceros se realiza bajo exclusiva responsabilidad del usuario. Se recomienda revisar los términos y políticas de cada sitio visitado.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-brand" />
                7. Ley Aplicable y Jurisdicción
              </CardTitle>
              <CardDescription>Marco legal y competencia judicial.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground-muted leading-relaxed">
              <p>El presente Aviso Legal se rige en todos y cada uno de sus extremos por las <strong>leyes de la República de Colombia</strong>, en especial:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Ley 527 de 1999 — Comercio Electrónico y Mensajes de Datos</li>
                <li>Ley 1480 de 2011 — Estatuto del Consumidor</li>
                <li>Ley 1581 de 2012 — Protección de Datos Personales (Habeas Data)</li>
                <li>Ley 2439 de 2024 — Modificaciones al Estatuto del Consumidor (enlace SIC)</li>
                <li>Código de Comercio y Código Civil Colombiano</li>
              </ul>
              <p>Para la resolución de cualquier controversia derivada del acceso o uso de la Plataforma, ambas partes se someten <strong>exclusivamente</strong> a los jueces y tribunales de <strong>Bogotá D.C., Colombia</strong>, renunciando expresamente a cualquier otro fuero que pudiera corresponderles por razón de su domicilio presente o futuro.</p>
            </CardContent>
          </Card>
<Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-brand" />
                8. Modificaciones del Aviso Legal
              </CardTitle>
              <CardDescription>Actualizaciones y notificaciones.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground-muted leading-relaxed">
              <p>Zentric Marketplace S.A.S. se reserva el derecho a modificar el presente Aviso Legal en cualquier momento, para adaptarlo a novedades legislativas, jurisprudenciales o cambios en la Plataforma.</p>
              <p>Las modificaciones entrarán en vigor desde su publicación en la Plataforma. Se recomienda al usuario revisar periódicamente este documento. El uso continuado de la Plataforma tras la publicación de cambios implica la aceptación de los mismos.</p>
              <p>Las versiones anteriores estarán disponibles a solicitud del usuario mediante comunicación a legal@zentric.com.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-brand" />
                9. Contacto y Derechos del Consumidor
              </CardTitle>
              <CardDescription>Para consultas legales y ejercicio de derechos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground-muted leading-relaxed">
              <p>Para cualquier consulta relacionada con este Aviso Legal, o para el ejercicio de sus derechos como consumidor (conocer, actualizar, rectificar, suprimir datos — <strong>Ley 1581/2012</strong>), puede contactar con nuestro departamento legal:</p>
              <address className="not-italic space-y-1">
                <p>Zentric Marketplace S.A.S.</p>
                <p>Departamento Legal</p>
                <p>Email: legal@zentric.com</p>
                <p>Dirección: Carrera 7 # 71-21, Bogotá D.C., Colombia</p>
              </address>

              <div className="pt-4 border-t border-border">
                <p className="font-semibold text-foreground mb-3">Enlaces de interés para el consumidor (Art. 50 Ley 1480/2011 mod. Ley 2439/2024):</p>
                <div className="flex flex-wrap gap-3">
                  <a
                    href="https://www.sic.gov.co/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-brand hover:underline bg-brand/5 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Superintendencia de Industria y Comercio (SIC)</span>
                  </a>
                  <a
                    href="/terms"
                    className="inline-flex items-center gap-1.5 text-sm text-brand hover:underline bg-brand/5 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>Términos y Condiciones</span>
                  </a>
                  <a
                    href="/privacy"
                    className="inline-flex items-center gap-1.5 text-sm text-brand hover:underline bg-brand/5 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Política de Privacidad</span>
                  </a>
                  <a
                    href="/cookies"
                    className="inline-flex items-center gap-1.5 text-sm text-brand hover:underline bg-brand/5 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>Política de Cookies</span>
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <footer className="mt-16 pt-8 border-t border-border text-center text-sm text-foreground-muted">
          <p>© 2026 Zentric Marketplace S.A.S. Todos los derechos reservados.</p>
          <p className="mt-1">NIT 900.123.456-7 · Carrera 7 # 71-21, Bogotá D.C., Colombia</p>
        </footer>
      </main>
    </PublicLayout>
  );
}