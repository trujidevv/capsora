import {
  coloresAviso,
  leerIdAviso,
  planificarAvisos,
  primerNombre,
  textosAviso,
  type EntradaAgenda,
} from '../src/logic/planificador';
import { generarCSV } from '../src/logic/csv';
import { mapaDeRegistros, type Medicamento } from '../src/logic/tipos';

const desde = new Date(2026, 8, 1).toISOString();
const agenda: EntradaAgenda[] = [
  {
    horarioId: 'h1',
    medicamentoId: 'm1',
    nombre: 'Metformina',
    dosis: '850 mg',
    hora: '08:00',
    desde,
    color: '#3A7BD5',
  },
  {
    horarioId: 'h2',
    medicamentoId: 'm2',
    nombre: 'Enalapril',
    dosis: '10 mg',
    hora: '08:00',
    desde,
  },
  {
    horarioId: 'h3',
    medicamentoId: 'm2',
    nombre: 'Enalapril',
    dosis: '10 mg',
    hora: '20:00',
    desde,
  },
];

describe('planificarAvisos', () => {
  test('agrupa por franja y ordena por nombre', () => {
    const avisos = planificarAvisos({
      agenda,
      registradas: new Set(),
      ahora: new Date(2026, 8, 25, 7, 0),
      dias: 1,
      recordatorioMin: null,
    });
    expect(avisos.map(a => a.id)).toEqual([
      'dosis|2026-09-25|08:00',
      'dosis|2026-09-25|20:00',
    ]);
    expect(avisos[0].horarioIds).toEqual(['h2', 'h1']);
    expect(avisos[0].titulo).toBe('Te tocan 2 medicamentos');
    expect(avisos[0].cuerpo).toBe(
      '08:00 · Enalapril (10 mg), Metformina (850 mg)',
    );
    expect(avisos[0].lineas).toEqual([
      'Enalapril · 10 mg',
      'Metformina · 850 mg',
    ]);
    // Enalapril no tiene color guardado (''); Metformina, azul
    expect(avisos[0].colores).toEqual(['', '#3A7BD5']);
  });

  test('no avisa de lo ya tomado y actualiza el texto de la franja', () => {
    const avisos = planificarAvisos({
      agenda,
      registradas: new Set(['h1|2026-09-25']),
      ahora: new Date(2026, 8, 25, 7, 0),
      dias: 1,
      recordatorioMin: null,
    });
    expect(avisos[0].horarioIds).toEqual(['h2']);
    expect(avisos[0].titulo).toBe('Te toca Enalapril');
  });

  test('si ya pasó la hora, solo queda el segundo aviso', () => {
    const avisos = planificarAvisos({
      agenda,
      registradas: new Set(),
      ahora: new Date(2026, 8, 25, 8, 5),
      dias: 1,
      recordatorioMin: 15,
    });
    expect(avisos.map(a => a.id)).toEqual([
      'recordatorio|2026-09-25|08:00',
      'dosis|2026-09-25|20:00',
      'recordatorio|2026-09-25|20:00',
    ]);
    expect(avisos[0].timestamp).toBe(new Date(2026, 8, 25, 8, 15).getTime());
  });

  test('ventana de varios días, sin duplicados', () => {
    const avisos = planificarAvisos({
      agenda,
      registradas: new Set(),
      ahora: new Date(2026, 8, 25, 21, 0),
      dias: 7,
      recordatorioMin: 15,
    });
    const ids = avisos.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    // Hoy ya no queda nada (son las 21:00): 6 días × 2 franjas × 2 avisos
    expect(avisos.length).toBe(24);
    expect(avisos[0].id).toBe('dosis|2026-09-26|08:00');
  });

  test('una hora añadida hoy no genera aviso para horas ya pasadas del día', () => {
    const nueva: EntradaAgenda = {
      ...agenda[0],
      desde: new Date(2026, 8, 25, 10, 0).toISOString(),
    };
    const avisos = planificarAvisos({
      agenda: [nueva],
      registradas: new Set(),
      ahora: new Date(2026, 8, 25, 7, 0),
      dias: 2,
      recordatorioMin: null,
    });
    expect(avisos.map(a => a.id)).toEqual(['dosis|2026-09-26|08:00']);
  });

  test('la firma cambia si cambia el contenido', () => {
    const base = {
      agenda,
      ahora: new Date(2026, 8, 25, 7, 0),
      dias: 1,
      recordatorioMin: null,
    };
    const a = planificarAvisos({ ...base, registradas: new Set() });
    const b = planificarAvisos({
      ...base,
      registradas: new Set(['h1|2026-09-25']),
    });
    expect(a[0].firma).not.toBe(b[0].firma);
    expect(a[1].firma).toBe(b[1].firma);
  });

  test('leerIdAviso', () => {
    expect(leerIdAviso('dosis|2026-09-25|08:00')).toEqual({
      tipo: 'dosis',
      fecha: '2026-09-25',
      hora: '08:00',
    });
    expect(leerIdAviso('prueba|123')).toBeNull();
    expect(leerIdAviso('otra|2026-09-25|08:00')).toBeNull();
  });
});

describe('generarCSV', () => {
  test('exporta con ; y escapa comillas', () => {
    const meds: Medicamento[] = [
      {
        id: 'm1',
        nombre: 'Jarabe "fuerte"; noche',
        dosis: '5 ml',
        color: null,
        creadoEn: desde,
        horarios: [
          {
            id: 'h1',
            hora: '22:00',
            activo: true,
            creadoEn: desde,
            desactivadoEn: null,
          },
        ],
      },
    ];
    const reg = mapaDeRegistros([
      {
        horarioId: 'h1',
        fecha: '2026-09-24',
        estado: 'tomado',
        confirmadoEn: new Date(2026, 8, 24, 22, 7).toISOString(),
      },
    ]);
    const csv = generarCSV(
      meds,
      reg,
      '2026-09-24',
      '2026-09-25',
      new Date(2026, 8, 25, 12, 0),
    );
    expect(csv.split('\n')).toEqual([
      'Fecha;Hora prevista;Medicamento;Dosis;Estado;Marcada a las',
      '2026-09-24;22:00;"Jarabe ""fuerte""; noche";5 ml;Tomada;22:07',
    ]);
  });
});

describe('textos del aviso', () => {
  const dos = [
    { nombre: 'Enalapril', dosis: '10 mg' },
    { nombre: 'Metformina', dosis: null },
  ];

  test('con el nombre de la persona', () => {
    expect(textosAviso('dosis', '16:50', dos, 'Carmen López').titulo).toBe(
      'Carmen, te tocan 2 medicamentos',
    );
    expect(
      textosAviso('dosis', '16:50', dos.slice(0, 1), 'Carmen').titulo,
    ).toBe('Carmen, te toca Enalapril');
    expect(textosAviso('recordatorio', '16:50', dos, 'Carmen').titulo).toBe(
      'Carmen, ¿has tomado la medicación de las 16:50?',
    );
    expect(
      textosAviso('pospuesto', '16:50', dos.slice(0, 1), 'Carmen').titulo,
    ).toBe('Carmen, recuerda: Enalapril');
  });

  test('sin nombre, la frase sola', () => {
    expect(
      textosAviso('recordatorio', '16:50', dos.slice(0, 1), '  ').titulo,
    ).toBe('¿Has tomado Enalapril?');
  });

  test('una línea por medicamento, con la dosis si la hay', () => {
    expect(textosAviso('dosis', '16:50', dos).lineas).toEqual([
      'Enalapril · 10 mg',
      'Metformina',
    ]);
  });

  test('primerNombre y coloresAviso', () => {
    expect(primerNombre(' Carmen  López ')).toBe('Carmen');
    expect(primerNombre(null)).toBe('');
    expect(
      coloresAviso([
        { color: '#3a7bd5' },
        { color: '#3A7BD5' },
        { color: null },
        { color: '#E57399' },
      ]),
    ).toEqual(['#3A7BD5', '']);
  });
});
