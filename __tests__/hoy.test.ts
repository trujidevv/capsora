import { dosisDelDia } from '../src/logic/dosis';
import {
  estadoGrupo,
  fraseDelDia,
  saludoSegunHora,
  tarjetaDeHoy,
  textoTomarTodas,
  tiempoHasta,
} from '../src/logic/hoy';
import {
  mapaDeRegistros,
  type Medicamento,
  type RegistroToma,
} from '../src/logic/tipos';

const creado = new Date(2026, 8, 1, 0, 0).toISOString();
const FECHA = '2026-09-26';

function med(id: string, nombre: string, horas: string[]): Medicamento {
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
  };
}

// El día de Carmen: dos a las 16:50 y dos a las 21:00
const meds = [
  med('e', 'Enalapril', ['16:50']),
  med('m', 'Metformina', ['16:50', '21:00']),
  med('s', 'Simvastatina', ['21:00']),
];

const tomada = (
  horarioId: string,
  estado: 'tomado' | 'omitido' = 'tomado',
): RegistroToma => ({
  horarioId,
  fecha: FECHA,
  estado,
  confirmadoEn: `${FECHA}T16:51:00`,
});

const a = (h: number, m: number) => new Date(2026, 8, 26, h, m);

function dia(ahora: Date, registros: RegistroToma[] = []) {
  return dosisDelDia(meds, mapaDeRegistros(registros), FECHA, ahora);
}

const TARDE_HECHA = [tomada('e-h0'), tomada('m-h0')];

describe('tarjetaDeHoy', () => {
  test('sin tomas', () => {
    expect(tarjetaDeHoy([], a(10, 0))).toEqual({ tipo: 'sinTomas' });
  });

  test('antes de la hora enseña la próxima', () => {
    const t = tarjetaDeHoy(dia(a(19, 40), TARDE_HECHA), a(19, 40));
    expect(t.tipo).toBe('proxima');
    expect(t.tipo === 'proxima' && t.grupo.hora).toBe('21:00');
  });

  test('en la media hora siguiente «es la hora»', () => {
    const t = tarjetaDeHoy(dia(a(21, 10), TARDE_HECHA), a(21, 10));
    expect(t.tipo).toBe('esLaHora');
  });

  test('pasada la media hora pregunta por la toma sin marcar', () => {
    const t = tarjetaDeHoy(dia(a(22, 15), TARDE_HECHA), a(22, 15));
    expect(t.tipo).toBe('sinMarcar');
    expect(t.tipo === 'sinMarcar' && t.grupo.hora).toBe('21:00');
  });

  test('una toma olvidada manda sobre la siguiente', () => {
    const t = tarjetaDeHoy(dia(a(19, 40)), a(19, 40));
    expect(t.tipo === 'sinMarcar' && t.grupo.hora).toBe('16:50');
  });

  test('con todo marcado, también lo no tomado, se ha terminado', () => {
    const todo = [...TARDE_HECHA, tomada('m-h1'), tomada('s-h0', 'omitido')];
    expect(tarjetaDeHoy(dia(a(22, 30), todo), a(22, 30))).toEqual({
      tipo: 'terminado',
    });
  });
});

test('tiempoHasta', () => {
  expect(tiempoHasta(a(21, 0), a(19, 40))).toBe('en 1 h 20 min');
  expect(tiempoHasta(a(21, 0), a(20, 0))).toBe('en 1 h');
  expect(tiempoHasta(a(21, 0), a(20, 55))).toBe('en 5 min');
  expect(
    tiempoHasta(
      new Date(2026, 8, 26, 21, 0, 0),
      new Date(2026, 8, 26, 20, 59, 30),
    ),
  ).toBe('en 1 min');
});

test('saludoSegunHora', () => {
  expect(saludoSegunHora(a(9, 0))).toBe('Buenos días');
  expect(saludoSegunHora(a(13, 59))).toBe('Buenos días');
  expect(saludoSegunHora(a(14, 0))).toBe('Buenas tardes');
  expect(saludoSegunHora(a(21, 0))).toBe('Buenas noches');
  expect(saludoSegunHora(a(3, 0))).toBe('Buenas noches');
});

describe('fraseDelDia', () => {
  const frase = (ahora: Date, registros: RegistroToma[] = []) => {
    const d = dia(ahora, registros);
    return fraseDelDia(d, ahora)
      ?.map(t => t.texto)
      .join('');
  };

  test('lo que queda, todo en el mismo momento del día', () => {
    expect(frase(a(19, 40), TARDE_HECHA)).toBe(
      'Vas al día. Te quedan 2 para esta noche.',
    );
  });

  test('lo que queda repartido en varios momentos', () => {
    expect(frase(a(9, 0))).toBe('Vas al día. Te quedan 4 tomas hoy.');
  });

  test('una sola', () => {
    expect(frase(a(22, 0), [...TARDE_HECHA, tomada('m-h1')])).toBe(
      'Tienes 1 toma sin marcar.',
    );
    // En la media hora de margen aún no se da por olvidada
    expect(frase(a(21, 5), [...TARDE_HECHA, tomada('m-h1')])).toBe(
      'Vas al día. Te queda 1 para esta noche.',
    );
    expect(frase(a(20, 0), [...TARDE_HECHA, tomada('m-h1')])).toBe(
      'Vas al día. Te queda 1 para esta noche.',
    );
  });

  test('sin marcar', () => {
    expect(frase(a(19, 40))).toBe('Tienes 2 tomas sin marcar.');
  });

  test('sin nada pendiente no hay frase', () => {
    const todo = [...TARDE_HECHA, tomada('m-h1'), tomada('s-h0')];
    expect(frase(a(22, 30), todo)).toBeUndefined();
  });
});

describe('estadoGrupo', () => {
  const estado = (ahora: Date, registros: RegistroToma[], hora: string) =>
    estadoGrupo(
      { hora, dosis: dia(ahora, registros).filter(d => d.hora === hora) },
      ahora,
    );

  test('hecho, a medias, pendiente y sin marcar', () => {
    expect(estado(a(19, 40), TARDE_HECHA, '16:50')).toEqual({
      nodo: 'hecho',
      texto: 'Tomadas',
    });
    expect(estado(a(19, 40), TARDE_HECHA, '21:00')).toEqual({
      nodo: 'pendiente',
      texto: 'Pendiente',
    });
    expect(estado(a(20, 0), [tomada('m-h1')], '21:00')).toEqual({
      nodo: 'pendiente',
      texto: '1 de 2 hechas',
    });
    expect(estado(a(19, 40), [], '16:50')).toEqual({
      nodo: 'aviso',
      texto: 'Sin marcar',
    });
    expect(estado(a(21, 10), [], '21:00')).toEqual({
      nodo: 'pendiente',
      texto: 'Es la hora',
    });
  });

  test('marcadas como no tomadas', () => {
    const r = [tomada('e-h0', 'omitido'), tomada('m-h0', 'omitido')];
    expect(estado(a(19, 40), r, '16:50').texto).toBe('No tomadas');
    const mezcla = [tomada('e-h0'), tomada('m-h0', 'omitido')];
    expect(estado(a(19, 40), mezcla, '16:50').texto).toBe('1 de 2 tomadas');
  });
});

test('textoTomarTodas', () => {
  const d = dia(a(19, 40));
  expect(textoTomarTodas(d.slice(0, 1))).toBe('Tomar Enalapril');
  expect(textoTomarTodas(d.slice(0, 2))).toBe('Tomar las dos');
  expect(textoTomarTodas(d)).toBe('Tomar las 4');
});
