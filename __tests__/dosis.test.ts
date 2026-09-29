import {
  estadoDiaParaCuidador,
  adherencia,
  agruparPorHora,
  dosisDelDia,
  estadoParaCuidador,
  resumir,
  semaforo,
} from '../src/logic/dosis';
import { mapaDeRegistros, type Medicamento } from '../src/logic/tipos';

const creado = new Date(2026, 8, 1, 0, 0).toISOString();

function med(
  id: string,
  nombre: string,
  horas: string[],
  extra: Partial<Medicamento> = {},
): Medicamento {
  return {
    id,
    nombre,
    dosis: '10 mg',
    color: null,
    creadoEn: creado,
    horarios: horas.map((hora, i) => ({
      id: `${id}-h${i}`,
      hora,
      activo: true,
      creadoEn: creado,
      desactivadoEn: null,
    })),
    ...extra,
  };
}

const meds = [
  med('a', 'Enalapril', ['08:00', '20:00']),
  med('b', 'Metformina', ['08:00']),
];

describe('dosisDelDia', () => {
  test('estados según la hora actual', () => {
    const ahora = new Date(2026, 8, 25, 9, 0);
    const registros = mapaDeRegistros([
      {
        horarioId: 'a-h0',
        fecha: '2026-09-25',
        estado: 'tomado',
        confirmadoEn: null,
      },
    ]);
    const lista = dosisDelDia(meds, registros, '2026-09-25', ahora);
    expect(lista.map(d => [d.nombre, d.hora, d.estado])).toEqual([
      ['Enalapril', '08:00', 'tomada'],
      ['Metformina', '08:00', 'atrasada'],
      ['Enalapril', '20:00', 'pendiente'],
    ]);
  });

  test('a las dos horas sin marcar pasa a perdida', () => {
    const ahora = new Date(2026, 8, 25, 10, 1);
    const lista = dosisDelDia(meds, new Map(), '2026-09-25', ahora);
    expect(lista[0].estado).toBe('perdida');
  });

  test('una hora añadida hoy a las 10:00 no cuenta la toma de las 08:00', () => {
    const nuevo = med('c', 'Omeprazol', ['08:00', '21:00'], {});
    nuevo.horarios.forEach(
      h => (h.creadoEn = new Date(2026, 8, 25, 10, 0).toISOString()),
    );
    const lista = dosisDelDia(
      [nuevo],
      new Map(),
      '2026-09-25',
      new Date(2026, 8, 25, 11, 0),
    );
    expect(lista.map(d => d.hora)).toEqual(['21:00']);
  });

  test('una hora desactivada deja de contar, salvo si tenía registro', () => {
    const m = med('d', 'Sintrom', ['09:00']);
    m.horarios[0].activo = false;
    m.horarios[0].desactivadoEn = new Date(2026, 8, 20, 12, 0).toISOString();
    expect(
      dosisDelDia([m], new Map(), '2026-09-19', new Date(2026, 8, 25)).length,
    ).toBe(1);
    expect(
      dosisDelDia([m], new Map(), '2026-09-21', new Date(2026, 8, 25)).length,
    ).toBe(0);
    const reg = mapaDeRegistros([
      {
        horarioId: 'd-h0',
        fecha: '2026-09-21',
        estado: 'tomado',
        confirmadoEn: null,
      },
    ]);
    expect(
      dosisDelDia([m], reg, '2026-09-21', new Date(2026, 8, 25)).length,
    ).toBe(1);
  });
});

describe('semáforo y cuidador', () => {
  const ahora = new Date(2026, 8, 25, 12, 0);
  const latidoBueno = {
    recibidoEn: new Date(2026, 8, 25, 11, 0).toISOString(),
    notificacionesOk: true,
  };
  const latidoViejo = {
    recibidoEn: new Date(2026, 8, 23, 11, 0).toISOString(),
    notificacionesOk: true,
  };

  test('verde si todo lo vencido está tomado', () => {
    const reg = mapaDeRegistros([
      {
        horarioId: 'a-h0',
        fecha: '2026-09-25',
        estado: 'tomado',
        confirmadoEn: null,
      },
      {
        horarioId: 'b-h0',
        fecha: '2026-09-25',
        estado: 'tomado',
        confirmadoEn: null,
      },
    ]);
    const r = resumir(dosisDelDia(meds, reg, '2026-09-25', ahora));
    expect(semaforo(r)).toBe('verde');
    expect(estadoParaCuidador(r, null, ahora)).toBe('verde');
  });

  test('rojo si hay perdidas con el móvil activo; desconocido si el móvil no da señales', () => {
    const r = resumir(dosisDelDia(meds, new Map(), '2026-09-25', ahora));
    expect(semaforo(r)).toBe('rojo');
    expect(estadoParaCuidador(r, latidoBueno, ahora)).toBe('rojo');
    expect(estadoParaCuidador(r, latidoViejo, ahora)).toBe('desconocido');
    expect(
      estadoParaCuidador(r, { ...latidoBueno, notificacionesOk: false }, ahora),
    ).toBe('desconocido');
  });

  test('neutro sin tomas', () => {
    expect(semaforo(resumir([]))).toBe('neutro');
  });

  test('adherencia ignora las tomas futuras', () => {
    const reg = mapaDeRegistros([
      {
        horarioId: 'a-h0',
        fecha: '2026-09-25',
        estado: 'tomado',
        confirmadoEn: null,
      },
    ]);
    const r = resumir(dosisDelDia(meds, reg, '2026-09-25', ahora));
    expect(adherencia([r])).toBe(50); // 1 de 2 vencidas (la de las 20:00 no cuenta)
    expect(adherencia([resumir([])])).toBeNull();
  });

  test('agruparPorHora', () => {
    const grupos = agruparPorHora(
      dosisDelDia(meds, new Map(), '2026-09-25', ahora),
    );
    expect(grupos.map(g => [g.hora, g.dosis.length])).toEqual([
      ['08:00', 2],
      ['20:00', 1],
    ]);
  });
});

test('cuidador: un día pasado sin ninguna marca es "sin datos", no rojo', () => {
  const pasado = new Date(2026, 8, 26, 12, 0);
  const sinMarcas = resumir(dosisDelDia(meds, new Map(), '2026-09-24', pasado));
  expect(estadoDiaParaCuidador(sinMarcas)).toBe('desconocido');
  const conUna = resumir(
    dosisDelDia(
      meds,
      mapaDeRegistros([
        {
          horarioId: 'a-h0',
          fecha: '2026-09-24',
          estado: 'tomado',
          confirmadoEn: null,
        },
      ]),
      '2026-09-24',
      pasado,
    ),
  );
  expect(estadoDiaParaCuidador(conUna)).toBe('rojo');
});
