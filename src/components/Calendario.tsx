import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { Semaforo } from '../logic/dosis';
import {
  desdeFecha,
  diaSemanaLunes,
  fechaLarga,
  sumarDias,
  type Fecha,
} from '../logic/fechas';
import { radii, spacing, type Colores, FUENTE } from '../theme/theme';
import { crearEstilos, useTema } from '../lib/TemaContext';
import Icono, { type NombreIcono } from './Icono';

function coloresSemaforo(
  colores: Colores,
): Record<Semaforo, { fondo: string; texto: string }> {
  return {
    verde: { fondo: colores.success, texto: colores.textOnSuccess },
    ambar: { fondo: colores.warning, texto: colores.textOnWarning },
    rojo: { fondo: colores.danger, texto: colores.textOnDanger },
    neutro: { fondo: colores.unknownLight, texto: colores.textSecondary },
  };
}

/** Marca de cada estado, para que no dependa solo del color. */
const MARCA: Record<Semaforo, NombreIcono | null> = {
  verde: 'check',
  ambar: 'warning',
  rojo: 'x',
  neutro: null,
};

const DESCRIPCION: Record<Semaforo, string> = {
  verde: 'todo tomado',
  ambar: 'alguna toma omitida o atrasada',
  rojo: 'tomas sin hacer',
  neutro: 'sin tomas',
};

interface Props {
  hoy: Fecha;
  semanas: number;
  estadoDe: (fecha: Fecha) => Semaforo;
  seleccionada: Fecha;
  onSeleccionar: (fecha: Fecha) => void;
}

/** Calendario de las últimas semanas con un color por día (lunes primero). */
export default function Calendario({
  hoy,
  semanas,
  estadoDe,
  seleccionada,
  onSeleccionar,
}: Props) {
  const { colores, tipografia } = useTema();
  const styles = useEstilos();
  const COLOR = coloresSemaforo(colores);
  const inicio = sumarDias(hoy, -(diaSemanaLunes(hoy) + (semanas - 1) * 7));
  const filas: Fecha[][] = [];
  for (let s = 0; s < semanas; s++) {
    filas.push(
      Array.from({ length: 7 }, (_, d) => sumarDias(inicio, s * 7 + d)),
    );
  }

  return (
    <View style={styles.calendario}>
      <View style={styles.fila}>
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
          <Text key={d} style={[tipografia.caption, styles.cabecera]}>
            {d}
          </Text>
        ))}
      </View>
      {filas.map(fila => (
        <View key={fila[0]} style={styles.fila}>
          {fila.map(fecha => {
            const futuro = fecha > hoy;
            const estado = futuro ? 'neutro' : estadoDe(fecha);
            const c = COLOR[estado];
            const activa = fecha === seleccionada;
            return (
              <Pressable
                key={fecha}
                disabled={futuro}
                onPress={() => onSeleccionar(fecha)}
                accessibilityRole="button"
                accessibilityLabel={`${fechaLarga(fecha)}: ${
                  futuro ? 'aún no ha llegado' : DESCRIPCION[estado]
                }`}
                accessibilityState={{ selected: activa, disabled: futuro }}
                style={[
                  styles.dia,
                  { backgroundColor: c.fondo },
                  futuro && styles.futuro,
                  fecha === hoy && styles.hoy,
                  activa && styles.activa,
                ]}
              >
                <Text style={[styles.numero, { color: c.texto }]}>
                  {desdeFecha(fecha).getDate()}
                </Text>
                {MARCA[estado] && !futuro ? (
                  <Icono nombre={MARCA[estado]} tamano={14} color={c.texto} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ))}
      <View style={styles.leyenda}>
        {(['verde', 'ambar', 'rojo'] as Semaforo[]).map(s => (
          <View key={s} style={styles.itemLeyenda}>
            <View style={[styles.muestra, { backgroundColor: COLOR[s].fondo }]}>
              {MARCA[s] ? (
                <Icono nombre={MARCA[s]} tamano={14} color={COLOR[s].texto} />
              ) : null}
            </View>
            <Text style={tipografia.caption}>{DESCRIPCION[s]}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const useEstilos = crearEstilos(colores => ({
  calendario: { gap: spacing.xs },
  fila: { flexDirection: 'row', gap: spacing.xs },
  cabecera: {
    fontFamily: FUENTE,
    flex: 1,
    textAlign: 'center',
    fontWeight: '700',
  },
  // Excepción a los 48 px: siete días no caben a 48 de ancho en un móvil de
  // 360 dp. Quedan en unos 37 × 46 (por encima del mínimo de 24 de WCAG 2.5.8).
  dia: {
    flex: 1,
    aspectRatio: 0.8,
    minHeight: 44,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  futuro: { opacity: 0.35 },
  hoy: { borderColor: colores.primaryDark },
  activa: { borderColor: colores.textPrimary },
  numero: { fontFamily: FUENTE, fontSize: 16, fontWeight: '700' },
  leyenda: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  itemLeyenda: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  muestra: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
