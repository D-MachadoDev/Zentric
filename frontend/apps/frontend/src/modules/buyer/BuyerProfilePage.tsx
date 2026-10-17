import { useState, type FormEvent } from 'react';
import { useAuth } from '../../app/providers/authContext';
import { useOrdersQuery } from '../../application/services/orders';
import {
  Button,
  Input,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Alert,
  AlertDescription,
  Badge,
} from '@zentric/ui';
import {
  User,
  Mail,
  FileText,
  Phone,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  Package,
  Clock,
  Bell,
  Save,
} from 'lucide-react';

/**
 * Pantalla de Perfil del Comprador.
 * Permite al comprador consultar y actualizar sus datos personales,
 * información de envío para despacho particionado y preferencias de compra.
 */
export function BuyerProfilePage() {
  const { user } = useAuth();
  const { data: orders = [] } = useOrdersQuery();

  const [fullName, setFullName] = useState(user?.fullName ?? 'Comprador Zentric');
  const [email] = useState(user?.email ?? 'comprador@zentric.co');
  const [phone, setPhone] = useState('+57 310 987 6543');
  const [address, setAddress] = useState('Carrera 7 # 156-68, Torre B, Apto 904');
  const [city, setCity] = useState('Bogotá D.C.');
  const [department, setDepartment] = useState('Cundinamarca');
  const [postalCode, setPostalCode] = useState('110131');
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifySms, setNotifySms] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const completedOrders = orders.filter((o) => o.status === 'Delivered').length;
  const inProgressOrders = orders.filter((o) => o.status !== 'Delivered' && o.status !== 'Cancelled').length;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 py-6">
      {/* ── Encabezado de Perfil ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Mi Perfil de Comprador
            </h1>
            <Badge variant="outline" className="border-brand/40 text-brand bg-brand/5 text-xs">
              <ShieldCheck className="h-3 w-3 mr-1" />
              Verificado
            </Badge>
          </div>
          <p className="text-sm text-foreground-muted">
            Administra tus direcciones de entrega, datos de facturación y preferencias de compra segura.
          </p>
        </div>

        {/* Resumen Rápido de Compras */}
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-border bg-surface px-4 py-2 text-center shadow-xs">
            <span className="block font-mono text-lg font-bold text-foreground tabular-nums">
              {orders.length}
            </span>
            <span className="text-[11px] text-foreground-muted">Total Pedidos</span>
          </div>
          <div className="rounded-xl border border-border bg-surface px-4 py-2 text-center shadow-xs">
            <span className="block font-mono text-lg font-bold text-brand tabular-nums">
              {inProgressOrders}
            </span>
            <span className="text-[11px] text-foreground-muted">En Curso</span>
          </div>
          <div className="rounded-xl border border-border bg-surface px-4 py-2 text-center shadow-xs">
            <span className="block font-mono text-lg font-bold text-emerald-500 tabular-nums">
              {completedOrders}
            </span>
            <span className="text-[11px] text-foreground-muted">Entregados</span>
          </div>
        </div>
      </div>

      {savedSuccess && (
        <Alert className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription className="font-medium">
            Tus datos de perfil y preferencias de despacho fueron actualizados correctamente.
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* ── Columna 1 y 2: Formulario de Datos ── */}
          <div className="space-y-6 lg:col-span-2">
            {/* Tarjeta de Información Personal */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <User className="h-4 w-4 text-brand" />
                  Información Personal y Contacto
                </CardTitle>
                <CardDescription>
                  Datos utilizados para la emisión de facturas y contacto logístico.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="fullName" className="text-xs font-medium text-foreground">
                      Nombre Completo
                    </label>
                    <div className="relative">
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        className="pl-9"
                      />
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-foreground-muted" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="email" className="text-xs font-medium text-foreground">
                      Correo Electrónico
                    </label>
                    <div className="relative">
                      <Input id="email" value={email} disabled className="pl-9 opacity-80" />
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-foreground-muted" />
                    </div>
                    <span className="text-[10px] text-foreground-muted">
                      Vinculado a tu cuenta de acceso Zentric.
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="phone" className="text-xs font-medium text-foreground">
                      Teléfono Móvil
                    </label>
                    <div className="relative">
                      <Input
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+57 300 000 0000"
                        required
                        className="pl-9"
                      />
                      <Phone className="absolute left-3 top-2.5 h-4 w-4 text-foreground-muted" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="doc" className="text-xs font-medium text-foreground">
                      Documento de Identidad (NIT / C.C.)
                    </label>
                    <div className="relative">
                      <Input
                        id="doc"
                        value="1098765432-1"
                        disabled
                        className="pl-9 font-mono opacity-80"
                      />
                      <FileText className="absolute left-3 top-2.5 h-4 w-4 text-foreground-muted" />
                    </div>
                    <span className="text-[10px] text-foreground-muted">
                      Invariable según norma RG-01 de facturación split.
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tarjeta de Dirección de Despacho */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-brand" />
                  Dirección Principal de Entrega
                </CardTitle>
                <CardDescription>
                  Destino predeterminado para el despacho particionado desde nuestras bodegas.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="address" className="text-xs font-medium text-foreground">
                    Dirección Residencial o Corporativa
                  </label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <label htmlFor="city" className="text-xs font-medium text-foreground">
                      Ciudad
                    </label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="department" className="text-xs font-medium text-foreground">
                      Departamento / Estado
                    </label>
                    <Input
                      id="department"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="postal" className="text-xs font-medium text-foreground">
                      Código Postal
                    </label>
                    <Input
                      id="postal"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className="font-mono"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Columna 3: Preferencias y Garantías ── */}
          <div className="space-y-6">
            {/* Preferencias de Notificación */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Bell className="h-4 w-4 text-brand" />
                  Alertas y Notificaciones
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.checked)}
                    className="mt-0.5 rounded border-border text-brand focus:ring-brand"
                  />
                  <div>
                    <span className="font-semibold text-foreground">Actualizaciones por Correo</span>
                    <p className="text-foreground-muted text-[11px] leading-tight">
                      Recibe guías de rastreo y facturas maestras cuando tu pedido sea despachado.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifySms}
                    onChange={(e) => setNotifySms(e.target.checked)}
                    className="mt-0.5 rounded border-border text-brand focus:ring-brand"
                  />
                  <div>
                    <span className="font-semibold text-foreground">Alertas de Reserva de 15 Min</span>
                    <p className="text-foreground-muted text-[11px] leading-tight">
                      Avisos de urgencia antes de que expire la reserva atómica en el carrito.
                    </p>
                  </div>
                </label>
              </CardContent>
            </Card>

            {/* Garantías Zentric Marketplace */}
            <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-brand" />
                Garantías Zentric
              </h3>
              <ul className="space-y-3 text-xs text-foreground-muted">
                <li className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                  <span>Reserva atómica garantizada de 15 minutos en checkout.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Package className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                  <span>Despacho desde bodegas físicas certificadas.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                  <span>Inspección técnica rigurosa en devoluciones.</span>
                </li>
              </ul>
            </div>

            {/* Botón Guardar */}
            <Button type="submit" className="w-full font-medium gap-2">
              <Save className="h-4 w-4" />
              Guardar Cambios de Perfil
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
