import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/ui/atoms/Dialog';
import { Button } from '@/ui/atoms/Button';
import { Textarea } from '@/ui/atoms/Textarea';
import { Badge } from '@/ui/atoms/Badge';
import { RatingStars } from '@/ui/molecules/RatingStars';
import { ShieldCheck, Package, Upload, X, Loader2 } from 'lucide-react';
import { cn } from '@/ui/lib/cn';
import {
  type ProductFeedbackSubmission,
  type Proposal1ProductReview,
} from '@/features/buyer/types/feedback.types';

export type { ProductFeedbackSubmission, Proposal1ProductReview };

export interface ProductReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId?: string;
  productId: string;
  productName: string;
  variantName?: string;
  imageUrl?: string;
  isVerifiedPurchase?: boolean;
  onSubmitReview?: (review: ProductFeedbackSubmission) => Promise<void> | void;
  onSubmitProductFeedback?: (feedback: ProductFeedbackSubmission) => Promise<void> | void;
}

const PRODUCT_TAG_OPTIONS = [
  'Calidad de materiales',
  'Rendimiento',
  'Pantalla',
  'Batería',
  'Cámaras',
  'Acabado premium',
];

const MAX_CHAR_COUNT = 500;

/**
 * ProductReviewModal (Propuesta 1 — Reseña Pura de Producto)
 * Enfoque rápido y monotemático centrado exclusivamente en el hardware.
 * Aplica sustracción visual de Verónica: cero tarjetas anidadas y cero emojis decorativos.
 */
export function ProductReviewModal({
  open,
  onOpenChange,
  orderId,
  productId,
  productName,
  variantName,
  imageUrl,
  isVerifiedPurchase = false,
  onSubmitReview,
  onSubmitProductFeedback,
}: ProductReviewModalProps) {
  const [rating, setRating] = React.useState<number>(0);
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [reviewText, setReviewText] = React.useState<string>('');
  const [photos, setPhotos] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const resetForm = () => {
    setRating(0);
    setSelectedTags([]);
    setReviewText('');
    setPhotos([]);
    setIsSubmitting(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) resetForm();
    onOpenChange(nextOpen);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length <= MAX_CHAR_COUNT) {
      setReviewText(val);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = 4 - photos.length;
    const newPhotos: string[] = [];

    for (let i = 0; i < Math.min(files.length, remainingSlots); i++) {
      const file = files[i];
      if (file) {
        const previewUrl = URL.createObjectURL(file);
        newPhotos.push(previewUrl);
      }
    }

    setPhotos((prev) => [...prev, ...newPhotos]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const payload: ProductFeedbackSubmission = {
        orderId,
        productId,
        variantId: variantName,
        rating,
        reviewText: reviewText.trim(),
        productTags: selectedTags,
        photoUrls: photos,
        isVerifiedPurchase: !!isVerifiedPurchase,
        visibility: 'public_catalog',
        createdAt: new Date().toISOString(),
      };

      if (onSubmitProductFeedback) {
        await onSubmitProductFeedback(payload);
      }
      if (onSubmitReview) {
        await onSubmitReview(payload);
      }
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isWarningCharLimit = reviewText.length >= 450;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-surface p-6 shadow-xl border border-border/80"
        aria-describedby="product-review-modal-description"
      >
        <DialogHeader className="gap-1 border-b border-border/40 pb-4">
          <DialogTitle className="text-lg font-semibold tracking-tight text-foreground">
            Calificar Producto
          </DialogTitle>
          <DialogDescription
            id="product-review-modal-description"
            className="text-xs text-foreground-muted"
          >
            Tu opinión ayuda a miles de compradores a conocer la calidad técnica del hardware.
          </DialogDescription>
        </DialogHeader>

        {/* Cabecera plana de producto (Sustracción: cero tarjetas anidadas) */}
        <div className="flex items-center gap-3 pt-1">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={productName}
              className="size-12 shrink-0 rounded-lg object-cover border border-border/60 bg-surface-muted"
            />
          ) : (
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-surface-muted text-foreground-muted">
              <Package className="size-6" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {isVerifiedPurchase && (
                <Badge
                  variant="outline"
                  className="gap-1 border-success/40 bg-success/10 text-success text-[11px] font-medium py-0 px-1.5"
                >
                  <ShieldCheck className="size-3" />
                  Compra verificada
                </Badge>
              )}
              {orderId && (
                <span className="text-[11px] text-foreground-muted">
                  Pedido #{orderId}
                </span>
              )}
            </div>
            <h3
              className="line-clamp-2 text-sm font-semibold text-foreground pt-0.5"
              title={productName}
            >
              {productName}
            </h3>
            {variantName && (
              <p className="text-xs text-foreground-muted truncate">
                {variantName}
              </p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* Selector de calificación (Flota libre sobre el modal con ritmo de espacio) */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <label
                id="rating-label"
                className="text-xs font-semibold tracking-wider text-foreground uppercase"
              >
                Calidad del producto *
              </label>
              {rating > 0 && (
                <span className="text-xs font-medium text-foreground-muted">
                  {rating} de 5 estrellas
                </span>
              )}
            </div>
            <div className="py-1">
              <RatingStars
                value={rating}
                onChange={setRating}
                size="lg"
                aria-label="Calificación de 1 a 5 estrellas para el producto"
              />
            </div>
          </div>

          {/* Atributos del producto (Chips limpios, cero emojis) */}
          <div className="space-y-2">
            <label className="text-xs font-semibold tracking-wider text-foreground-muted uppercase">
              Aspectos a destacar (opcional)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRODUCT_TAG_OPTIONS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      'rounded-md px-2.5 py-1 text-xs font-medium transition-all cursor-pointer',
                      isSelected
                        ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                        : 'border border-border/80 bg-surface-muted/60 text-foreground hover:bg-surface-muted'
                    )}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reseña escrita */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="proposal1-review-text"
                className="text-xs font-semibold tracking-wider text-foreground-muted uppercase"
              >
                Tu opinión detallada
              </label>
              <span
                className={cn(
                  'text-xs transition-colors',
                  isWarningCharLimit
                    ? 'font-medium text-amber-600'
                    : 'text-foreground-muted'
                )}
                aria-live="polite"
              >
                {reviewText.length} / {MAX_CHAR_COUNT}
              </span>
            </div>
            <Textarea
              id="proposal1-review-text"
              value={reviewText}
              onChange={handleTextChange}
              placeholder="¿Qué tal fue el rendimiento de la pantalla, batería y acabado físico del dispositivo?"
              className="max-h-36 resize-none"
              rows={3}
            />
          </div>

          {/* Subida de fotos compacta (Sustracción: trigger plano, cero dropzones gigantes) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold tracking-wider text-foreground-muted uppercase">
                Fotos reales del producto ({photos.length}/4)
              </label>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleFileChange}
              className="hidden"
              id="proposal1-file-input"
            />
            {photos.length < 4 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="gap-1.5 text-xs font-normal text-foreground-muted hover:text-foreground"
              >
                <Upload className="size-3.5" />
                Añadir fotos del producto (opcional)
              </Button>
            )}

            {photos.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {photos.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative size-14 overflow-hidden rounded-md border border-border"
                  >
                    <img
                      src={url}
                      alt={`Foto adjunta ${idx + 1}`}
                      className="size-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black"
                      aria-label="Eliminar foto"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Nota informativa de soporte para envíos */}
          <p className="text-[11px] leading-relaxed text-foreground-muted border-t border-border/40 pt-3">
            Esta calificación evalúa exclusivamente el hardware. Para reportar
            inconvenientes con el transportista o demoras de envío, por favor
            contacta directamente a soporte logístico.
          </p>

          {/* Acciones */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="default"
              disabled={rating === 0 || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Publicando...
                </>
              ) : (
                'Publicar Reseña'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
