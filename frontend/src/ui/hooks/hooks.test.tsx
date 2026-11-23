import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDebounce } from './useDebounce';
import { breakpoints, useMediaQuery } from './useMediaQuery';

describe('useDebounce', () => {
  it('retrasa la actualizacion del valor hasta cumplir el delay', () => {
    vi.useFakeTimers();
    try {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'inicial', delay: 200 } },
      );

      expect(result.current).toBe('inicial');

      rerender({ value: 'actualizado', delay: 200 });
      expect(result.current).toBe('inicial');

      act(() => {
        vi.advanceTimersByTime(199);
      });
      expect(result.current).toBe('inicial');

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(result.current).toBe('actualizado');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('useMediaQuery y breakpoints', () => {
  it('expone las rupturas canónicas del design system y se suscribe a matchMedia', () => {
    expect(breakpoints.sidebar).toBe('(min-width: 901px)');
    expect(breakpoints.compact).toBe('(max-width: 900px)');
    expect(breakpoints.stacked).toBe('(max-width: 560px)');

    let listener: (() => void) | undefined;
    let matches = false;

    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: (_event: string, cb: () => void) => {
        listener = cb;
      },
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    try {
      const { result, unmount } = renderHook(() => useMediaQuery(breakpoints.sidebar));
      expect(result.current).toBe(false);

      act(() => {
        matches = true;
        listener?.();
      });
      expect(result.current).toBe(true);

      unmount();
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });
});
