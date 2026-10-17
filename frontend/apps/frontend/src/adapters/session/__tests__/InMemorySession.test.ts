import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '../../../domain';
import type { CurrentUser } from '../../../domain';
import { InMemorySession } from '../InMemorySession';

beforeEach(() => {
  localStorage.clear();
});

describe('InMemorySession ([ADDENDUM OWNER] ADR-0009)', () => {
  it('persiste el access token en localStorage y lo hidrata en una nueva instancia', () => {
    const session = new InMemorySession();

    session.setAccessToken('tok-secreto');

    expect(session.getAccessToken()).toBe('tok-secreto');
    expect(localStorage.getItem('zentric.auth.token')).toBe('tok-secreto');

    const reloadedSession = new InMemorySession();
    expect(reloadedSession.getAccessToken()).toBe('tok-secreto');
  });

  it('clear() devuelve la sesión al estado inicial', () => {
    const session = new InMemorySession();
    session.setAccessToken('tok');
    session.setRole(UserRole.Seller);
    session.setUserId('u-1');

    session.clear();

    expect(session.getAccessToken()).toBeNull();
    expect(session.getRole()).toBeNull();
    expect(session.getUserId()).toBeNull();
  });

  it('sin token no restaura nada ni siquiera consulta al servidor', async () => {
    const loadIdentity = vi.fn();
    const session = new InMemorySession();
    session.bindIdentityLoader(loadIdentity);

    await expect(session.restore()).resolves.toBe(false);
    expect(loadIdentity).not.toHaveBeenCalled();
  });

  it('con token reconstruye la identidad desde el servidor', async () => {
    const identity: CurrentUser = {
      userId: 'u-1',
      email: 'ana@zentric.dev',
      fullName: 'Ana',
      role: UserRole.Seller,
    };
    const session = new InMemorySession();
    session.bindIdentityLoader(async () => identity);
    session.setAccessToken('tok');

    await expect(session.restore()).resolves.toBe(true);
    expect(session.getRole()).toBe(UserRole.Seller);
    expect(session.getUserId()).toBe('u-1');
  });

  it('restore() no prolonga la vida del token: lo conserva tal cual (§4)', async () => {
    const session = new InMemorySession();
    session.setAccessToken('tok-vigente');
    session.bindIdentityLoader(async () => ({ userId: 'u-1', email: 'e', fullName: 'f', role: UserRole.Buyer }));

    await session.restore();

    expect(session.getAccessToken()).toBe('tok-vigente');
  });
});
