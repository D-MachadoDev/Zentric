import base from '@zentric/config/eslint/base.js';

// ESLint de la app: reutiliza la base compartida y anade lo propio de Vite.
export default [...base, { ignores: ['dist/**'] }];
