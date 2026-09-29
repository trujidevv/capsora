/**
 * Pruebas de humo de las pantallas: se renderizan con datos de ejemplo,
 * sin red ni módulos nativos, y se comprueban textos y acciones clave.
 */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';

// La primera vez (sin caché) Jest tarda en compilar las pantallas: 5 s no llegan
jest.setTimeout(20000);
import type { Medicamento } from '../src/logic/tipos';

const hoyTexto = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(d.getDate()).padStart(2, '0')}`;
})();

const creado = new Date(Date.now() - 20 * 86400000).toISOString();
const medicamentos: Medicamento[] = [
  {
    id: 'm1',
    nombre: 'Enalapril',
    dosis: '10 mg',
    color: '#F2C94C',
    creadoEn: creado,
    horarios: [
      {
        id: 'h1',
        hora: '00:01',
        activo: true,
        creadoEn: creado,
        desactivadoEn: null,
      },
      {
        id: 'h2',
        hora: '23:58',
        activo: true,
        creadoEn: creado,
        desactivadoEn: null,
      },
    ],
  },
  {
    id: 'm2',
    nombre: 'Metformina',
    dosis: '850 mg',
    color: null,
    creadoEn: creado,
    horarios: [
      {
        id: 'h3',
        hora: '00:01',
        activo: true,
        creadoEn: creado,
        desactivadoEn: null,
      },
    ],
  },
];

const mockMarcar = jest.fn(async () => 'guardado' as const);
const mockDeshacer = jest.fn(async () => undefined);
let mockDatos: Record<string, unknown>;

jest.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(async () => ({
        error: { message: 'Invalid login credentials' },
      })),
      signUp: jest.fn(async () => ({ data: { session: {} }, error: null })),
      getSession: jest.fn(async () => ({ data: { session: null } })),
      updateUser: jest.fn(async () => ({ data: {}, error: null })),
      resend: jest.fn(async () => ({ data: {}, error: null })),
    },
    from: jest.fn(() => ({ upsert: jest.fn(async () => ({ error: null })) })),
  },
}));
jest.mock('../src/lib/AuthContext', () => ({
  useAuth: () => ({
    session: { user: { id: 'u1', email: 'ana@correo.com' } },
    usuario: { id: 'u1', email: 'ana@correo.com' },
    loading: false,
  }),
  useUsuarioId: () => 'u1',
}));
jest.mock('../src/data/familia', () => ({
  ...jest.requireActual('../src/data/familia'),
  obtenerNombreMiCuidador: jest.fn(async () => 'Luis'),
}));
jest.mock('../src/lib/DatosContext', () => ({
  DIAS_HISTORIAL: 35,
  useDatos: () => mockDatos,
}));
jest.mock('../src/lib/FiabilidadContext', () => ({
  useFiabilidad: () => ({
    estado: {
      permisoNotificaciones: false,
      alarmasExactas: false,
      bateriaOptimizada: true,
      fabricante: 'xiaomi',
      tieneAjustesFabricante: true,
    },
    comprobar: jest.fn(async () => null),
  }),
}));
jest.mock('@react-navigation/native', () => {
  const R = require('react');
  return { useFocusEffect: (cb: () => void) => R.useEffect(cb, [cb]) };
});

function navegacion() {
  return {
    navigate: jest.fn(),
    setOptions: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
  } as any;
}

function textos(arbol: ReactTestRenderer.ReactTestRenderer): string {
  return arbol.root
    .findAllByType(Text)
    .map(t => {
      const c = t.props.children;
      return Array.isArray(c) ? c.join('') : String(c ?? '');
    })
    .join(' | ');
}

const montados: ReactTestRenderer.ReactTestRenderer[] = [];

async function renderizar(elemento: React.ReactElement) {
  let arbol!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    arbol = ReactTestRenderer.create(elemento);
  });
  montados.push(arbol);
  return arbol;
}

afterEach(async () => {
  await act(async () => {
    montados.splice(0).forEach(a => a.unmount());
  });
});

beforeEach(() => {
  mockMarcar.mockClear();
  mockDatos = {
    medicamentos,
    registros: new Map([
      [
        'h1|' + hoyTexto,
        {
          horarioId: 'h1',
          fecha: hoyTexto,
          estado: 'tomado',
          confirmadoEn: new Date().toISOString(),
        },
      ],
    ]),
    nombre: 'Ana',
    cargando: false,
    sinConexion: false,
    error: null,
    recargar: jest.fn(async () => undefined),
    marcar: mockMarcar,
    deshacer: mockDeshacer,
    cambiarNombre: jest.fn(async () => undefined),
  };
});

/** Solo se fija la fecha (a las 12:00 de hoy); los temporizadores siguen siendo reales. */
function fijarHora(h: number, m: number) {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  jest.useFakeTimers({
    now: d,
    doNotFake: [
      'setTimeout',
      'clearTimeout',
      'setInterval',
      'clearInterval',
      'setImmediate',
      'clearImmediate',
      'nextTick',
      'queueMicrotask',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'requestIdleCallback',
      'cancelIdleCallback',
      'hrtime',
      'performance',
    ],
  });
}

describe('Hoy', () => {
  beforeEach(() => fijarHora(12, 0));
  afterEach(() => jest.useRealTimers());

  test('saludo, pregunta por lo olvidado, línea del día y familiar', async () => {
    const HoyScreen = require('../src/screens/HoyScreen').default;
    const arbol = await renderizar(
      <HoyScreen navigation={navegacion()} route={{} as any} />,
    );
    const t = textos(arbol);
    expect(t).toContain('Buenos días, Ana');
    expect(t).toContain('1 toma sin marcar');
    expect(t).toContain('Tus avisos no van a sonar');
    // 00:01: Enalapril tomada y Metformina sin marcar; 23:58, la siguiente
    expect(t).toContain('¿Te has tomado la de las 00:01?');
    expect(t).toContain('Tu día');
    expect(t).toContain('Ahora · 12:00');
    expect(t).toContain('Pendiente');
    expect(t).toContain('Luis');

    const circulo = arbol.root.findByProps({
      accessibilityLabel: 'Marcar Metformina como tomada',
    });
    await act(async () => {
      circulo.props.onPress();
    });
    expect(mockMarcar).toHaveBeenCalledWith(
      [{ horarioId: 'h3', fecha: hoyTexto }],
      'tomado',
    );

    const no = arbol.root.findByProps({
      accessibilityLabel: 'No me la he tomado',
    });
    await act(async () => {
      no.props.onPress();
    });
    expect(mockMarcar).toHaveBeenLastCalledWith(
      [{ horarioId: 'h3', fecha: hoyTexto }],
      'omitido',
    );
  });

  test('una hora de la línea se abre para marcar sus pastillas', async () => {
    const HoyScreen = require('../src/screens/HoyScreen').default;
    const arbol = await renderizar(
      <HoyScreen navigation={navegacion()} route={{} as any} />,
    );
    const fila = arbol.root.findByProps({
      accessibilityLabel: '23:58, Enalapril, Pendiente',
    });
    await act(async () => {
      fila.props.onPress();
    });
    const tomar = arbol.root.findByProps({
      accessibilityLabel: 'Marcar Enalapril como tomada',
    });
    await act(async () => {
      tomar.props.onPress();
    });
    expect(mockMarcar).toHaveBeenCalledWith(
      [{ horarioId: 'h2', fecha: hoyTexto }],
      'tomado',
    );
  });

  test('con todo tomado, calma y lo de mañana', async () => {
    const registro = (horarioId: string) =>
      [
        `${horarioId}|${hoyTexto}`,
        {
          horarioId,
          fecha: hoyTexto,
          estado: 'tomado',
          confirmadoEn: new Date().toISOString(),
        },
      ] as const;
    mockDatos = {
      ...mockDatos,
      registros: new Map([registro('h1'), registro('h2'), registro('h3')]),
    };
    const HoyScreen = require('../src/screens/HoyScreen').default;
    const t = textos(
      await renderizar(
        <HoyScreen navigation={navegacion()} route={{} as any} />,
      ),
    );
    expect(t).toContain('Todo tomado por hoy');
    expect(t).toContain('mañana a las 00:01');
    expect(t).not.toContain('¡');
  });
});

test('Hoy vacío invita a añadir el primer medicamento', async () => {
  mockDatos = { ...mockDatos, medicamentos: [], registros: new Map() };
  const HoyScreen = require('../src/screens/HoyScreen').default;
  const nav = navegacion();
  const arbol = await renderizar(
    <HoyScreen navigation={nav} route={{} as any} />,
  );
  expect(textos(arbol)).toContain('Aún no tienes medicamentos');
});

test('Medicamentos lista nombres y horas', async () => {
  const Pantalla = require('../src/screens/MedicamentosScreen').default;
  const t = textos(
    await renderizar(<Pantalla navigation={navegacion()} route={{} as any} />),
  );
  expect(t).toContain('Enalapril');
  expect(t).toContain('00:01');
  expect(t).toContain('23:58');
});

test('Historial muestra porcentajes y el día de hoy', async () => {
  const Pantalla = require('../src/screens/HistorialScreen').default;
  const t = textos(
    await renderizar(<Pantalla navigation={navegacion()} route={{} as any} />),
  );
  expect(t).toContain('Tomas hechas');
  expect(t).toContain('últimos 7 días');
  expect(t).toContain('Hoy');
});

test('Formulario: valida nombre y horas antes de guardar', async () => {
  const Pantalla =
    require('../src/screens/FormularioMedicamentoScreen').default;
  const nav = navegacion();
  const arbol = await renderizar(
    <Pantalla navigation={nav} route={{ params: undefined } as any} />,
  );
  const guardar = arbol.root.findByProps({ accessibilityLabel: 'Guardar' });
  await act(async () => {
    guardar.props.onPress();
  });
  const t = textos(arbol);
  expect(t).toContain('Escribe el nombre del medicamento.');
  expect(t).toContain('Añade al menos una hora');
  expect(nav.goBack).not.toHaveBeenCalled();
});

test('Formulario de edición carga los datos del medicamento', async () => {
  const Pantalla =
    require('../src/screens/FormularioMedicamentoScreen').default;
  const nav = navegacion();
  const arbol = await renderizar(
    <Pantalla
      navigation={nav}
      route={{ params: { medicamento: medicamentos[0] } } as any}
    />,
  );
  const t = textos(arbol);
  expect(t).toContain('00:01');
  expect(t).toContain('Eliminar medicamento');
  expect(nav.setOptions).toHaveBeenCalledWith({ title: 'Editar medicamento' });
});

test('Fiabilidad muestra los pasos pendientes y los de Xiaomi', async () => {
  const Pantalla = require('../src/screens/FiabilidadScreen').default;
  const t = textos(
    await renderizar(
      <Pantalla
        navigation={navegacion()}
        route={{ params: { desdeBienvenida: true } } as any}
      />,
    ),
  );
  expect(t).toContain('Permitir notificaciones');
  expect(t).toContain('Avisos a la hora exacta');
  expect(t).toContain('Xiaomi');
  expect(t).toContain('Inicio automático');
});

test('Ajustes muestra perfil, exportación y aviso legal', async () => {
  const Pantalla = require('../src/screens/AjustesScreen').default;
  const t = textos(
    await renderizar(<Pantalla navigation={navegacion()} route={{} as any} />),
  );
  expect(t).toContain('ana@correo.com');
  expect(t).toContain('Exportar historial (CSV)');
  expect(t).toContain('No es un producto sanitario');
});

test('Login traduce los errores de Supabase', async () => {
  const Pantalla = require('../src/screens/LoginScreen').default;
  const arbol = await renderizar(
    <Pantalla navigation={navegacion()} route={{} as any} />,
  );
  const campos = arbol.root.findAll(
    n =>
      n.props.accessibilityLabel === 'Correo electrónico' &&
      n.props.onChangeText,
  );
  const pass = arbol.root.findAll(
    n => n.props.accessibilityLabel === 'Contraseña' && n.props.onChangeText,
  );
  await act(async () => {
    campos[0].props.onChangeText('ana@correo.com');
    pass[0].props.onChangeText('malamala');
  });
  await act(async () => {
    arbol.root.findByProps({ accessibilityLabel: 'Entrar' }).props.onPress();
  });
  expect(textos(arbol)).toContain(
    'El correo o la contraseña no son correctos.',
  );
});

test('Ajustes enlaza la privacidad y permite borrar la cuenta', async () => {
  const Pantalla = require('../src/screens/AjustesScreen').default;
  const t = textos(
    await renderizar(<Pantalla navigation={navegacion()} route={{} as any} />),
  );
  expect(t).toContain('Política de privacidad');
  expect(t).toContain('Borrar mi cuenta');
  // Selector de tema (Ajustes → Aspecto)
  expect(t).toContain('Colores de la app');
  expect(t).toContain('Automático');
  expect(t).toContain('Oscuro');
});

test('Registro: sin aceptar la privacidad no se crea la cuenta', async () => {
  const { supabase } = require('../src/lib/supabase');
  supabase.auth.signUp.mockClear();
  const Pantalla = require('../src/screens/RegistroScreen').default;
  const arbol = await renderizar(
    <Pantalla navigation={navegacion()} route={{} as any} />,
  );
  const campo = (etiqueta: string) =>
    arbol.root.findAll(
      n => n.props.accessibilityLabel === etiqueta && n.props.onChangeText,
    )[0];
  await act(async () => {
    campo('Tu nombre').props.onChangeText('Carmen');
    campo('Correo electrónico').props.onChangeText('carmen@correo.com');
    campo('Contraseña').props.onChangeText('secreta1');
  });
  const crear = () =>
    arbol.root.findByProps({ accessibilityLabel: 'Crear mi cuenta' });

  await act(async () => crear().props.onPress());
  expect(supabase.auth.signUp).not.toHaveBeenCalled();
  expect(textos(arbol)).toContain(
    'tienes que aceptar la política de privacidad',
  );

  // Se marca la casilla y ya se crea, guardando el consentimiento
  await act(async () =>
    arbol.root.findByProps({ accessibilityRole: 'checkbox' }).props.onPress(),
  );
  await act(async () => crear().props.onPress());
  expect(supabase.auth.signUp).toHaveBeenCalledTimes(1);
  const datos = supabase.auth.signUp.mock.calls[0][0].options.data;
  expect(datos.nombre).toBe('Carmen');
  expect(datos.privacidad_version).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(typeof datos.privacidad_aceptada_en).toBe('string');
});

test('Primera vez con Google: pide el consentimiento antes de entrar', async () => {
  const { supabase } = require('../src/lib/supabase');
  supabase.auth.updateUser.mockClear();
  const Pantalla = require('../src/screens/ConsentimientoScreen').default;
  const arbol = await renderizar(
    <Pantalla usuarioId="u1" nombreSugerido="Carmen" />,
  );
  const empezar = () =>
    arbol.root.findByProps({ accessibilityLabel: 'Empezar' });

  // El nombre de Google ya viene puesto, pero sin aceptar no se guarda nada
  await act(async () => empezar().props.onPress());
  expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  expect(textos(arbol)).toContain(
    'tienes que aceptar la política de privacidad',
  );

  await act(async () =>
    arbol.root.findByProps({ accessibilityRole: 'checkbox' }).props.onPress(),
  );
  await act(async () => empezar().props.onPress());
  expect(supabase.auth.updateUser).toHaveBeenCalledTimes(1);
  const datos = supabase.auth.updateUser.mock.calls[0][0].data;
  expect(datos.nombre).toBe('Carmen');
  expect(datos.privacidad_version).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(typeof datos.privacidad_aceptada_en).toBe('string');
});

test('Login: si falta confirmar el correo, deja reenviarlo', async () => {
  const { supabase } = require('../src/lib/supabase');
  supabase.auth.signInWithPassword.mockResolvedValueOnce({
    error: { message: 'Email not confirmed', code: 'email_not_confirmed' },
  });
  supabase.auth.resend.mockClear();
  const Pantalla = require('../src/screens/LoginScreen').default;
  // Viene de crear la cuenta: el correo ya está escrito
  const arbol = await renderizar(
    <Pantalla
      navigation={navegacion()}
      route={{ params: { email: 'nuevo@correo.com' } } as any}
    />,
  );
  const reenviar = () =>
    arbol.root.findAll(
      n => n.props.accessibilityLabel === 'Reenviar correo de confirmación',
    );
  expect(reenviar()).toHaveLength(0);

  const pass = arbol.root.findAll(
    n => n.props.accessibilityLabel === 'Contraseña' && n.props.onChangeText,
  );
  await act(async () => pass[0].props.onChangeText('secreta1'));
  await act(async () =>
    arbol.root.findByProps({ accessibilityLabel: 'Entrar' }).props.onPress(),
  );
  expect(textos(arbol)).toContain('Tienes que confirmar tu correo');

  await act(async () => reenviar()[0].props.onPress());
  expect(supabase.auth.resend).toHaveBeenCalledWith({
    type: 'signup',
    email: 'nuevo@correo.com',
  });
  expect(reenviar()).toHaveLength(0);
});
