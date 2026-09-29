import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Icono from './Icono';
import { estaHecha, type Dosis } from '../logic/dosis';
import { minTouchTarget, radii, spacing } from '../theme/theme';
import EtiquetaEstado, { infoEstado } from './EtiquetaEstado';
import Capsula from './Capsula';
import { crearEstilos, useTema } from '../lib/TemaContext';

interface Props {
  dosis: Dosis;
  /** Al pulsar la fila (opciones: omitir, deshacer…) */
  onPress?: () => void;
  /** Botón rápido «Tomar» si aún no está hecha */
  onTomar?: () => void;
  mostrarHora?: boolean;
}

function horaConfirmacion(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes(),
  ).padStart(2, '0')}`;
}

export default function FilaDosis({
  dosis,
  onPress,
  onTomar,
  mostrarHora,
}: Props) {
  const { colores, tipografia } = useTema();
  const styles = useEstilos();
  const hecha = estaHecha(dosis);
  const confirmada =
    dosis.estado === 'tomada' ? horaConfirmacion(dosis.confirmadoEn) : null;
  const estadoLeido = confirmada
    ? `tomada a las ${confirmada}`
    : infoEstado(colores)[dosis.estado].texto.toLowerCase();
  const descripcion = [mostrarHora ? dosis.hora : null, dosis.dosis]
    .filter(Boolean)
    .join(' · ');

  const contenido = (
    <>
      <Capsula
        color={dosis.color}
        tamano={36}
        marcada={dosis.estado === 'tomada'}
      />
      <View style={styles.textos}>
        <Text
          style={[tipografia.bodyStrong, hecha && styles.hecha]}
          numberOfLines={2}
        >
          {dosis.nombre}
        </Text>
        {descripcion ? (
          <Text style={tipografia.bodySecondary}>{descripcion}</Text>
        ) : null}
        <EtiquetaEstado
          estado={dosis.estado}
          texto={confirmada ? `Tomada a las ${confirmada}` : undefined}
        />
      </View>
      {onTomar && !hecha ? (
        <Pressable
          onPress={onTomar}
          accessibilityRole="button"
          accessibilityLabel={`Marcar ${dosis.nombre} como tomada`}
          style={({ pressed }) => [
            styles.tomar,
            pressed && styles.tomarPulsado,
          ]}
        >
          <Icono nombre="check" tamano={20} color={colores.textOnAccent} />
          <Text style={styles.textoTomar}>Tomar</Text>
        </Pressable>
      ) : null}
    </>
  );

  if (!onPress) return <View style={styles.fila}>{contenido}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[dosis.nombre, dosis.dosis, dosis.hora, estadoLeido]
        .filter(Boolean)
        .join(', ')}
      accessibilityHint={hecha ? 'Opciones para deshacer' : 'Más opciones'}
      style={({ pressed }) => [styles.fila, pressed && styles.pulsada]}
    >
      {contenido}
    </Pressable>
  );
}

const useEstilos = crearEstilos((colores, tipografia) => ({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: minTouchTarget + 16,
  },
  pulsada: { opacity: 0.7 },
  textos: { flex: 1, gap: spacing.xs },
  hecha: { color: colores.textSecondary },
  tomar: {
    minHeight: minTouchTarget + 4,
    minWidth: 96,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colores.accent,
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tomarPulsado: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  textoTomar: {
    ...tipografia.button,
    fontSize: 17,
    color: colores.textOnAccent,
  },
}));
