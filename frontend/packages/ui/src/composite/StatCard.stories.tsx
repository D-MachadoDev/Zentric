import type { Meta, StoryObj } from '@storybook/react';
import { StatCard } from './StatCard';
import { Boxes, CheckCircle, Clock, TrendingUp, Truck } from 'lucide-react';

/**
 * Catalogo del compuesto `StatCard` (Frontend-Design-System 5.3).
 *
 * Metrica KPI en la banda asimetrica: variante `hero` dominante y variantes
 * `compact` / `secondary` en linea. Cifra en Geist Mono 600 con
 * `tabular-nums` (4.1).
 */
const meta = {
  title: 'Design System/Composite/StatCard',
  component: StatCard,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#0C0F16' },
        { name: 'light', value: '#F5F6F8' },
      ],
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'inline-radio', options: ['hero', 'compact', 'secondary'] },
  },
} satisfies Meta<typeof StatCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Metrica secundaria: contador en linea con insignia de contexto. */
export const Default: Story = {
  args: {
    title: 'Pedidos pendientes de pago',
    value: '3',
    subtitle: 'Ventana atomica de 15 minutos',
    badge: { label: 'Accion requerida', tone: 'warning' },
    icon: Clock,
  },
};

/** Metrica dominante: la cifra heroica del dashboard. */
export const Hero: Story = {
  args: {
    variant: 'hero',
    title: 'Liquidacion neta acumulada',
    value: '$48.320.000',
    subtitle: 'Total acreditado en facturas VendorDetail',
    badge: { label: 'Liquidado', tone: 'success' },
    icon: TrendingUp,
    trend: { value: '+12.4%', direction: 'up', label: 'vs. mes anterior' },
  },
};

/** Indicador de tendencia a la baja. */
export const WithDownTrend: Story = {
  args: {
    title: 'Tasa de quiebre de stock',
    value: '1.8%',
    subtitle: 'Ultimos 30 dias',
    badge: { label: 'En observacion', tone: 'neutral' },
    icon: Boxes,
    trend: { value: '-0.6 pp', direction: 'down', label: 'vs. mes anterior' },
  },
};

/** Barra de progreso con rol accesible `progressbar`. */
export const WithProgress: Story = {
  args: {
    title: 'Meta de liquidacion mensual',
    value: '72%',
    subtitle: 'Corresponde a $48.320.000 de $67.000.000',
    icon: Truck,
    progress: { value: 72, max: 100, label: 'Avance de la meta' },
  },
};

/** Banda KPI asimetrica: una hero y dos contadores en linea (sin tarjetas clonadas). */
export const KpiStrip: Story = {
  args: { title: 'Metrica', value: '1.234' },
  render: () => (
    <div className="grid w-[52rem] grid-cols-1 gap-6 sm:grid-cols-3">
      <StatCard
        variant="hero"
        title="Entregados"
        value="128"
        subtitle="Ultimos 30 dias"
        badge={{ label: 'Completados', tone: 'success' }}
        icon={CheckCircle}
      />
      <StatCard
        title="Pendientes de pago"
        value="3"
        badge={{ label: 'Accion requerida', tone: 'warning' }}
        icon={Clock}
      />
      <StatCard
        title="Despachos por empacar"
        value="11"
        badge={{ label: 'Pendiente', tone: 'info' }}
        icon={Truck}
      />
    </div>
  ),
};
