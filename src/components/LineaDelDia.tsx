import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import FilaDosis from './FilaDosis';
import Icono from './Icono';
import {
  marcarDosis,
  opcionesDosis,
  type AccionesDosis,
} from '../lib/accionesDosis';
import { crearEstilos, useTema } from '../lib/TemaContext';
import { horaDe } from '../logic/fechas';
import {
  estadoGrupo,
  nombresDe,
  type GrupoHora,
  type NodoLinea,
} from '../logic/hoy';
import { FUENTE, minTouchTarget, radii, spacing } from '../theme/theme';

// Al abrir una hora, lo de debajo se recoloca con suavidad (sin animación si el
// móvil tiene «reducir movimiento»)
const RECOLOCAR = LinearTransition.duration(220);
const APARECER = FadeIn.duration(200);

interface Props {
  grupos: GrupoHora[];
  ahora: Date;
  /** Primera hora de mañana: se ve al final, en gris, para que el día nunca quede vacío */
  manana: GrupoHora | null;
  hechas: number;
  total: number;
  acciones: AccionesDosis;
}

/**
 * El día entero en una línea: lo hecho arriba, la marca de «ahora» y lo que
 * queda. Cada hora se abre para ver sus pastillas y marcarlas o deshacerlas.
 */
export default function LineaDelDia({
  grupos,
  ahora,
  manana,
  hechas,
  total,
  acciones,
}: Props) {
  const { tipografia } = useTema();
  const styles = useEstilos();
  const [abierta, setAbierta] = useState<string | null>(null);
  // La marca de «ahora» va antes de la primera hora que aún no ha llegado
  const posicionAhora = grupos.findIndex(
    g => g.dosis[0].momento.getTime() > ahora.getTime(),
  );
  const filas: React.ReactNode[] = grupos.map(g => (
    <FilaHora
      key={g.hora}
      grupo={g}
      ahora={ahora}
      abierta={abierta === g.hora}
      alPulsar={() => setAbierta(abierta === g.hora ? null : g.hora)}
      acciones={acciones}
    />
  ));
  filas.splice(
    posicionAhora === -1 ? filas.length : posicionAhora,
    0,
    <MarcaAhora key="ahora" hora={horaDe(ahora)} />,
  );

  return (
    <View style={styles.bloque}>
      <View style={styles.cabecera}>
        <Text style={tipografia.subtitle} accessibilityRole="header">
          Tu día
        </Text>
        <Text style={tipografia.bodySecondary}>
          {hechas} de {total} hechas
        </Text>
      </View>
      <View style={styles.linea}>
        <View style={styles.trazo} />
        {filas}
        {manana ? (
          <Animated.View layout={RECOLOCAR} style={styles.fila}>
            <View style={styles.columnaNodo}>
              <View style={[styles.nodo, styles.nodoManana]} />
            </View>
            <View style={styles.textos}>
              <Text style={[styles.hora, styles.apagado]}>{manana.hora}</Text>
              <Text style={styles.nombres}>
                Mañana · {nombresDe(manana.dosis)}
              </Text>
            </View>
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

function FilaHora({
  grupo,
  ahora,
  abierta,
  alPulsar,
  acciones,
}: {
  grupo: GrupoHora;
  ahora: Date;
  abierta: boolean;
  alPulsar: () => void;
  acciones: AccionesDosis;
}) {
  const { colores } = useTema();
  const styles = useEstilos();
  const { nodo, texto } = estadoGrupo(grupo, ahora);
  const colorEstado: Record<NodoLinea, string> = {
    hecho: colores.successDark,
    aviso: colores.warningDark,
    pendiente: colores.primaryDark,
  };
  return (
    <Animated.View layout={RECOLOCAR}>
      <Pressable
        onPress={alPulsar}
        accessibilityRole="button"
        accessibilityLabel={`${grupo.hora}, ${nombresDe(
          grupo.dosis,
        )}, ${texto}`}
        accessibilityHint={
          abierta ? 'Oculta las pastillas' : 'Muestra las pastillas'
        }
        accessibilityState={{ expanded: abierta }}
        style={({ pressed }) => [styles.fila, pressed && styles.pulsada]}
      >
        <View style={styles.columnaNodo}>
          <View style={[styles.nodo, styles[nodo]]}>
            {nodo === 'hecho' ? (
              <Icono nombre="check" tamano={14} color={colores.textOnSuccess} />
            ) : null}
          </View>
        </View>
        <View style={styles.textos}>
          <View style={styles.filaTitulo}>
            <Text style={styles.hora}>{grupo.hora}</Text>
            <Text style={styles.nombres}>{nombresDe(grupo.dosis)}</Text>
          </View>
          <Text style={[styles.estado, { color: colorEstado[nodo] }]}>
            {texto}
          </Text>
        </View>
        <View style={abierta ? styles.flechaAbierta : undefined}>
          <Icono
            nombre="caret-right"
            tamano={20}
            color={colores.textSecondary}
          />
        </View>
      </Pressable>
      {abierta ? (
        <Animated.View entering={APARECER} style={styles.detalle}>
          {grupo.dosis.map(d => (
            <FilaDosis
              key={d.horarioId}
              dosis={d}
              onPress={() => opcionesDosis(acciones, d)}
              onTomar={() => marcarDosis(acciones, [d], 'tomado')}
            />
          ))}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

function MarcaAhora({ hora }: { hora: string }) {
  const styles = useEstilos();
  return (
    <Animated.View layout={RECOLOCAR} style={styles.ahora}>
      <View style={styles.puntoAhora} />
      <View style={styles.rayaAhora} />
      <Text style={styles.textoAhora}>Ahora · {hora}</Text>
    </Animated.View>
  );
}

const NODO = 24;

const useEstilos = crearEstilos((colores, tipografia) => ({
  bloque: { gap: spacing.sm },
  cabecera: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  linea: { gap: spacing.xs },
  // Línea vertical que une los puntos
  trazo: {
    position: 'absolute',
    left: NODO / 2 - 1,
    top: spacing.md,
    bottom: spacing.md,
    width: 2,
    backgroundColor: colores.border,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: minTouchTarget + 8,
  },
  pulsada: { opacity: 0.7 },
  columnaNodo: { width: NODO, alignItems: 'center' },
  nodo: {
    width: NODO,
    height: NODO,
    borderRadius: NODO / 2,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colores.background,
  },
  hecho: { backgroundColor: colores.success, borderColor: colores.success },
  aviso: {
    backgroundColor: colores.warningLight,
    borderColor: colores.warning,
  },
  pendiente: { borderColor: colores.primary },
  nodoManana: { borderColor: colores.borderStrong, borderStyle: 'dashed' },
  textos: { flex: 1, gap: 2 },
  filaTitulo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    columnGap: spacing.sm,
  },
  hora: {
    fontFamily: FUENTE,
    fontSize: 20,
    fontWeight: '700',
    color: colores.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  apagado: { color: colores.textSecondary },
  nombres: { ...tipografia.bodySecondary, flexShrink: 1 },
  estado: { fontFamily: FUENTE, fontSize: 16, fontWeight: '600' },
  flechaAbierta: { transform: [{ rotate: '90deg' }] },
  detalle: {
    marginLeft: NODO + spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colores.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colores.border,
  },
  ahora: { flexDirection: 'row', alignItems: 'center', minHeight: 28 },
  puntoAhora: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginLeft: NODO / 2 - 7,
    backgroundColor: colores.accent,
  },
  rayaAhora: {
    flex: 1,
    height: 2,
    backgroundColor: colores.accent,
    marginHorizontal: spacing.sm,
  },
  textoAhora: {
    fontFamily: FUENTE,
    fontSize: 16,
    fontWeight: '700',
    color: colores.accentDark,
  },
}));
