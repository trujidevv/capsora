import {
  aFecha,
  fechaHora,
  fechaLarga,
  haceCuanto,
  momentoDelDia,
  normalizarHora,
  rangoFechas,
  sumarDias,
  diaSemanaLunes,
  zonaHorariaFiable,
} from '../src/logic/fechas';

describe('fechas', () => {
  test('aFecha usa el día local, no UTC', () => {
    // 23:30 en Madrid es el mismo día aunque en UTC ya sea el siguiente... o no:
    const d = new Date(2026, 8, 25, 23, 30);
    expect(aFecha(d)).toBe('2026-09-25');
  });

  test('sumarDias cruza meses, años y cambios de hora', () => {
    expect(sumarDias('2026-09-30', 1)).toBe('2026-10-01');
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01');
    expect(sumarDias('2026-03-01', -1)).toBe('2026-02-28');
    // Cambio de hora en España: 25 de octubre de 2026
    expect(sumarDias('2026-10-24', 1)).toBe('2026-10-25');
    expect(sumarDias('2026-10-25', 1)).toBe('2026-10-26');
    expect(sumarDias('2026-03-28', 1)).toBe('2026-03-29');
    expect(sumarDias('2026-03-29', 1)).toBe('2026-03-30');
  });

  test('normalizarHora acepta el formato de Postgres', () => {
    expect(normalizarHora('08:00:00')).toBe('08:00');
    expect(normalizarHora('8:5')).toBe('08:05');
  });

  test('fechaHora da la hora local correcta incluso el día del cambio de hora', () => {
    const d = fechaHora('2026-10-25', '08:00');
    expect(d.getHours()).toBe(8);
    expect(aFecha(d)).toBe('2026-10-25');
  });

  test('rangoFechas incluye ambos extremos', () => {
    expect(rangoFechas('2026-09-29', '2026-10-02')).toEqual([
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
    ]);
    expect(rangoFechas('2026-10-02', '2026-10-01')).toEqual([]);
  });

  test('momentoDelDia', () => {
    expect(momentoDelDia('08:00')).toBe('manana');
    expect(momentoDelDia('13:30')).toBe('mediodia');
    expect(momentoDelDia('18:00')).toBe('tarde');
    expect(momentoDelDia('22:00')).toBe('noche');
    expect(momentoDelDia('03:00')).toBe('noche');
  });

  test('textos en español', () => {
    expect(fechaLarga('2026-09-25')).toBe('viernes, 25 de septiembre');
    expect(diaSemanaLunes('2026-09-28')).toBe(0); // lunes
    const ahora = new Date(2026, 8, 25, 12, 0);
    expect(haceCuanto(new Date(2026, 8, 25, 11, 55), ahora)).toBe('hace 5 min');
    expect(haceCuanto(new Date(2026, 8, 25, 9, 0), ahora)).toBe('hace 3 h');
    expect(haceCuanto(new Date(2026, 8, 23, 12, 0), ahora)).toBe('hace 2 días');
  });
});

describe('zonaHorariaFiable', () => {
  test('acepta zonas de un sitio concreto', () => {
    expect(zonaHorariaFiable('Europe/Madrid')).toBe(true);
    expect(zonaHorariaFiable('Atlantic/Canary')).toBe(true);
  });

  test('rechaza GMT, UTC y Etc (emuladores o móviles sin zona)', () => {
    expect(zonaHorariaFiable('GMT')).toBe(false);
    expect(zonaHorariaFiable('UTC')).toBe(false);
    expect(zonaHorariaFiable('Etc/UTC')).toBe(false);
    expect(zonaHorariaFiable('Etc/GMT-2')).toBe(false);
  });

  test('rechaza lo vacío', () => {
    expect(zonaHorariaFiable('')).toBe(false);
    expect(zonaHorariaFiable(null)).toBe(false);
    expect(zonaHorariaFiable(undefined)).toBe(false);
  });
});
