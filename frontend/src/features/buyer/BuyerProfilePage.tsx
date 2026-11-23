import { useState, useEffect, type FormEvent } from 'react';
import { Link } from '@tanstack/react-router';
import { useAuth } from '../../app/providers/authContext';
import { useOrdersQuery } from '../../core';
import { useUserProfile, useUpdateUserProfile } from '../../core';
import {
  getDefaultSession,
  useFavoritesQuery,
  useRemoveFavoriteMutation,
  useClearFavoritesMutation,
} from '../../core';
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
  Skeleton,
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
  CreditCard,
  Heart,
  Trash2,
  ExternalLink,
  Lock,
  ArrowRight,
} from 'lucide-react';
import {
  getWishlistItems,
  removeFavorite,
  clearWishlist,
  subscribeWishlist,
  type WishlistItem,
} from './wishlistStorage';

type ProfileTab = 'personal' | 'addresses' | 'payments' | 'favorites';

/** Ítem unificado para la pestaña de favoritos (invitado o autenticado). */
interface FavoriteDisplayItem {
  productId: string;
  name: string;
  price: number;
  currency?: string;
  imageUrl?: string;
  category?: string;
}

/**
 * Pantalla de Perfil del Comprador (BuyerProfilePage).
 *
 * Implementa la especificación completa del marketplace Polaris con navegación
 * por pestañas limpias:
 * 1. Datos Personales y de Contacto
 * 2. Direcciones de Entrega y Despacho Particionado
 * 3. Métodos de Pago y Custodia Segura
 * 4. Mis Favoritos guardados con persistencia local
 *
 * Persiste los datos de usuario en PostgreSQL vía GET/PUT /api/users/profile (Slice 3).
 */
export function BuyerProfilePage() {
  const { user } = useAuth();
  const { data: orders = [] } = useOrdersQuery();
  const { data: profile, isLoading: isLoadingProfile } = useUserProfile();
  const updateProfileMutation = useUpdateUserProfile();

  const hasActiveSession = Boolean(getDefaultSession()?.getAccessToken());
  const { data: backendFavorites } = useFavoritesQuery(undefined, { enabled: hasActiveSession });
  const removeFavoriteMutation = useRemoveFavoriteMutation();
  const clearFavoritesMutation = useClearFavoritesMutation();

  const [activeTab, setActiveTab] = useState<ProfileTab>('personal');
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>(() => getWishlistItems());

  useEffect(() => {
    return subscribeWishlist(() => {
      setWishlistItems(getWishlistItems());
    });
  }, []);

  const favoriteItems: FavoriteDisplayItem[] = hasActiveSession
    ? (backendFavorites ?? []).map((item) => ({
        productId: item.productId,
        name: item.productName,
        price: item.price,
        currency: item.currency,
        imageUrl: item.imageUrl ?? undefined,
      }))
    : wishlistItems.map((item) => ({
        productId: item.productId,
        name: item.name,
        price: item.price,
        currency: item.currency,
        imageUrl: item.imageUrl,
        category: item.category,
      }));

  const handleRemoveFavorite = (productId: string) => {
    if (hasActiveSession) {
      void removeFavoriteMutation.mutateAsync(productId);
    } else {
      removeFavorite(productId);
    }
  };

  const handleClearFavorites = () => {
    if (hasActiveSession) {
      void clearFavoritesMutation.mutateAsync(favoriteItems.map((item) => item.productId));
    } else {
      clearWishlist();
    }
  };

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [department, setDepartment] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifySms, setNotifySms] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const email = profile?.email || user?.email || '';

  // Sincroniza estado durante el render al cambiar de perfil para evitar renders en cascada.
  const profileSeed = profile ? `p:${profile.id}` : user ? `u:${user.userId}` : null;
  const [seenProfileSeed, setSeenProfileSeed] = useState<string | null>(null);

  if (seenProfileSeed !== profileSeed) {
    setSeenProfileSeed(profileSeed);

    if (profile) {
      setFullName(profile.fullName || user?.fullName || '');
      setPhone(profile.phone || '');
      setDocumentId(profile.documentNumber || '');
      if (profile.address) {
        setAddress(profile.address.street || '');
        setCity(profile.address.city || '');
        setDepartment(profile.address.state || '');
        setPostalCode(profile.address.zipCode || '');
      }
    } else if (user) {
      setFullName(user.fullName || '');
    }
  }

  const completedOrders = orders.filter((o) => o.status === 'Delivered').length;
  const inProgressOrders = orders.filter((o) => o.status !== 'Delivered' && o.status !== 'Cancelled').length;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    try {
      await updateProfileMutation.mutateAsync({
        fullName,
        phone,
        documentNumber: documentId,
        address: {
          street: address,
          city,
          state: department,
          zipCode: postalCode,
          country: 'Colombia',
        },
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar el perfil en el servidor.';
      setSaveError(msg);
    }
  };

  if (isLoadingProfile) {
    return (
      <div className="space-y-8 w-full max-w-full">
        <Skeleton className="h-8 w-48 bg-surface" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <Skeleton className="lg:col-span-8 h-96 rounded-2xl bg-surface" />
          <Skeleton className="lg:col-span-4 h-96 rounded-2xl bg-surface" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 py-6">
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
            Administra tus datos personales, direcciones de despacho, métodos de pago y lista de favoritos.
          </p>
        </div>

        {/* Resumen Rápido de Compras */}
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-border bg-surface px-4 py-2 text-center shadow-xs">
            <span className="block text-xl font-bold text-foreground tabular-nums">
              {orders.length}
            </span>
            <span className="text-xs text-foreground-muted">Total Pedidos</span>
          </div>
          <div className="rounded-xl border border-border bg-surface px-4 py-2 text-center shadow-xs">
            <span className="block text-xl font-bold text-brand tabular-nums">
              {inProgressOrders}
            </span>
            <span className="text-xs text-foreground-muted">En Curso</span>
          </div>
          <div className="rounded-xl border border-border bg-surface px-4 py-2 text-center shadow-xs">
            <span className="block text-xl font-bold text-success tabular-nums">
              {completedOrders}
            </span>
            <span className="text-xs text-foreground-muted">Entregados</span>
          </div>
        </div>
      </div>

      {/* ── Pestañas de Navegación del Perfil (Tabs) ── */}
      <div
        role="tablist"
        aria-label="Secciones del perfil del comprador"
        className="flex items-center gap-1 border-b border-border overflow-x-auto scrollbar-none pb-px"
      >
        <button
          type="button"
          role="tab"
          id="tab-personal"
          aria-selected={activeTab === 'personal'}
          aria-controls="panel-personal"
          onClick={() => setActiveTab('personal')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'personal'
              ? 'border-brand text-foreground font-semibold'
              : 'border-transparent text-foreground-muted hover:text-foreground hover:border-border'
          }`}
        >
          <User className="h-4 w-4" />
          <span>Datos Personales</span>
        </button>

        <button
          type="button"
          role="tab"
          id="tab-addresses"
          aria-selected={activeTab === 'addresses'}
          aria-controls="panel-addresses"
          onClick={() => setActiveTab('addresses')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'addresses'
              ? 'border-brand text-foreground font-semibold'
              : 'border-transparent text-foreground-muted hover:text-foreground hover:border-border'
          }`}
        >
          <MapPin className="h-4 w-4" />
          <span>Direcciones de Entrega</span>
        </button>

        <button
          type="button"
          role="tab"
          id="tab-payments"
          aria-selected={activeTab === 'payments'}
          aria-controls="panel-payments"
          onClick={() => setActiveTab('payments')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'payments'
              ? 'border-brand text-foreground font-semibold'
              : 'border-transparent text-foreground-muted hover:text-foreground hover:border-border'
          }`}
        >
          <CreditCard className="h-4 w-4" />
          <span>Métodos de Pago</span>
        </button>

        <button
          type="button"
          role="tab"
          id="tab-favorites"
          aria-selected={activeTab === 'favorites'}
          aria-controls="panel-favorites"
          onClick={() => setActiveTab('favorites')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'favorites'
              ? 'border-brand text-foreground font-semibold'
              : 'border-transparent text-foreground-muted hover:text-foreground hover:border-border'
          }`}
        >
          <Heart className={`h-4 w-4 ${favoriteItems.length > 0 ? 'text-rose-500 fill-rose-500' : ''}`} />
          <span>Mis Favoritos</span>
          {favoriteItems.length > 0 && (
            <span className="rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-2 py-0.5 text-[10px] font-bold tabular-nums">
              {favoriteItems.length}
            </span>
          )}
        </button>
      </div>

      {savedSuccess && (
        <Alert className="border-success/30 bg-success/10 text-success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription className="font-medium">
            Tus datos de perfil y preferencias de despacho fueron actualizados correctamente.
          </AlertDescription>
        </Alert>
      )}

      {saveError && (
        <Alert variant="destructive" className="border-danger/30 bg-danger/10 text-danger">
          <AlertDescription className="font-medium">
            {saveError}
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── TAB 1: DATOS PERSONALES ── */}
        <div
          id="panel-personal"
          role="tabpanel"
          aria-labelledby="tab-personal"
          className={activeTab === 'personal' ? 'space-y-6 block' : 'hidden'}
        >
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
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
                      <span className="text-xs text-foreground-muted">
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
                          value={documentId}
                          onChange={(e) => setDocumentId(e.target.value)}
                          placeholder="Ej: 1098765432"
                          className="pl-9 text-sm"
                        />
                        <FileText className="absolute left-3 top-2.5 h-4 w-4 text-foreground-muted" />
                      </div>
                      <span className="text-xs text-foreground-muted">
                        Utilizado para la emisión de facturación electrónica.
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

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
                      <p className="text-foreground-muted text-xs leading-relaxed">
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
                      <p className="text-foreground-muted text-xs leading-relaxed">
                        Avisos de urgencia antes de que expire la reserva atómica en el carrito.
                      </p>
                    </div>
                  </label>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
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

              {activeTab === 'personal' && (
                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="w-full font-medium gap-2"
                >
                  <Save className="h-4 w-4" />
                  {updateProfileMutation.isPending ? 'Guardando...' : 'Guardar Cambios de Perfil'}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* ── TAB 2: DIRECCIONES DE ENTREGA ── */}
        <div
          id="panel-addresses"
          role="tabpanel"
          aria-labelledby="tab-addresses"
          className={activeTab === 'addresses' ? 'space-y-6 block' : 'hidden'}
        >
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
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
                      placeholder="Ej: Carrera 7 # 156-68, Apto 904"
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
                        placeholder="Ej: Bogotá D.C."
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
                        placeholder="Ej: Cundinamarca"
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
                        placeholder="Ej: 110131"
                        className="text-sm"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Información sobre el Despacho */}
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10 p-5 space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold text-xs sm:text-sm">
                  <Package className="h-4 w-4" />
                  <span>Envíos 100% Gratuitos y Despacho en 24h</span>
                </div>
                <p className="text-xs text-foreground-muted leading-relaxed">
                  Todas las entregas hacia tu dirección registrada cuentan con cobertura de seguro integral
                  y trazabilidad satelital en tiempo real emitida por el operador logístico asignado.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-border bg-surface p-5 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Despacho Particionado
                </h4>
                <p className="text-xs text-foreground-muted leading-relaxed">
                  Si tu orden incluye referencias alojadas en distintas bodegas físicas de la red,
                  el sistema coordinará envíos independientes sin costo adicional para ti.
                </p>
              </div>

              {activeTab === 'addresses' && (
                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="w-full font-medium gap-2"
                >
                  <Save className="h-4 w-4" />
                  {updateProfileMutation.isPending ? 'Guardando...' : 'Guardar Cambios de Perfil'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </form>

      {/* ── TAB 3: MÉTODOS DE PAGO ── */}
      <div
        id="panel-payments"
        role="tabpanel"
        aria-labelledby="tab-payments"
        className={activeTab === 'payments' ? 'space-y-6 block' : 'hidden'}
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {/* Opción 1: Escrow Zentric */}
            <div className="rounded-2xl border border-border/80 bg-surface p-5 space-y-3 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      Custodia y Depósito en Garantía (Escrow)
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] px-2 py-0 border-0">
                        Activo por Defecto
                      </Badge>
                    </h3>
                    <p className="text-xs text-foreground-muted">
                      Tus fondos se mantienen en custodia segura y solo se transfieren al vendedor tras la entrega conforme.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Opción 2: PSE */}
            <div className="rounded-2xl border border-border/80 bg-surface p-5 space-y-3 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      PSE (Pagos Seguros en Línea)
                    </h3>
                    <p className="text-xs text-foreground-muted">
                      Débito bancario en tiempo real habilitado para todas las entidades financieras colombianas.
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] border-border text-foreground-muted">
                  Disponible en Checkout
                </Badge>
              </div>
            </div>

            {/* Opción 3: Tarjetas de Crédito / Débito */}
            <div className="rounded-2xl border border-border/80 bg-surface p-5 space-y-3 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Tarjetas de Crédito y Débito
                    </h3>
                    <p className="text-xs text-foreground-muted">
                      Visa, Mastercard, American Express y Diners con tokenización bancaria segura.
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] border-border text-foreground-muted">
                  Tokenizado PCI-DSS
                </Badge>
              </div>
            </div>
          </div>

          {/* Información de Seguridad de Pagos */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-surface p-5 space-y-3">
              <div className="flex items-center gap-2 text-foreground font-semibold text-xs sm:text-sm">
                <Lock className="h-4 w-4 text-brand" />
                <span>Seguridad de Grado Institucional</span>
              </div>
              <p className="text-xs text-foreground-muted leading-relaxed">
                Zentric nunca almacena números completos de tarjetas ni códigos de seguridad CVV.
                Toda la comunicación transaccional está protegida mediante TLS 1.3 de extremo a extremo.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── TAB 4: MIS FAVORITOS (WISHLIST) ── */}
      <div
        id="panel-favorites"
        role="tabpanel"
        aria-labelledby="tab-favorites"
        className={activeTab === 'favorites' ? 'space-y-6 block' : 'hidden'}
      >
        <div className="flex items-center justify-between border-b border-border/70 pb-3">
          <div>
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Heart className="h-4 w-4 text-rose-500 fill-rose-500" />
              Tus Productos Guardados ({favoriteItems.length})
            </h2>
            <p className="text-xs text-foreground-muted">
              Referencias que has marcado como favoritas para compra futura o seguimiento.
            </p>
          </div>
          {favoriteItems.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClearFavorites}
              className="text-xs text-danger hover:text-danger hover:bg-danger/10 border-danger/30"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Vaciar favoritos
            </Button>
          )}
        </div>

        {favoriteItems.length === 0 ? (
          <div className="text-center py-16 max-w-md mx-auto space-y-3">
            <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-surface-muted text-foreground-muted">
              <Heart className="h-7 w-7 text-foreground-subtle" />
            </div>
            <h3 className="text-base font-bold text-foreground">Tu lista de favoritos está vacía</h3>
            <p className="text-xs text-foreground-muted leading-relaxed">
              Guarda los productos que te interesan pulsando el ícono de corazón en el catálogo para encontrarlos rápidamente aquí.
            </p>
            <div className="pt-2">
              <Link
                to="/buyer"
                className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-brand-strong transition-all"
              >
                <span>Explorar Catálogo</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {favoriteItems.map((item) => (
              <div
                key={item.productId}
                className="rounded-2xl border border-border/80 bg-surface p-4 flex flex-col justify-between space-y-3 shadow-xs hover:border-brand/40 transition-all"
              >
                <div className="space-y-3">
                  <div className="relative aspect-video w-full rounded-xl bg-surface-muted overflow-hidden flex items-center justify-center">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <Package className="h-8 w-8 text-foreground-subtle" />
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveFavorite(item.productId)}
                      aria-label={`Quitar ${item.name} de favoritos`}
                      className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-surface/90 text-rose-500 hover:bg-rose-50 hover:scale-110 active:scale-95 transition-all shadow-xs cursor-pointer"
                    >
                      <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
                    </button>
                  </div>

                  <div>
                    {item.category && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground-subtle">
                        {item.category}
                      </span>
                    )}
                    <h4 className="text-sm font-semibold text-foreground line-clamp-2">
                      {item.name}
                    </h4>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-bold text-foreground tabular-nums">
                    ${item.price.toLocaleString('es-CO')} COP
                  </span>
                  <Link
                    to="/buyer/catalog/$productId"
                    params={{ productId: item.productId }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-strong"
                  >
                    <span>Ver ficha</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
