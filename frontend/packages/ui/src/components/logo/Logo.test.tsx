import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Logo } from './Logo';
import { LogoMark } from './LogoMark';
import { LogoWordmark } from './LogoWordmark';

describe('LogoMark', () => {
  it('es decorativo cuando no recibe titulo', () => {
    render(<LogoMark />);
    expect(screen.getByTestId('logo-mark')).toHaveAttribute('aria-hidden', 'true');
  });

  it('se declara como imagen con texto alternativo cuando recibe titulo', () => {
    render(<LogoMark title="Zentric" />);
    const mark = screen.getByTestId('logo-mark');
    expect(mark).toHaveAttribute('role', 'img');
    expect(mark).toHaveAttribute('aria-label', 'Zentric');
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

  it('compone simbolo y marca tipografica juntos', () => {
    render(<Logo />);
    expect(screen.getByTestId('logo-mark')).toBeInTheDocument();
    expect(screen.getByTestId('logo-wordmark')).toBeInTheDocument();
  });
});
