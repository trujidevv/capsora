import {
  faltaConsentimiento,
  nombreInicial,
} from '../src/logic/consentimiento';

describe('faltaConsentimiento', () => {
  test('quien se registró con correo ya lo dio', () => {
    expect(
      faltaConsentimiento({
        nombre: 'Carmen',
        privacidad_version: '2026-09-27',
        privacidad_aceptada_en: '2026-09-27T10:00:00.000Z',
      }),
    ).toBe(false);
  });

  test('quien entra por primera vez con Google no lo ha dado', () => {
    expect(
      faltaConsentimiento({
        full_name: 'Carmen López',
        email: 'carmen@gmail.com',
        email_verified: true,
      }),
    ).toBe(true);
  });

  test('sin datos o con la versión vacía, falta', () => {
    expect(faltaConsentimiento(undefined)).toBe(true);
    expect(faltaConsentimiento(null)).toBe(true);
    expect(faltaConsentimiento({ privacidad_version: '  ' })).toBe(true);
    expect(faltaConsentimiento({ privacidad_version: 20260927 })).toBe(true);
  });
});

describe('nombreInicial', () => {
  test('manda el nombre que eligió la persona', () => {
    expect(nombreInicial({ nombre: 'Mamá', given_name: 'Carmen' })).toBe(
      'Mamá',
    );
  });

  test('con Google, el nombre de pila antes que el completo', () => {
    expect(
      nombreInicial({ given_name: 'Carmen', full_name: 'Carmen López' }),
    ).toBe('Carmen');
    expect(nombreInicial({ full_name: ' Carmen López ' })).toBe('Carmen López');
  });

  test('sin nombre, vacío', () => {
    expect(nombreInicial({ email: 'carmen@gmail.com' })).toBe('');
    expect(nombreInicial(undefined)).toBe('');
  });
});
