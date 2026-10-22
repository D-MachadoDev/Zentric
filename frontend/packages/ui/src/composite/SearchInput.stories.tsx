import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { SearchInput } from './SearchInput';

/**
 * Catalogo del compuesto `SearchInput` (Frontend-Design-System 5.3).
 *
 * Busqueda con combobox accesible: historial, sugerencias y navegacion por
 * teclado (`ArrowUp` / `ArrowDown` / `Enter` / `Escape`).
 */
const meta = {
  title: 'Design System/Composite/SearchInput',
  component: SearchInput,
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
    placeholder: { control: 'text' },
    disabled: { control: 'boolean' },
    showRecentSearches: { control: 'boolean' },
  },
} satisfies Meta<typeof SearchInput>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Busqueda vacia con historial reciente.
 *
 * Va en un componente con nombre propio: la regla de hooks prohibe llamar a
 * `useState` dentro de la funcion anonima `render` de Storybook.
 */
function SearchWithHistory() {
  const [value, setValue] = useState('');

  return (
    <div className="w-[28rem]">
      <SearchInput
        value={value}
        onChange={setValue}
        recentSearches={['teclado mecanico', 'monitor 27']}
      />
    </div>
  );
}

/** Sugerencias con contador de resultados y categorias populares. */
function SearchWithSuggestions() {
  const [value, setValue] = useState('');

  return (
    <div className="w-[28rem]">
      <SearchInput
        value={value}
        onChange={setValue}
        placeholder="Buscar por nombre o especificacion tecnica..."
        suggestions={[
          { id: 'p1', label: 'Teclado mecanico 87 teclas', type: 'suggestion', count: 12 },
          { id: 'p2', label: 'Teclado membrane 104 teclas', type: 'suggestion', count: 7 },
          { id: 'p3', label: 'Teclado ergonomico split', type: 'suggestion', count: 3 },
        ]}
      />
    </div>
  );
}

/** Texto escrito: el boton de buscar se habilita. */
function SearchWithValue() {
  const [value, setValue] = useState('monitor gaming 27');

  return (
    <div className="w-[28rem]">
      <SearchInput value={value} onChange={setValue} />
    </div>
  );
}

/** Control deshabilitado: no admite edicion ni busqueda. */
function SearchDisabled() {
  const [value, setValue] = useState('');

  return (
    <div className="w-[28rem]">
      <SearchInput value={value} onChange={setValue} disabled />
    </div>
  );
}

/** Busqueda vacia con historial reciente. */
export const Default: Story = {
  args: { value: '', onChange: () => undefined },
  render: () => <SearchWithHistory />,
};

/** Sugerencias con contador de resultados y categorias populares. */
export const WithSuggestions: Story = {
  args: { value: '', onChange: () => undefined },
  render: () => <SearchWithSuggestions />,
};

/** Texto escrito: el boton de buscar se habilita. */
export const WithValue: Story = {
  args: { value: '', onChange: () => undefined },
  render: () => <SearchWithValue />,
};

/** Control deshabilitado: no admite edicion ni busqueda. */
export const Disabled: Story = {
  args: { value: '', onChange: () => undefined },
  render: () => <SearchDisabled />,
};
