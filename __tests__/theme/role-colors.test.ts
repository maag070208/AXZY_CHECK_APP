import { getRolePalette } from '../../src/shared/theme/role-colors';

describe('colores por rol (APP)', () => {
  it('usa los mismos colores base que el login WEB', () => {
    expect(getRolePalette('ADMIN').primary).toBe('#065911');
    expect(getRolePalette('SHIFT').primary).toBe('#064E4B');
    expect(getRolePalette('GUARD').primary).toBe('#0B2E4F');
    expect(getRolePalette('RESDN').primary).toBe('#3B1D5A');
  });

  it('cae en administración si el rol es desconocido', () => {
    expect(getRolePalette('UNKNOWN').role).toBe('ADMIN');
    expect(getRolePalette(null).role).toBe('ADMIN');
  });
});
