import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Logo } from './Logo';
import { LogoMark } from './LogoMark';
import { LogoWordmark } from './LogoWordmark';

describe('LogoMark', () => {
  it('es decorativo cuando no recibe titulo', () => {
    render(<LogoMark />);
    const mark = screen.getByTestId('logo-mark');
    expect(mark).toHaveAttribute('aria-hidden', 'true');
    expect(mark).toHaveAttribute('src', '/brandkit/logo/zentric-icon-buyer.png');
  });

  it('se declara como imagen con texto alternativo cuando recibe titulo', () => {
    render(<LogoMark title="Zentric" />);
    const mark = screen.getByTestId('logo-mark');
    expect(mark).toHaveAttribute('role', 'img');
    expect(mark).toHaveAttribute('aria-label', 'Zentric');
  });

  it('usa la imagen de public/brandkit/logo correspondiente al rol especificado o heredado por data-role', () => {
    const { rerender } = render(<LogoMark role="seller" />);
    expect(screen.getByTestId('logo-mark')).toHaveAttribute(
      'src',
      '/brandkit/logo/zentric-icon-seller.png',
    );

    rerender(
      <div data-role="logistics">
        <LogoMark />
      </div>,
    );
    expect(screen.getByTestId('logo-mark')).toHaveAttribute(
      'src',
      '/brandkit/logo/zentric-icon-logistics.png',
    );
  });
});

describe('LogoWordmark', () => {
  it('escrible la marca tipografica completa', () => {
    render(<LogoWordmark />);
    expect(screen.getByTestId('logo-wordmark')).toHaveTextContent('Zentric');
  });
});

describe('Logo', () => {
  it('sin tagline no muestra el eslogan', () => {
    render(<Logo />);
    expect(screen.queryByText(/Sistema Operativo para Comercio/)).not.toBeInTheDocument();
  });

  it('con showTagline muestra el eslogan de Q1', () => {
    render(<Logo showTagline />);
    expect(screen.getByText('Sistema Operativo para Comercio')).toBeInTheDocument();
  });

  it('compone simbolo de imagen y marca tipografica juntos', () => {
    render(<Logo />);
    expect(screen.getByTestId('logo-mark')).toBeInTheDocument();
    expect(screen.getByTestId('logo-wordmark')).toBeInTheDocument();
  });

  it('propaga el rol a la imagen del logo cuando se especifica role', () => {
    render(<Logo role="admin" />);
    expect(screen.getByTestId('logo')).toHaveAttribute('data-role', 'admin');
    expect(screen.getByTestId('logo-mark')).toHaveAttribute(
      'src',
      '/brandkit/logo/zentric-icon-admin.png',
    );
  });
});
