import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '@zentric/ui';

const meta: Meta<typeof Button> = {
  title: 'Design System/Primitives/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    backgrounds: { default: 'dark', values: [{ name: 'dark', value: '#0B0F19' }, { name: 'light', value: '#ffffff' }] },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'] },
    size: { control: 'select', options: ['default', 'sm', 'lg', 'icon', 'icon-sm'] },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = { args: { children: 'Button', variant: 'default' } };
export const Destructive: Story = { args: { children: 'Destructive', variant: 'destructive' } };
export const Outline: Story = { args: { children: 'Outline', variant: 'outline' } };
export const Secondary: Story = { args: { children: 'Secondary', variant: 'secondary' } };
export const Ghost: Story = { args: { children: 'Ghost', variant: 'ghost' } };
export const Link: Story = { args: { children: 'Link', variant: 'link' } };
export const Small: Story = { args: { children: 'Small', size: 'sm' } };
export const Large: Story = { args: { children: 'Large', size: 'lg' } };
export const Icon: Story = { args: { children: <span>+</span>, size: 'icon' } };
export const Disabled: Story = { args: { children: 'Disabled', disabled: true } };
export const Loading: Story = { args: { children: 'Loading', disabled: true } };

export const AllVariants: Story = {
  args: {},
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button variant="default">Default</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
    </div>
  ),
};

export const AllSizes: Story = {
  args: {},
  render: () => (
    <div className="flex items-center gap-4">
      <Button size="icon-sm">S</Button>
      <Button size="icon">M</Button>
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};