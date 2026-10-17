import { describe, expect, it, vi } from 'vitest';
import { MemorySessionAdapter } from '../MemorySessionAdapter';
import { UserRole } from '../../../domain';
import type { CurrentUser } from '../../../domain';

describe('MemorySessionAdapter (ADR-0009)', () => {
  it('retiene el access token exclusivamente en memoria RAM', () => {
    const session = new MemorySessionAdapter();
    expect(session.getAccessToken()).toBeNull();

    session.setAccessToken('jwt-token-valido');
    expect(session.getAccessToken()).toBe('jwt-token-valido');

    // Invariante de seguridad: Prohibido tocar localStorage, sessionStorage o cookies
    expect(typeof window !== 'undefined' ? window.localStorage?.getItem('token') : null).toBeFalsy();
  });

  it('administra el usuario activo y mantiene sincronizado rol y userId', () => {
    const session = new MemorySessionAdapter();
    const user: CurrentUser = {
      userId: 'user-123',
      email: 'user@zentric.test',
      fullName: 'Usuario Prueba',
      role: UserRole.Seller,
    };

    session.setUser(user);
    expect(session.getUser()).toEqual(user);
    expect(session.getRole()).toBe(UserRole.Seller);
    expect(session.getUserId()).toBe('user-123');

    session.setRole(UserRole.Administrator);
    expect(session.getRole()).toBe(UserRole.Administrator);
    expect(session.getUser()?.role).toBe(UserRole.Administrator);

    session.setUserId('user-456');
    expect(session.getUserId()).toBe('user-456');
    expect(session.getUser()?.userId).toBe('user-456');
  });

  it('clear purga inmediatamente el estado en memoria y notifica a los suscriptores', () => {
    const session = new MemorySessionAdapter();
    const listener = vi.fn();
    session.subscribe(listener);

    session.setAccessToken('token-a-borrar');
    session.setUser({
      userId: 'u-1',
      email: 'u@test.com',
      fullName: 'U Test',
      role: UserRole.Buyer,
    });

    expect(listener).toHaveBeenCalled();
    listener.mockClear();

    session.clear();

    expect(session.getAccessToken()).toBeNull();
    expect(session.getUser()).toBeNull();
    expect(session.getRole()).toBeNull();
    expect(session.getUserId()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('restore devuelve false sin invocar el cargador si no hay token en memoria', async () => {
    const session = new MemorySessionAdapter();
    const loader = vi.fn();
    session.bindIdentityLoader(loader);

    const restored = await session.restore();

    expect(restored).toBe(false);
    expect(loader).not.toHaveBeenCalled();
  });

  it('restore invoca el cargador y actualiza el usuario si hay token en memoria', async () => {
    const session = new MemorySessionAdapter();
    const expectedUser: CurrentUser = {
      userId: 'restored-user',
      email: 'restored@zentric.test',
      fullName: 'Restored User',
      role: UserRole.Supervisor,
    };
    const loader = vi.fn().mockResolvedValue(expectedUser);

    session.bindIdentityLoader(loader);
    session.setAccessToken('valid-token');

    const restored = await session.restore();

    expect(restored).toBe(true);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(session.getUser()).toEqual(expectedUser);
    expect(session.getRole()).toBe(UserRole.Supervisor);
  });

  it('restore limpia la sesión si el cargador de identidad falla (Fail-Closed)', async () => {
    const session = new MemorySessionAdapter();
    const loader = vi.fn().mockRejectedValue(new Error('Token expirado'));

    session.bindIdentityLoader(loader);
    session.setAccessToken('expired-token');

    const restored = await session.restore();

    expect(restored).toBe(false);
    expect(session.getAccessToken()).toBeNull();
    expect(session.getUser()).toBeNull();
  });

  it('unsubscribe detiene la recepción de eventos', () => {
    const session = new MemorySessionAdapter();
    const listener = vi.fn();
    const unsubscribe = session.subscribe(listener);

    session.setAccessToken('t-1');
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    session.setAccessToken('t-2');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
