import type { Preview } from '@storybook/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../src/app/providers/authContext';
import { appServices } from '../src/app/providers/appServices';
import { UserRole } from '../src/domain';
import '@zentric/ui/styles/theme.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, gcTime: 0 },
    mutations: { retry: false },
  },
});

const defaultAuthValue = {
  session: appServices.session,
  api: appServices.api,
  user: {
    userId: 'buyer-1',
    email: 'comprador@zentric.co',
    fullName: 'Comprador Demo',
    role: UserRole.Buyer,
  },
  accessToken: 'mock-token',
  role: UserRole.Buyer,
  expiredNotice: null,
  login: () => {},
  logout: () => {},
  clearExpiredNotice: () => {},
};

const PreviewWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    <AuthContext.Provider value={defaultAuthValue}>
      <div className="zentric-app">{children}</div>
    </AuthContext.Provider>
  </QueryClientProvider>
);

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#0B0F19' },
        { name: 'surface', value: '#111827' },
        { name: 'light', value: '#ffffff' },
      ],
    },
    a11y: {
      config: {
        rules: [
          { id: 'color-contrast', enabled: true },
          { id: 'keyboard', enabled: true },
          { id: 'aria-roles', enabled: true },
        ],
      },
    },
    viewport: {
      viewports: {
        mobile: { name: 'Mobile', styles: { width: '375px', height: '667px' } },
        tablet: { name: 'Tablet', styles: { width: '768px', height: '1024px' } },
        desktop: { name: 'Desktop', styles: { width: '1280px', height: '720px' } },
        wide: { name: 'Wide', styles: { width: '1920px', height: '1080px' } },
      },
    },
    chromatic: {
      viewports: [375, 768, 1280, 1920],
      diffThreshold: 0.2,
    },
  },
  decorators: [
    (Story) => <PreviewWrapper>{<Story />}</PreviewWrapper>,
  ],
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      defaultValue: 'dark',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: ['dark', 'light'],
        dynamicTitle: true,
      },
    },
    role: {
      description: 'User role for auth context',
      defaultValue: 'buyer',
      toolbar: {
        title: 'Role',
        icon: 'user',
        items: ['buyer', 'seller', 'admin', 'logistics', 'supervisor'],
      },
    },
  },
};

export default preview;