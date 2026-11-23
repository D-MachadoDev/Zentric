import { useState, useEffect, useRef, useContext } from 'react';
import { AuthContext } from '../../app/providers/authContext';
import { appServices } from '../../app/providers/appServices';
import {
  Button,
  Input,
  Badge,
  Alert,
  AlertTitle,
  AlertDescription,
  Skeleton,
} from '@zentric/ui';
import {
  Store,
  ShieldCheck,
  Camera,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
} from 'lucide-react';
import { getSellerProfile, updateSellerProfile } from './sellerApi';
import type { SellerProfilePayload as SellerProfileData } from './sellerApi';

const STORAGE_KEY = 'zentric_seller_profile_override';

/**
 * Página de Gestión de Tienda y Marca para el Vendedor (/seller/perfil).
 * Formulario minimalista y sobrio: avatar circular con preview inmediata para logo/foto,
 * nombre comercial oficial de la tienda, badge de verificación institucional y botón Guardar Cambios.
 */
export function SellerProfilePage() {
  const auth = useContext(AuthContext);
  const session = auth?.session ?? appServices.session;
  const user = auth?.user ?? null;
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [isVerified, setIsVerified] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      setIsLoading(true);
      try {
        const token = session.getAccessToken();
        let remoteData: SellerProfileData | null = null;

        try {
          remoteData = await getSellerProfile(token);
        } catch {
          // Si la API aún no está disponible, caer a fallback local
        }

        const localSaved = localStorage.getItem(STORAGE_KEY);
        let localData: SellerProfileData | null = null;
        if (localSaved) {
          try {
            localData = JSON.parse(localSaved);
          } catch {
            // El respaldo local está dañado; se descarta sin romper la carga del perfil.
            localData = null;
          }
        }

        if (isMounted) {
          const effectiveName =
            remoteData?.storeName ||
            localData?.storeName ||
            user?.fullName ||
            '';
          const effectiveLogo =
            remoteData?.logoUrl ||
            localData?.logoUrl ||
            '';
          const effectiveVerified =
            remoteData?.isVerified ?? localData?.isVerified ?? false;

          setStoreName(effectiveName);
          setLogoUrl(effectiveLogo);
          setIsVerified(effectiveVerified);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadProfile();
    return () => {
      isMounted = false;
    };
  }, [session, user]);

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setFeedback({
        type: 'error',
        message: 'La imagen excede el límite recomendado de 2 MB.',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setLogoUrl(event.target.result as string);
        setFeedback(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim()) {
      setFeedback({ type: 'error', message: 'El nombre comercial de la tienda es obligatorio.' });
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    const payload: SellerProfileData = {
      storeName: storeName.trim(),
      logoUrl: logoUrl.trim() || null,
      isVerified,
    };

    try {
      await updateSellerProfile(session.getAccessToken(), payload);
      setFeedback({
        type: 'success',
        message: '¡Perfil de tienda y marca actualizado exitosamente!',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar los cambios de la tienda.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div
        className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6"
        role="status"
        aria-busy="true"
        aria-label="Cargando perfil de tienda..."
      >
        <Skeleton className="h-8 w-60 bg-surface rounded-lg" />
        <Skeleton className="h-80 rounded-2xl bg-surface" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* ── Encabezado Sobrio ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <Store className="size-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Mi Tienda y Marca
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-foreground-muted">
            Configura la identidad oficial y el nombre con el que tus compradores reconocen tu catálogo.
          </p>
        </div>

        {/* Badge de Verificación Institucional */}
        <div>
          {isVerified ? (
            <Badge
              variant="outline"
              className="border-success/30 text-success dark:text-success bg-success/10 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5"
            >
              <ShieldCheck className="size-3.5 text-success" />
              Tienda Verificada
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="border-warning/30 text-warning dark:text-warning bg-warning/10 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5"
            >
              <Clock className="size-3.5 text-warning" />
              Sin Verificar
            </Badge>
          )}
        </div>
      </div>

      {feedback && (
        <Alert
          variant={feedback.type === 'success' ? 'success' : 'destructive'}
          className="rounded-2xl"
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="size-5 text-success" />
          ) : (
            <AlertCircle className="size-5 text-danger" />
          )}
          <AlertTitle className="font-bold">
            {feedback.type === 'success' ? 'Cambios Guardados' : 'Atención'}
          </AlertTitle>
          <AlertDescription className="text-xs mt-0.5">
            {feedback.message}
          </AlertDescription>
        </Alert>
      )}

      {/* ── Formulario Minimalista ───────────────────────────────────────── */}
      <form onSubmit={handleSaveProfile} className="rounded-2xl border border-border/80 bg-surface p-6 sm:p-8 space-y-6 shadow-xs">
        {/* Avatar Circular con Selector y Preview Inmediata */}
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative size-28 sm:size-32 rounded-full overflow-hidden border-2 border-border/80 hover:border-brand bg-surface-muted/30 shadow-xs focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 transition-colors cursor-pointer group"
              title="Haz clic para cambiar el logotipo o foto de la tienda"
              aria-label="Cambiar foto o logotipo de la tienda"
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={storeName || 'Logotipo de la tienda'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-brand/5 text-brand">
                  <Store className="size-10" />
                </div>
              )}
              {/* Overlay hover sutil */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-xs font-semibold transition-opacity duration-200">
                <Camera className="size-5 mb-1" />
                <span>Cambiar</span>
              </div>
            </button>

            {/* Botón flotante para subir foto */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-2 rounded-full bg-brand text-primary-foreground shadow-md hover:bg-brand-strong transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand"
              title="Subir logo o imagen"
              aria-label="Subir logo o imagen"
            >
              <Camera className="size-4" />
            </button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            data-testid="store-logo-file-input"
            onChange={handleLogoFileChange}
          />

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              pill
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-semibold rounded-full cursor-pointer"
            >
              Subir Imagen
            </Button>
            {logoUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                pill
                onClick={() => setLogoUrl('')}
                className="text-xs text-foreground-muted hover:text-danger rounded-full cursor-pointer"
                title="Eliminar logotipo"
                aria-label="Eliminar logotipo"
              >
                <Trash2 className="size-3.5 mr-1" />
                Quitar
              </Button>
            )}
          </div>
          <span className="text-[11px] text-foreground-muted text-center">
            PNG o WEBP recomendado (formato cuadrado). Máximo 2 MB.
          </span>
        </div>

        {/* Input de Nombre Comercial Oficial */}
        <div className="space-y-1.5 pt-2">
          <label htmlFor="store-name" className="text-xs font-semibold text-foreground block">
            Nombre Comercial Oficial de la Tienda <span className="text-danger">*</span>
          </label>
          <Input
            id="store-name"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder="Ej. Mi Tienda"
            maxLength={150}
            required
            className="bg-surface border-border text-sm rounded-xl font-medium"
          />
          <div className="flex justify-between text-[11px] text-foreground-muted">
            <span>Nombre visible en todas las publicaciones y fichas de producto.</span>
            <span>{storeName.length} / 150</span>
          </div>
        </div>

        {/* Botón de Guardado */}
        <div className="pt-4 border-t border-border/60 flex items-center justify-end">
          <Button
            type="submit"
            disabled={isSaving || !storeName.trim()}
            pill
            className="w-full sm:w-auto bg-brand hover:bg-brand-strong text-primary-foreground font-bold text-xs sm:text-sm px-6 py-2.5 rounded-full cursor-pointer shadow-xs disabled:opacity-40"
          >
            {isSaving ? 'Guardando cambios...' : 'Guardar Cambios de Tienda'}
          </Button>
        </div>
      </form>
    </div>
  );
}
