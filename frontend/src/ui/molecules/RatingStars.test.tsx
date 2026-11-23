import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RatingStars } from './RatingStars';

describe('RatingStars Molecule (@zentric/ui/molecules)', () => {
  it('renders slider role with proper ARIA accessibility attributes', () => {
    render(<RatingStars value={3} max={5} aria-label="Calificación del producto" />);

    const slider = screen.getByRole('slider', { name: 'Calificación del producto' });
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveAttribute('aria-valuenow', '3');
    expect(slider).toHaveAttribute('aria-valuemin', '1');
    expect(slider).toHaveAttribute('aria-valuemax', '5');
    expect(slider).toHaveAttribute('aria-valuetext', '3 de 5 estrellas');
    expect(slider).toHaveAttribute('tabindex', '0');
  });

  it('renders exactly 5 stars by default', () => {
    const { container } = render(<RatingStars value={4} />);
    const buttons = container.querySelectorAll('button[type="button"]');
    expect(buttons.length).toBe(5);
  });

  it('renders custom max number of stars', () => {
    const { container } = render(<RatingStars value={2} max={7} />);
    const buttons = container.querySelectorAll('button[type="button"]');
    expect(buttons.length).toBe(7);

    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuemax', '7');
  });

  it('invokes onChange when clicking on a star button', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<RatingStars value={0} onChange={handleChange} />);

    const starButtons = screen.getAllByRole('button');
    expect(starButtons.length).toBe(5);

    // Click 4th star (index 3)
    await user.click(starButtons[3]!);
    expect(handleChange).toHaveBeenCalledWith(4);

    // Click 1st star
    await user.click(starButtons[0]!);
    expect(handleChange).toHaveBeenCalledWith(1);
  });

  it('supports full keyboard navigation with ArrowRight, ArrowLeft, Home, and End', () => {
    const handleChange = vi.fn();
    const { rerender } = render(<RatingStars value={3} max={5} onChange={handleChange} />);
    const slider = screen.getByRole('slider');

    // ArrowRight increments
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(handleChange).toHaveBeenCalledWith(4);

    // ArrowUp increments
    handleChange.mockClear();
    fireEvent.keyDown(slider, { key: 'ArrowUp' });
    expect(handleChange).toHaveBeenCalledWith(4);

    // ArrowLeft decrements
    handleChange.mockClear();
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(handleChange).toHaveBeenCalledWith(2);

    // ArrowDown decrements
    handleChange.mockClear();
    fireEvent.keyDown(slider, { key: 'ArrowDown' });
    expect(handleChange).toHaveBeenCalledWith(2);

    // Home jumps to 1
    handleChange.mockClear();
    fireEvent.keyDown(slider, { key: 'Home' });
    expect(handleChange).toHaveBeenCalledWith(1);

    // End jumps to max (5)
    handleChange.mockClear();
    fireEvent.keyDown(slider, { key: 'End' });
    expect(handleChange).toHaveBeenCalledWith(5);

    // Clamps to max on ArrowRight at 5
    rerender(<RatingStars value={5} max={5} onChange={handleChange} />);
    handleChange.mockClear();
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(handleChange).toHaveBeenCalledWith(5);

    // Clamps to 1 on ArrowLeft at 1
    rerender(<RatingStars value={1} max={5} onChange={handleChange} />);
    handleChange.mockClear();
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(handleChange).toHaveBeenCalledWith(1);
  });

  it('supports Space and Enter keyboard keys', () => {
    const handleChange = vi.fn();
    render(<RatingStars value={0} max={5} onChange={handleChange} />);
    const slider = screen.getByRole('slider');

    fireEvent.keyDown(slider, { key: 'Enter' });
    expect(handleChange).toHaveBeenCalledWith(1);

    handleChange.mockClear();
    fireEvent.keyDown(slider, { key: ' ' });
    expect(handleChange).toHaveBeenCalledWith(1);
  });

  it('updates visual preview on mouseEnter and resets on mouseLeave', () => {
    const { container } = render(<RatingStars value={2} />);
    const starButtons = screen.getAllByRole('button');

    // Hover over 4th star
    fireEvent.mouseEnter(starButtons[3]!);
    let filledStars = container.querySelectorAll('.text-accent-gold');
    expect(filledStars.length).toBe(4);

    // Mouse leaves the slider container
    const slider = screen.getByRole('slider');
    fireEvent.mouseLeave(slider);
    filledStars = container.querySelectorAll('.text-accent-gold');
    expect(filledStars.length).toBe(2);
  });

  it('handles disabled state correctly without interaction', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<RatingStars value={3} disabled onChange={handleChange} />);

    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-disabled', 'true');
    expect(slider).toHaveAttribute('tabindex', '-1');

    const starButtons = screen.getAllByRole('button');
    await user.click(starButtons[4]!);
    expect(handleChange).not.toHaveBeenCalled();

    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('handles readOnly state correctly', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<RatingStars value={4} readOnly onChange={handleChange} />);

    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-readonly', 'true');
    expect(slider).toHaveAttribute('tabindex', '-1');

    const starButtons = screen.getAllByRole('button');
    await user.click(starButtons[0]!);
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('renders size variants (sm, md, lg)', () => {
    const { container, rerender } = render(<RatingStars value={3} size="sm" />);
    expect(container.querySelector('.size-4')).toBeInTheDocument();

    rerender(<RatingStars value={3} size="md" />);
    expect(container.querySelector('.size-6')).toBeInTheDocument();

    rerender(<RatingStars value={3} size="lg" />);
    expect(container.querySelector('.size-8')).toBeInTheDocument();
  });

  it('renders hidden input when name is provided for HTML forms', () => {
    const { container } = render(<RatingStars value={4} name="product_rating" />);
    const hiddenInput = container.querySelector('input[name="product_rating"]');
    expect(hiddenInput).toBeInTheDocument();
    expect(hiddenInput).toHaveValue('4');
  });
});
