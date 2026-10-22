import type { Meta, StoryObj } from '@storybook/react';
import { BuyerCatalogPage } from './BuyerCatalogPage';
import { appServices } from '../../app/providers/appServices';
import { AuthContext } from '../../app/providers/authContext';
import { UserRole } from '../../domain';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

const mockAuth = {
  session: appServices.session,
  api: appServices.api,
  user: { userId: 'buyer-1', email: 'buyer@test.com', fullName: 'Buyer', role: UserRole.Buyer },
  accessToken: 'mock-token',
  role: UserRole.Buyer,
  expiredNotice: null,
  login: async () => ({
    userId: 'buyer-1',
    email: 'buyer@test.com',
    fullName: 'Buyer',
    role: UserRole.Buyer,
  }),
  logout: () => {},
  clearExpiredNotice: () => {},
};

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    <AuthContext.Provider value={mockAuth}>{children}</AuthContext.Provider>
  </QueryClientProvider>
);

const meta: Meta<typeof BuyerCatalogPage> = {
  title: 'Buyer/Catalog/BuyerCatalogPage',
  component: BuyerCatalogPage,
  decorators: [(Story) => <Wrapper>{<Story />}</Wrapper>],
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'dark', values: [{ name: 'dark', value: '#0B0F19' }, { name: 'surface', value: '#111827' }] },
    viewport: { defaultViewport: 'desktop' },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof BuyerCatalogPage>;

export const Default: Story = {};

export const Loading: Story = {};

export const EmptyState: Story = {};

export const WithCategories: Story = {};

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

export const Tablet: Story = {
  parameters: { viewport: { defaultViewport: 'tablet' } },
};