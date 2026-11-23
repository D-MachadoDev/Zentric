import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  ProductReviewModal,
  type ProductFeedbackSubmission,
} from './ProductReviewModal';

describe('ProductReviewModal Suite', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    orderId: 'ZT-88492',
    productId: 'iphone-16-pro-max',
    productName: 'Apple iPhone 16 Pro Max — 256GB Titanio Natural',
    variantName: '256GB / Titanio Natural',
    isVerifiedPurchase: true,
  };

  it('renders clean product header without cardception and disables submit when rating is 0', () => {
    render(<ProductReviewModal {...defaultProps} />);

    expect(screen.getByText('Calificar Producto')).toBeInTheDocument();
    expect(
      screen.getByText('Apple iPhone 16 Pro Max — 256GB Titanio Natural')
    ).toBeInTheDocument();
    expect(screen.getByText('Compra verificada')).toBeInTheDocument();
    expect(screen.getByText('Pedido #ZT-88492')).toBeInTheDocument();

    const submitButton = screen.getByRole('button', { name: 'Publicar Reseña' });
    expect(submitButton).toBeDisabled();
  });

  it('handles ultra-long product name gracefully with title attribute and clamp', () => {
    const longName =
      'Apple iPhone 16 Pro Max 256GB Titanio Natural (Desbloqueado para cualquier operador nacional e internacional) - Edición Especial Importada con Garantía Extendida de 2 Años';

    render(<ProductReviewModal {...defaultProps} productName={longName} />);

    const heading = screen.getByTitle(longName);
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveClass('line-clamp-2');
  });

  it('allows selecting stars, product aspect tags, and typing review within 500 chars limit', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();

    render(
      <ProductReviewModal {...defaultProps} onSubmitReview={handleSubmit} />
    );

    // Select 5 stars
    const starButtons = screen.getAllByRole('button').filter((b) =>
      b.getAttribute('aria-label')?.includes('estrella')
    );
    expect(starButtons.length).toBe(5);
    await user.click(starButtons[4]!); // 5th star

    // Submit is now enabled
    const submitButton = screen.getByRole('button', { name: 'Publicar Reseña' });
    expect(submitButton).not.toBeDisabled();

    // Toggle aspect tags (Zero emojis)
    const tagMaterial = screen.getByRole('button', {
      name: 'Calidad de materiales',
    });
    const tagDisplay = screen.getByRole('button', { name: 'Pantalla' });

    await user.click(tagMaterial);
    await user.click(tagDisplay);

    expect(tagMaterial).toHaveClass('bg-primary');
    expect(tagDisplay).toHaveClass('bg-primary');

    // Type review
    const reviewContent =
      'Hardware extraordinario, acabado de titanio mate impecable.';
    const textarea = screen.getByPlaceholderText(
      /¿Qué tal fue el rendimiento/i
    );
    await user.type(textarea, reviewContent);

    expect(
      screen.getByText(new RegExp(`${reviewContent.length} / 500`))
    ).toBeInTheDocument();

    // Submit review
    await user.click(submitButton);

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    const firstCall = handleSubmit.mock.calls[0];
    expect(firstCall).toBeDefined();
    const payload = firstCall![0] as ProductFeedbackSubmission;
    expect(payload.orderId).toBe('ZT-88492');
    expect(payload.productId).toBe('iphone-16-pro-max');
    expect(payload.rating).toBe(5);
    expect(payload.productTags).toContain('Calidad de materiales');
    expect(payload.productTags).toContain('Pantalla');
    expect(payload.reviewText).toBe(
      'Hardware extraordinario, acabado de titanio mate impecable.'
    );
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('enforces 500 characters limit on review text', () => {
    render(<ProductReviewModal {...defaultProps} />);

    const textarea = screen.getByPlaceholderText(
      /¿Qué tal fue el rendimiento/i
    );

    const text550 = 'A'.repeat(550);
    fireEvent.change(textarea, { target: { value: text550 } });

    // Should not accept more than 500 chars
    expect((textarea as HTMLTextAreaElement).value.length).toBe(0);

    const text500 = 'B'.repeat(500);
    fireEvent.change(textarea, { target: { value: text500 } });
    expect((textarea as HTMLTextAreaElement).value.length).toBe(500);
    expect(screen.getByText('500 / 500')).toBeInTheDocument();
    expect(screen.getByText('500 / 500')).toHaveClass('text-amber-600');
  });

  it('submits strictly typed ProductFeedbackSubmission via onSubmitProductFeedback callback', async () => {
    const user = userEvent.setup();
    const handleProductFeedback = vi.fn();

    render(
      <ProductReviewModal
        {...defaultProps}
        onSubmitProductFeedback={handleProductFeedback}
      />
    );

    const starButtons = screen.getAllByRole('button').filter((b) =>
      b.getAttribute('aria-label')?.includes('estrella')
    );
    await user.click(starButtons[3]!); // 4 stars

    const submitButton = screen.getByRole('button', { name: 'Publicar Reseña' });
    await user.click(submitButton);

    expect(handleProductFeedback).toHaveBeenCalledTimes(1);
    const submission: ProductFeedbackSubmission =
      handleProductFeedback.mock.calls[0]![0];
    expect(submission.orderId).toBe('ZT-88492');
    expect(submission.productId).toBe('iphone-16-pro-max');
    expect(submission.rating).toBe(4);
    expect(submission.visibility).toBe('public_catalog');
    expect(submission.isVerifiedPurchase).toBe(true);
  });

  it('does not display verified purchase badge when isVerifiedPurchase is false', () => {
    render(
      <ProductReviewModal {...defaultProps} isVerifiedPurchase={false} />
    );

    expect(screen.queryByText('Compra verificada')).not.toBeInTheDocument();
  });
});
