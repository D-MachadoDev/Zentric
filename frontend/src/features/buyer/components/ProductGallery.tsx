import { useState } from 'react';
import { ImageOff, Heart } from 'lucide-react';

/**
 * Galería de la ficha de producto: una foto protagonista y la tira de
 * miniaturas del mismo producto en otros ángulos.
 *
 * Con una sola foto no dibuja miniaturas: no inventa un collage que el
 * vendedor no cargó. La imágen rota cae a un marcador explícito en lugar de
 * dejar el hueco vacío. El padre la remonta con `key={product.id}` para que la
 * foto activa arranque siempre en la primera.
 */
export function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [failed, setFailed] = useState<string[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);

  const safeIndex = Math.min(activeIndex, Math.max(images.length - 1, 0));
  const current = images[safeIndex];
  const hasMany = images.length > 1;
  const isBroken = current ? failed.includes(current) : true;

  return (
    <figure className="space-y-3 sm:space-y-4">
      {/* Marco de fotografía de estudio de borde a borde (lleno y limpio, sin padding envolvente) */}
      <div className="relative w-full aspect-square sm:aspect-[4/3] lg:aspect-[4/5] max-h-[560px] mx-auto flex items-center justify-center overflow-hidden rounded-2xl sm:rounded-3xl border border-zinc-200/80 dark:border-zinc-800 bg-surface-muted dark:bg-surface-secondary shadow-xs group">
        {/* Badge flotante: Envío Gratuito */}
        <div className="absolute top-3.5 left-3.5 z-10 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 dark:bg-emerald-500/20 px-3 py-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 backdrop-blur-md shadow-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
          <span>Envío 100% Gratuito</span>
        </div>

        {/* Botón flotante: Favoritos */}
        <button
          type="button"
          onClick={() => setIsFavorite(!isFavorite)}
          aria-label={isFavorite ? 'Quitar de favoritos' : 'Guardar en lista de deseos'}
          aria-pressed={isFavorite}
          className="absolute top-3.5 right-3.5 z-10 flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full border border-zinc-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 text-foreground-muted backdrop-blur-md transition-all hover:scale-105 hover:text-danger hover:border-danger/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand shadow-xs cursor-pointer"
        >
          <Heart
            className={`h-4 w-4 transition-colors ${
              isFavorite ? 'fill-danger text-danger' : 'text-foreground-muted'
            }`}
            aria-hidden="true"
          />
        </button>

        {isBroken ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-foreground-muted">
            <ImageOff className="h-8 w-8 text-foreground-subtle" aria-hidden="true" />
            <span className="text-xs">Imagen no disponible</span>
          </div>
        ) : (
          <img
            key={current}
            src={current}
            alt={alt}
            loading="eager"
            decoding="async"
            onError={() => {
              if (current) setFailed((prev) => [...prev, current]);
            }}
            className="h-full w-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-103 motion-reduce:transition-none"
          />
        )}

        {hasMany && (
          <span className="absolute bottom-3.5 right-3.5 rounded-full bg-black/60 backdrop-blur-md px-3 py-0.5 text-[11px] font-semibold tabular-nums text-white shadow-xs border border-white/20">
            {safeIndex + 1} / {images.length}
          </span>
        )}
      </div>

      {/* Tira inferior de miniaturas scrollable con snap (fila de 4-5 imágenes) */}
      {hasMany && (
        <div
          role="group"
          aria-label="Fotos del producto"
          className="flex items-center gap-2.5 sm:gap-3 overflow-x-auto pb-2 pt-1 scrollbar-none snap-x snap-mandatory"
        >
          {images.map((src, index) => {
            const selected = index === safeIndex;
            return (
              <button
                key={`${src}-${index}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Ver foto ${index + 1} de ${images.length}`}
                aria-pressed={selected}
                className={`relative size-18 sm:size-22 shrink-0 overflow-hidden rounded-xl sm:rounded-2xl border transition-all focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none bg-surface-muted dark:bg-surface-secondary snap-start cursor-pointer p-0 ${
                  selected
                    ? 'border-zinc-950 dark:border-white ring-2 ring-brand/30 shadow-xs scale-102 opacity-100'
                    : 'border-zinc-200 dark:border-zinc-800 opacity-60 hover:opacity-100 hover:border-zinc-400'
                }`}
              >
                <img
                  src={src}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover object-center"
                />
              </button>
            );
          })}
        </div>
      )}
    </figure>
  );
}
