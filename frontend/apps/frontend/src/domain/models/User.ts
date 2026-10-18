import type { UserRole } from '../enums';

/**
 * Usuario del sistema (`UserDto`).
 *
 * Origen: `backend/Zentric.Application/Users/Queries/GetUsersQuery.cs`.
 * El nombre completo se expone como `name` (no `fullName`, que es el de `CurrentUser`).
 */
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  identityDocument: string;
  isActive: boolean;
  /** ISO-8601 (DateTime). */
  createdAt: string;
}

/**
 * Alta de usuario (`CreateUserCommand`).
 *
 * Q-21b: la identidad la fija el token, no el cuerpo. `CreateUserCommand` no
 * lleva identidad del llamante, así que el cuerpo es completo aquí.
 * La unicidad de documento y correo la valida el servidor; el cliente sólo da
 * feedback inmediato (Frontend-Domain-Services §1).
 */
export interface CreateUserInput {
  identityDocument: string;
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
}

/**
 * Dirección física de despacho del comprador (`AddressDto`).
 */
export interface UserAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
}

export type AddressDto = UserAddress;

/**
 * Perfil persistente del usuario / comprador (`UserProfileDto`).
 * Origen: GET /api/users/profile
 */
export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  documentNumber?: string;
  role: string;
  phone?: string | null;
  address?: UserAddress | null;
}

export type UserProfileDto = UserProfile;

/**
 * Entrada para actualizar el perfil del usuario (`UpdateUserProfileRequest`).
 * Origen: PUT /api/users/profile
 */
export interface UpdateUserProfileInput {
  fullName: string;
  phone?: string | null;
  documentNumber?: string | null;
  address?: UserAddress | null;
}

export type UpdateUserProfileRequest = UpdateUserProfileInput;

