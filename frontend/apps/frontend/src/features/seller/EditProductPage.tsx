import { useParams } from '@tanstack/react-router';
import { CreateProductPage } from './CreateProductPage';

export function EditProductPage() {
  const { productId } = useParams({ strict: false }) as { productId?: string };
  return <CreateProductPage productId={productId} />;
}
