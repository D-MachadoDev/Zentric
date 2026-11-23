import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OfficialStoresRail } from './OfficialStoresRail';

describe('OfficialStoresRail Component', () => {
  it('renders official stores with logos, verified badges and action buttons', async () => {
    const user = userEvent.setup();
    const handleSelectStore = vi.fn();

    render(<OfficialStoresRail onSelectStore={handleSelectStore} />);

    expect(screen.getByText('Tiendas Oficiales en Zentric')).toBeInTheDocument();
    expect(screen.getByText('Bosch Profesional')).toBeInTheDocument();
    expect(screen.getByText('Apple Authorized')).toBeInTheDocument();
    expect(screen.getByText('Samsung Enterprise')).toBeInTheDocument();
    expect(screen.getByText('3M Seguridad EPP')).toBeInTheDocument();

    const boschBtn = screen.getByRole('button', { name: /Ver Catálogo Bosch/i });
    await user.click(boschBtn);

    expect(handleSelectStore).toHaveBeenCalledWith('Bosch Profesional');
  });
});
