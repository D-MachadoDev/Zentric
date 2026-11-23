import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CategoryCircleRail } from './CategoryCircleRail';
import type { Category } from '../../../core';

describe('CategoryCircleRail Component (Layout Adaptativo y Conteo Dinámico)', () => {
  const mockThreeCategories: Category[] = [
    { id: 'cat-1', name: 'Electrónica', productCount: 45 },
    { id: 'cat-2', name: 'Herramientas', productCount: 30 },
    { id: 'cat-3', name: 'Smartphones', productCount: 22 },
  ];

  it('1. renderiza categorías circulares interactivas y delega la selección en onSelectCategory', async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();

    render(
      <CategoryCircleRail
        categories={mockThreeCategories}
        selectedCategory="cat-1"
        onSelectCategory={handleSelect}
      />
    );

    expect(screen.getByText('Categorías Principales')).toBeInTheDocument();
    expect(screen.getByText('Electrónica')).toBeInTheDocument();
    expect(screen.getByText('Herramientas')).toBeInTheDocument();
    expect(screen.getByText('Smartphones')).toBeInTheDocument();

    const toolButton = screen.getByRole('button', { name: /Herramientas/i });
    await user.click(toolButton);

    expect(handleSelect).toHaveBeenCalledWith('cat-2');
  });

  it('2. calcula y exhibe dinámicamente el conteo total de referencias disponibles sin texto mock', () => {
    render(
      <CategoryCircleRail
        categories={mockThreeCategories}
        onSelectCategory={vi.fn()}
      />
    );

    // 45 + 30 + 22 = 97 referencias
    expect(screen.getByText(/97 referencias con stock inmediato/i)).toBeInTheDocument();
  });

  it('3. Estado 1: renderiza micro-banner de colección activa cuando hay exactamente 1 categoría', () => {
    const singleCategory: Category[] = [
      { id: 'cat-solo', name: 'Audio Profesional', productCount: 15 },
    ];

    render(
      <CategoryCircleRail
        categories={singleCategory}
        onSelectCategory={vi.fn()}
      />
    );

    expect(screen.getByText(/Explorando catálogo especializado: Audio Profesional/i)).toBeInTheDocument();
    expect(screen.getByText(/15 referencias disponibles/i)).toBeInTheDocument();
  });

  it('4. Estado 2: renderiza layout compacto sin flechas de scroll con 2 a 4 categorías', () => {
    render(
      <CategoryCircleRail
        categories={mockThreeCategories}
        onSelectCategory={vi.fn()}
      />
    );

    expect(screen.queryByLabelText('Desplazar categorías a la izquierda')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Desplazar categorías a la derecha')).not.toBeInTheDocument();
  });

  it('5. Estado 3: renderiza flechas de desplazamiento cuando hay 5 o más categorías', () => {
    const fiveCategories: Category[] = [
      { id: 'c1', name: 'Cat 1', productCount: 10 },
      { id: 'c2', name: 'Cat 2', productCount: 10 },
      { id: 'c3', name: 'Cat 3', productCount: 10 },
      { id: 'c4', name: 'Cat 4', productCount: 10 },
      { id: 'c5', name: 'Cat 5', productCount: 10 },
    ];

    render(
      <CategoryCircleRail
        categories={fiveCategories}
        onSelectCategory={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Desplazar categorías a la izquierda')).toBeInTheDocument();
    expect(screen.getByLabelText('Desplazar categorías a la derecha')).toBeInTheDocument();
  });

  it('6. renderiza esqueletos de carga cuando isLoading es true', () => {
    render(
      <CategoryCircleRail
        categories={[]}
        onSelectCategory={vi.fn()}
        isLoading={true}
      />
    );

    const skeletons = screen.getAllByTestId('category-circle-skeleton');
    expect(skeletons.length).toBe(10);
  });

  it('7. renderiza 10 categorías canónicas completas (incluyendo Belleza y Oficina) cuando no se pasan categorías externas', () => {
    render(
      <CategoryCircleRail
        categories={[]}
        onSelectCategory={vi.fn()}
      />
    );

    expect(screen.getByText('Belleza & Cuidado')).toBeInTheDocument();
    expect(screen.getByText('Oficina & Papelería')).toBeInTheDocument();
    expect(screen.getByText('Tecnología')).toBeInTheDocument();
    expect(screen.getByText('Audio Pro')).toBeInTheDocument();

    const buttons = screen.getAllByRole('button', { name: /Filtrar por categoría/i });
    expect(buttons).toHaveLength(10);
  });
});
