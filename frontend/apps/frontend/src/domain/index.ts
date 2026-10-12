/**
 * Capa de dominio del cliente (Frontend-Architecture §2).
 *
 * Importa NADA del proyecto: es el centro hexagonal. Contiene el vocabulario
 * (modelos y enums transcritos del contrato del backend) y los
 * puertos que definen qué necesita la aplicación.
 */
export * from './enums';
export * from './models';
export * from './rules';
export * from './ports';
