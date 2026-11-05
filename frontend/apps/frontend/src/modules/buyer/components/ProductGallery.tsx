import { useState } from 'react';
import { ImageOff } from 'lucide-react';

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

  const safeIndex = Math.min(activeIndex, Math.max(images.length - 1, 0));
  const current = images[safeIndex];
  const hasMany = images.length > 1;
  const isBroken = current ? failed.includes(current) : true;

  return (
    <figure className="space-y-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-surface-muted">
        {isBroken ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-foreground-muted">
            <ImageOff className="h-8 w-8" aria-hidden="true" />
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
            className="h-full w-full object-cover object-center transition-opacity duration-300 motion-reduce:transition-none"
          />
        )}

        {hasMany && (
          <span className="absolute bottom-3 right-3 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium tabular-nums text-foreground-muted">
            {safeIndex + 1} / {images.length}
          </span>
        )}
      </div>

      {hasMany && (
        <div role="group" aria-label="Fotos del producto" className="flex gap-2 overflow-x-auto pb-1">
          {images.map((src, index) => {
            const selected = index === safeIndex;
            return (
              <button
                key={`${src}-${index}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Ver foto ${index + 1} de ${images.length}`}
                aria-pressed={selected}
                className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${
                  selected
                    ? 'border-brand ring-1 ring-brand'
                    : 'border-border hover:border-brand/50'
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
