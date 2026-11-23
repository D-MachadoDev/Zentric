/**
 * Canonical Feedback and Review Domain Contracts.
 * Defined based on Veronica's Systemic Specification (docs/spec/frontend/04-experiencia/VERONICA-SPEC-PRODUCT-REVIEW.md).
 * Architecture: Decoupled Product Catalog Evaluation vs. Fulfillment / Logistics Evaluation.
 */

export type PackageCondition = 'intact' | 'dented' | 'opened' | 'damaged';

/**
 * Public Product Feedback Submission
 * Represents buyer feedback strictly concerning the hardware / product SKU.
 * Feeds into the public catalog, product detail page (PDP), and product rating score.
 */
export interface ProductFeedbackSubmission {
  /** Present when the review was submitted from a known delivered order. */
  orderId?: string;
  productId: string;
  variantId?: string;
  rating: number; // 1 to 5
  title?: string;
  reviewText: string;
  productTags: string[];
  photoUrls: string[];
  isVerifiedPurchase: boolean;
  visibility?: 'public_catalog';
  createdAt?: string;
}

/**
 * Logistics & Fulfillment Feedback Submission
 * Represents feedback on the delivery experience, carrier performance, and packaging.
 * Feeds into internal operations, carrier SLAs, and seller fulfillment scoring.
 * Crucially DOES NOT degrade the hardware SKU product rating.
 */
export interface FulfillmentFeedbackSubmission {
  orderId: string;
  deliveryRating: number; // 1 to 5
  onTimeDelivery: boolean;
  delayDays?: number;
  packageCondition: PackageCondition;
  carrierNotes?: string;
  logisticsTags: string[];
  carrierName?: string;
  visibility?: 'internal_ops_and_seller_score';
  createdAt?: string;
}

/**
 * Decoupled Feedback Submission Payload
 * The composite submission payload emitted by DecoupledReviewModal.
 * Bridges both domains with zero cross-contamination.
 */
export interface DecoupledFeedbackSubmission {
  orderId: string;
  productId: string;
  variantId?: string;

  // Product Domain
  productFeedback: ProductFeedbackSubmission;
  // Fulfillment Domain (optional if logistics was not evaluated)
  fulfillmentFeedback?: FulfillmentFeedbackSubmission;

  // Dual-key compatibility for component internal state and tests
  productReview: ProductFeedbackSubmission;
  fulfillmentReview?: FulfillmentFeedbackSubmission;

  metadata?: {
    submittedAt: string;
    clientDraftKey: string;
    appVersion: string;
  };
}

// Aliases for compatibility
export type Proposal1ProductReview = ProductFeedbackSubmission;
export type Proposal2DecoupledReview = DecoupledFeedbackSubmission;
