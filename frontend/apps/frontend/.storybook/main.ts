import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    // Storybook 10: `addon-essentials` quedo derogado y sus piezas
    // (viewport, toolbars, controls) viven en el core. Los addons que si
    // existen en v10 son docs, a11y, links y themes.
    '@storybook/addon-docs',
    '@storybook/addon-a11y',
    '@storybook/addon-links',
    '@storybook/addon-themes',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  staticDirs: ['../public'],
  viteFinal: async (config) => {
    return {
      ...config,
      css: {
        postcss: {},
      },
    };
  },
  features: {
    experimentalRSC: false,
  },
};

export default config;