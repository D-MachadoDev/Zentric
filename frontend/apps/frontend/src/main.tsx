import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import { AppQueryClientProvider } from './app/providers/AppQueryClientProvider';
import { AuthProvider } from './app/providers/AuthProvider';
import { AppRouterProvider } from './app/routes/AppRouter';
import { AlertHost } from './components/alert/AlertHost';
import './styles/global.css';

// Punto de entrada (C4-4-Codigo-React.md seccion 1).
// El orden de los providers importa: AppQueryClientProvider envuelve al router
// porque los hooks de datos se usan desde las rutas y sus guardas; AuthProvider
// va dentro para que las rutas que llaman useAuth() esten bajo QueryClientProvider.
// AlertHost va el ultimo: es el host que escucha al adaptador de alertas y
// monta el Toaster y el dialogo de confirmacion de toda la consola.
const container = document.getElementById('root');

if (!container) {
  // Sin #root no hay app que montar: falla explicito en vez de un blanco eterno.
  throw new Error('No se encontro el elemento #root en index.html');
}

createRoot(container).render(
  <StrictMode>
    <AppQueryClientProvider>
      <AuthProvider>
        <AppRouterProvider />
      </AuthProvider>
      <AlertHost />
    </AppQueryClientProvider>
  </StrictMode>,
);
