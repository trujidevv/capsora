import React, { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import Icono, { type NombreIcono } from './Icono';
import { minTouchTarget, radii, spacing } from '../theme/theme';
import Boton from './Boton';
import { crearEstilos, useTema } from '../lib/TemaContext';

/** Pantalla de carga a pantalla completa. */
export function Cargando({ texto }: { texto?: string }) {
  const { colores, tipografia } = useTema();
  const styles = useEstilos();
  return (
    <View style={styles.cargando}>
      <ActivityIndicator size="large" color={colores.primary} />
      {texto ? <Text style={tipografia.bodySecondary}>{texto}</Text> : null}
    </View>
  );
}

/** Mensaje cuando una lista está vacía, con una acción para empezar. */
export function EstadoVacio({
  icono,
  titulo,
  texto,
  accion,
}: {
  icono: NombreIcono;
  titulo: string;
  texto?: string;
  accion?: { titulo: string; onPress: () => void; icono?: NombreIcono };
}) {
  const { colores, tipografia } = useTema();
  const styles = useEstilos();
  return (
    <View style={styles.vacio}>
      <View style={styles.circuloVacio}>
        <Icono nombre={icono} tamano={40} color={colores.primary} />
      </View>
      <Text style={[tipografia.subtitle, styles.centro]}>{titulo}</Text>
      {texto ? (
        <Text style={[tipografia.bodySecondary, styles.centro]}>{texto}</Text>
      ) : null}
      {accion ? (
        <Boton
          titulo={accion.titulo}
          icono={accion.icono}
          onPress={accion.onPress}
          style={styles.botonVacio}
        />
      ) : null}
    </View>
  );
}

/** Título de sección dentro de una pantalla. */
export function TituloSeccion({
  texto,
  derecha,
}: {
  texto: string;
  derecha?: React.ReactNode;
}) {
  const { tipografia } = useTema();
  const styles = useEstilos();
  return (
    <View style={styles.seccion}>
      <Text style={tipografia.subtitle} accessibilityRole="header">
        {texto}
      </Text>
      {derecha}
    </View>
  );
}

/**
 * Error de un formulario: con icono (no solo color) y anunciado por el lector
 * de pantalla en cuanto aparece o cambia.
 */
export function MensajeError({ texto }: { texto: string }) {
  const { colores, tipografia } = useTema();
  const styles = useEstilos();
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(texto);
  }, [texto]);
  return (
    <View style={styles.error} accessibilityLiveRegion="polite">
      <Icono nombre="warning" tamano={22} color={colores.danger} />
      <Text style={[tipografia.body, styles.textoError]}>{texto}</Text>
    </View>
  );
}

export function BarraProgreso({
  valor,
  color,
}: {
  valor: number;
  color?: string;
}) {
  const { colores } = useTema();
  const styles = useEstilos();
  const reducirMovimiento = useReducedMotion();
  const [ancho, setAncho] = useState(0);
  const pct = Math.max(0, Math.min(1, valor));
  const duracion = reducirMovimiento ? 1 : 450;
  return (
    <View
      style={styles.barra}
      onLayout={e => setAncho(e.nativeEvent.layout.width)}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
    >
      {ancho > 0 ? (
        // Se desplaza el relleno (transform) en vez de cambiar su ancho: animar
        // el ancho recalcula la maquetación en cada fotograma y da tirones.
        <Animated.View
          style={[
            styles.relleno,
            {
              backgroundColor: color ?? colores.success,
              transform: [{ translateX: -(1 - pct) * ancho }],
              // Las transiciones CSS no siguen solas el ajuste del móvil
              transitionDuration: duracion,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

/** Grupo de opciones excluyentes (tipo "radio"), grandes y fáciles de pulsar. */
export function SelectorOpciones<T extends string | number | boolean | null>({
  opciones,
  valor,
  onCambiar,
}: {
  opciones: { valor: T; etiqueta: string }[];
  valor: T;
  onCambiar: (v: T) => void;
}) {
  const { tipografia } = useTema();
  const styles = useEstilos();
  return (
    <View style={styles.opciones} accessibilityRole="radiogroup">
      {opciones.map(o => {
        const activa = o.valor === valor;
        return (
          <Pressable
            key={String(o.valor)}
            onPress={() => onCambiar(o.valor)}
            accessibilityRole="radio"
            accessibilityState={{ checked: activa }}
            style={({ pressed }) => [
              styles.opcion,
              activa && styles.opcionActiva,
              pressed && !activa && styles.opcionPulsada,
            ]}
          >
            <Text style={[tipografia.bodyStrong, activa && styles.textoActivo]}>
              {o.etiqueta}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Fila de ajustes: título + descripción + acción a la derecha o al pulsar. */
export function FilaAjuste({
  titulo,
  descripcion,
  onPress,
  derecha,
  peligro,
}: {
  titulo: string;
  descripcion?: string;
  onPress?: () => void;
  derecha?: React.ReactNode;
  peligro?: boolean;
}) {
  const { colores, tipografia } = useTema();
  const styles = useEstilos();
  const contenido = (
    <>
      <View style={styles.filaTextos}>
        <Text
          style={[
            tipografia.bodyStrong,
            peligro && { color: colores.dangerDark },
          ]}
        >
          {titulo}
        </Text>
        {descripcion ? (
          <Text style={tipografia.bodySecondary}>{descripcion}</Text>
        ) : null}
      </View>
      {derecha ??
        (onPress ? (
          <Icono nombre="caret-right" color={colores.textSecondary} />
        ) : null)}
    </>
  );
  if (!onPress) return <View style={styles.fila}>{contenido}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.fila, pressed && styles.filaPulsada]}
    >
      {contenido}
    </Pressable>
  );
}

const useEstilos = crearEstilos(colores => ({
  cargando: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colores.background,
  },
  vacio: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  circuloVacio: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colores.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  centro: { textAlign: 'center' },
  botonVacio: { marginTop: spacing.md, alignSelf: 'stretch' },
  seccion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  barra: {
    height: 12,
    borderRadius: radii.pill,
    backgroundColor: colores.border,
    overflow: 'hidden',
  },
  relleno: {
    width: '100%',
    height: '100%',
    borderRadius: radii.pill,
    transitionProperty: ['transform', 'backgroundColor'],
    transitionTimingFunction: 'ease-out',
  },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  opcion: {
    minHeight: minTouchTarget,
    minWidth: 72,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colores.borderStrong,
    backgroundColor: colores.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  opcionActiva: {
    borderColor: colores.primary,
    backgroundColor: colores.primaryLight,
  },
  error: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  textoError: { flex: 1, color: colores.danger },
  opcionPulsada: { backgroundColor: colores.primaryLight },
  textoActivo: { color: colores.primaryDark },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: minTouchTarget + 8,
    paddingVertical: spacing.sm,
  },
  filaPulsada: { opacity: 0.7 },
  filaTextos: { flex: 1, gap: 2 },
}));
