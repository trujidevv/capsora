import React, { useLayoutEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Capsula from '../components/Capsula';
import Icono from '../components/Icono';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import Boton from '../components/Boton';
import CampoTexto from '../components/CampoTexto';
import Pantalla from '../components/Pantalla';
import { MensajeError, TituloSeccion } from '../components/Varios';
import {
  actualizarMedicamento,
  crearMedicamento,
  eliminarMedicamento,
} from '../data/medicamentos';
import { useUsuarioId } from '../lib/AuthContext';
import { avisoBreve, confirmar, mostrarError } from '../lib/avisar';
import { useDatos } from '../lib/DatosContext';
import {
  compararHoras,
  horaDe,
  hoy,
  normalizarHora,
  type Hora,
} from '../logic/fechas';
import { claveRegistro } from '../logic/tipos';
import type { PantallaApp } from '../navigation/tipos';
import {
  DEFAULT_PILL_COLOR,
  minTouchTarget,
  pillColors,
  radii,
  spacing,
  FUENTE,
} from '../theme/theme';
import { crearEstilos, useTema } from '../lib/TemaContext';

/** Horas típicas para añadir con un toque (desayuno, comida, cena, al acostarse). */
const HORAS_HABITUALES: { hora: Hora; etiqueta: string }[] = [
  { hora: '08:00', etiqueta: 'Desayuno' },
  { hora: '14:00', etiqueta: 'Comida' },
  { hora: '21:00', etiqueta: 'Cena' },
  { hora: '23:00', etiqueta: 'Al acostarse' },
];

function aDate(hora: Hora): Date {
  const [h, m] = hora.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

export default function FormularioMedicamentoScreen({
  navigation,
  route,
}: PantallaApp<'FormularioMedicamento'>) {
  const { colores, tipografia } = useTema();
  const styles = useEstilos();
  const original = route.params?.medicamento;
  const usuarioId = useUsuarioId();
  const { recargar, registros } = useDatos();

  const [nombre, setNombre] = useState(original?.nombre ?? '');
  const [dosis, setDosis] = useState(original?.dosis ?? '');
  const [color, setColor] = useState<string>(
    original?.color ?? DEFAULT_PILL_COLOR,
  );
  const [horas, setHoras] = useState<Hora[]>(
    original
      ? original.horarios
          .filter(h => h.activo)
          .map(h => h.hora)
          .sort(compararHoras)
      : [],
  );
  const [guardando, setGuardando] = useState(false);
  const [errorNombre, setErrorNombre] = useState<string | null>(null);
  const [errorHoras, setErrorHoras] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: original ? 'Editar medicamento' : 'Nuevo medicamento',
    });
  }, [navigation, original]);

  function ponerHora(nueva: Hora, sustituir?: Hora) {
    const hora = normalizarHora(nueva);
    setHoras(actuales => {
      const sin = actuales.filter(h => h !== sustituir && h !== hora);
      return [...sin, hora].sort(compararHoras);
    });
    setErrorHoras(null);
  }

  function elegirHora(inicial?: Hora) {
    DateTimePickerAndroid.open({
      value: aDate(inicial ?? '09:00'),
      mode: 'time',
      is24Hour: true,
      onChange: (evento, fecha) => {
        if (evento.type === 'set' && fecha) ponerHora(horaDe(fecha), inicial);
      },
    });
  }

  async function guardar() {
    let valido = true;
    if (!nombre.trim()) {
      setErrorNombre('Escribe el nombre del medicamento.');
      valido = false;
    }
    if (horas.length === 0) {
      setErrorHoras('Añade al menos una hora para recibir el aviso.');
      valido = false;
    }
    if (!valido) return;

    setGuardando(true);
    try {
      const datos = { nombre, dosis, color, horas };
      if (original) {
        const fechaHoy = hoy();
        const marcadosHoy = original.horarios
          .filter(h => registros.has(claveRegistro(h.id, fechaHoy)))
          .map(h => h.id);
        await actualizarMedicamento(original, datos, marcadosHoy);
      } else {
        await crearMedicamento(usuarioId, datos);
      }
      await recargar();
      avisoBreve(
        original
          ? 'Cambios guardados'
          : `${nombre.trim()} añadido. Te avisaremos a su hora.`,
      );
      navigation.goBack();
    } catch (e) {
      mostrarError(e, 'No se ha podido guardar');
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar() {
    if (!original) return;
    const ok = await confirmar(
      `¿Eliminar ${original.nombre}?`,
      'Se borrará también su historial de tomas y dejarás de recibir sus avisos. No se puede deshacer.',
      'Eliminar',
      true,
    );
    if (!ok) return;
    setGuardando(true);
    try {
      await eliminarMedicamento(original.id);
      await recargar();
      avisoBreve(`${original.nombre} eliminado`);
      navigation.goBack();
    } catch (e) {
      mostrarError(e, 'No se ha podido eliminar');
      setGuardando(false);
    }
  }

  const habitualesDisponibles = HORAS_HABITUALES.filter(
    h => !horas.includes(h.hora),
  );

  return (
    <Pantalla
      pie={
        <Boton
          titulo={original ? 'Guardar cambios' : 'Guardar'}
          onPress={guardar}
          cargando={guardando}
        />
      }
    >
      <CampoTexto
        etiqueta="Nombre del medicamento"
        placeholder="Ej. Enalapril"
        autoCapitalize="sentences"
        value={nombre}
        onChangeText={t => {
          setNombre(t);
          setErrorNombre(null);
        }}
        error={errorNombre}
      />
      <CampoTexto
        etiqueta="Dosis (opcional)"
        placeholder="Ej. 10 mg, 1 pastilla, media pastilla…"
        value={dosis}
        onChangeText={setDosis}
        ayuda="Escríbela como te la indicó tu médico. La app no la comprueba."
      />

      <TituloSeccion texto="Color de la pastilla" />
      <View style={styles.colores} accessibilityRole="radiogroup">
        {pillColors.map(c => {
          const activo = c.valor === color;
          return (
            <Pressable
              key={c.id}
              onPress={() => setColor(c.valor)}
              accessibilityRole="radio"
              accessibilityLabel={c.nombre}
              accessibilityState={{ checked: activo }}
              style={({ pressed }) => [
                styles.color,
                activo && styles.colorActivo,
                pressed && !activo && styles.pulsado,
              ]}
            >
              <Capsula color={c.valor} tamano={36} />
              <Text style={tipografia.caption}>{c.nombre}</Text>
            </Pressable>
          );
        })}
      </View>

      <TituloSeccion texto="¿A qué horas se toma?" />
      {horas.length > 0 ? (
        <View style={styles.horas}>
          {horas.map(h => (
            <View key={h} style={styles.hora}>
              <Pressable
                onPress={() => elegirHora(h)}
                accessibilityRole="button"
                accessibilityLabel={`Cambiar la hora ${h}`}
                style={styles.horaTexto}
              >
                <Icono nombre="clock" tamano={20} color={colores.primaryDark} />
                <Text style={styles.textoHora}>{h}</Text>
              </Pressable>
              <Pressable
                onPress={() => setHoras(hs => hs.filter(x => x !== h))}
                accessibilityRole="button"
                accessibilityLabel={`Quitar la hora ${h}`}
                style={styles.quitar}
              >
                <Icono nombre="x" tamano={20} color={colores.primaryDark} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
      {errorHoras ? <MensajeError texto={errorHoras} /> : null}

      <Boton
        variante="secundario"
        titulo="Añadir una hora"
        icono="plus"
        onPress={() => elegirHora()}
      />
      {habitualesDisponibles.length > 0 ? (
        <>
          <Text style={tipografia.bodySecondary}>
            O añade una hora habitual:
          </Text>
          <View style={styles.habituales}>
            {habitualesDisponibles.map(h => (
              <Pressable
                key={h.hora}
                onPress={() => ponerHora(h.hora)}
                accessibilityRole="button"
                accessibilityLabel={`Añadir ${h.etiqueta}, ${h.hora}`}
                style={({ pressed }) => [
                  styles.habitual,
                  pressed && styles.pulsado,
                ]}
              >
                <Text style={tipografia.bodyStrong}>{h.hora}</Text>
                <Text style={tipografia.caption}>{h.etiqueta}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      {original ? (
        <Boton
          variante="peligro"
          titulo="Eliminar medicamento"
          onPress={eliminar}
          style={styles.eliminar}
        />
      ) : null}
    </Pantalla>
  );
}

const useEstilos = crearEstilos(colores => ({
  colores: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  color: {
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 70,
    minHeight: minTouchTarget + 20,
  },
  colorActivo: {
    borderColor: colores.primary,
    backgroundColor: colores.primaryLight,
  },
  horas: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  hora: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.pill,
    backgroundColor: colores.primaryLight,
    borderWidth: 1.5,
    borderColor: colores.primary,
  },
  horaTexto: {
    minHeight: minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    justifyContent: 'center',
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
  },
  textoHora: {
    fontFamily: FUENTE,
    fontSize: 20,
    fontWeight: '700',
    color: colores.primaryDark,
  },
  quitar: {
    minHeight: minTouchTarget,
    minWidth: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habituales: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  habitual: {
    minHeight: minTouchTarget + 12,
    minWidth: 96,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colores.borderStrong,
    backgroundColor: colores.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulsado: { backgroundColor: colores.primaryLight },
  eliminar: { marginTop: spacing.lg },
}));
