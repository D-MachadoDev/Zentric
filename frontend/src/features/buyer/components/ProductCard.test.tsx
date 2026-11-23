import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProductCard } from './ProductCard';
import { ProductType, ProductStatus, type Product } from '../../../core';

// Mock Link from @tanstack/react-router
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, className }: { children: ReactNode; to: string; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

/**
 * ProductCard consulta/muta los favoritos vía TanStack Query, así que todo
 * render necesita un QueryClientProvider aunque la consulta quede deshabilitada.
 */
function renderCard(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('Componente ProductCard (Tarjeta Universal de Producto)', () => {
  const mockProduct: Product = {
    id: 'prod-001',
    name: 'Apple iPhone 16 Pro Max',
    description: 'Smartphone de alta gama',
    price: 1299.99,
    currency: 'USD',
    vendorId: 'vendor-12345678',
    type: ProductType.Physical,
    status: ProductStatus.Published,
    averageRating: 4.9,
    reviewsCount: 142,
    variants: [
      {
        id: 'var-001',
        sku: 'IPHONE16-256-NAT',
        canBeSold: true,
        availableStock: 15,
        price: 1299.99,
        attributes: [
          { name: 'Color', value: '#1E1B18' },
          { name: 'Capacidad', value: '256 GB' },
        ],
      },
      {
        id: 'var-002',
        sku: 'IPHONE16-512-NAT',
        canBeSold: true,
        availableStock: 8,
        price: 1499.99,
        attributes: [
          { name: 'Color', value: '#E5C358' },
          { name: 'Capacidad', value: '512 GB' },
        ],
      },
    ],
    createdAt: new Date().toISOString(),
  };

  it('renderiza la tarjeta en cuadrícula (grid) con geometría rounded-xl, calificación con estrellas ámbar y precio', () => {
    const { container } = renderCard(<ProductCard product={mockProduct} variant="grid" />);

    // Geometría exterior rounded-xl en el artículo contenedor
    const article = container.querySelector('article');
    expect(article).toBeInTheDocument();
    expect(article).toHaveClass('rounded-xl');
    expect(article).toHaveClass('w-full');

    // Nombre del producto
    expect(screen.getByText('Apple iPhone 16 Pro Max')).toBeInTheDocument();

    // Calificación real y conteo de reseñas
    expect(screen.getByText('4.9')).toBeInTheDocument();
    expect(screen.getByText('(142)')).toBeInTheDocument();

    // Ícono de estrella con relleno y color ámbar
    const starIcon = container.querySelector('svg.lucide-star');
    expect(starIcon).toBeInTheDocument();
    expect(starIcon).toHaveClass('fill-amber-400');
    expect(starIcon).toHaveClass('text-amber-400');

    // Metadatos de categoría y disponibilidad
    expect(screen.getByText('Físico')).toBeInTheDocument();
    expect(screen.getByText('Disponible')).toBeInTheDocument();

    // Precio sans-serif limpio en una sola línea sin decimales ni IVA incl.
    expect(screen.getByText(/\$ 1\.300/)).toBeInTheDocument();
    expect(screen.getByText('COP')).toBeInTheDocument();

    // Botón de agregar al carrito de ancho completo
    const addButton = screen.getByRole('button', { name: /Agregar Apple iPhone 16 Pro Max al carrito/i });
    expect(addButton).toBeInTheDocument();
    expect(addButton).toHaveClass('w-full');
  });

  it('muestra estado honesto "Sin reseñas" cuando el producto no tiene calificaciones en el backend', () => {
    const unratedProduct: Product = {
      ...mockProduct,
      averageRating: undefined,
      reviewsCount: undefined,
    };

    renderCard(<ProductCard product={unratedProduct} />);

    // Muestra "Sin reseñas" de forma honesta sin inventar calificaciones mock 4.9 o (128)
    expect(screen.getByText(/Sin reseñas/i)).toBeInTheDocument();
  });

  it('renderiza las imágenes del producto con optimización de carga diferida (loading="lazy" y decoding="async")', () => {
    const { container } = renderCard(<ProductCard product={mockProduct} variant="grid" />);
    const images = container.querySelectorAll('img');
    expect(images.length).toBeGreaterThan(0);
    images.forEach((img) => {
      expect(img).toHaveAttribute('loading', 'lazy');
      expect(img).toHaveAttribute('decoding', 'async');
    });
  });

  it('renderiza la variante de carrusel con riel horizontal de ancho fijo y esquinas rounded-xl', () => {
    const { container } = renderCard(
      <ProductCard product={mockProduct} variant="carousel" />
    );

    const article = container.querySelector('article');
    expect(article).toBeInTheDocument();
    expect(article).toHaveClass('w-72');
    expect(article).toHaveClass('sm:w-80');
    expect(article).toHaveClass('shrink-0');
    expect(article).toHaveClass('rounded-xl');
    expect(screen.getByText('Apple iPhone 16 Pro Max')).toBeInTheDocument();
  });

  it('renderiza la variante compacta en fila para carrito o recomendaciones con rounded-xl', () => {
    const { container } = renderCard(
      <ProductCard product={mockProduct} variant="compact" />
    );

    const link = container.querySelector('a');
    expect(link).toHaveClass('flex');
    expect(link).toHaveClass('items-center');
    expect(link).toHaveClass('rounded-xl');
    expect(screen.getByText('Apple iPhone 16 Pro Max')).toBeInTheDocument();
    expect(screen.getByText(/1\.299,99/)).toBeInTheDocument();
  });

  it('posiciona el botón flotante de favoritos en la esquina superior derecha y conmuta su estado', async () => {
    const user = userEvent.setup();
    const handleToggleFavorite = vi.fn();

    const { container } = renderCard(
      <ProductCard
        product={mockProduct}
        variant="grid"
        onToggleFavorite={handleToggleFavorite}
      />
    );

    // Contenedor principal con geometría rounded-xl
    const article = container.querySelector('article');
    expect(article).toHaveClass('rounded-xl');

    // Botón flotante de favoritos (corazón) en esquina superior derecha
    const bookmarkBtn = screen.getByRole('button', { name: /Agregar a favoritos/i });
    expect(bookmarkBtn).toBeInTheDocument();
    expect(bookmarkBtn).toHaveClass('top-1.5');
    expect(bookmarkBtn).toHaveClass('right-1.5');
    expect(bookmarkBtn).toHaveClass('rounded-full');

    // Click conmuta a favorito
    await user.click(bookmarkBtn);
    expect(handleToggleFavorite).toHaveBeenCalledWith('prod-001');
    expect(screen.getByRole('button', { name: /Quitar de favoritos/i })).toBeInTheDocument();
  });

  it('delega la acción al botón de agregar al carrito de ancho completo con estado de confirmación', async () => {
    const user = userEvent.setup();
    const handleAddToCart = vi.fn().mockResolvedValue(undefined);

    renderCard(<ProductCard product={mockProduct} onAddToCart={handleAddToCart} />);

    const addButton = screen.getByRole('button', { name: /Agregar Apple iPhone 16 Pro Max al carrito/i });
    expect(addButton).toHaveClass('w-full');

    await user.click(addButton);

    expect(handleAddToCart).toHaveBeenCalledWith(mockProduct);
    expect(await screen.findByRole('button', { name: /Producto agregado al carrito/i })).toBeInTheDocument();
  });

  it('muestra punto verde esmeralda (bg-emerald-500) y etiqueta Entrega digital para productos digitales', () => {
    const digitalProduct: Product = {
      ...mockProduct,
      type: ProductType.Digital,
    };

    const { container } = renderCard(<ProductCard product={digitalProduct} />);

    expect(screen.getByText('Entrega digital')).toBeInTheDocument();
    const dot = container.querySelector('span.bg-emerald-500');
    expect(dot).toBeInTheDocument();
  });
});
