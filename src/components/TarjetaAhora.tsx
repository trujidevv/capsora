import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Boton from './Boton';
import Capsula from './Capsula';
import Icono, { type NombreIcono } from './Icono';
import {
  marcarDosis,
  opcionesDosis,
  type AccionesDosis,
} from '../lib/accionesDosis';
import { crearEstilos, useTema } from '../lib/TemaContext';
import { mezclar } from '../logic/color';
import { estaHecha, type Dosis } from '../logic/dosis';
import { ETIQUETA_MOMENTO, horaDe, momentoDelDia } from '../logic/fechas';
import {
  nombresDe,
  textoTomarTodas,
  tiempoHasta,
  type GrupoHora,
  type TarjetaHoy,
} from '../logic/hoy';
import { FUENTE, minTouchTarget, radii, spacing } from '../theme/theme';

// Al cambiar de estado (se marca la toma, llega la hora…) la tarjeta aparece
// con un fundido corto. Sin animación si el móvil tiene «reducir movimiento».
const APARECER = FadeIn.duration(250);

interface Props {
  tarjeta: TarjetaHoy;
  ahora: Date;
  /** Primera hora de mañana, para decir qué viene cuando hoy ya no queda nada */
  manana: GrupoHora | null;
  /** Todo lo de hoy marcado como tomado (y no como «no tomada») */
  todoTomado: boolean;
  acciones: AccionesDosis;
}

/**
 * Lo más importante de Hoy: qué toca ahora y el botón para marcarlo. Está
 * siempre en el mismo sitio; según el momento cambia de tono (verde de la marca,
 * borde naranja a la hora, ámbar si se ha pasado sin marcar, verde claro al acabar).
 */
export default function TarjetaAhora({
  tarjeta,
  ahora,
  manana,
  todoTomado,
  acciones,
}: Props) {
  const styles = useEstilos();
  const clave =
    'grupo' in tarjeta ? `${tarjeta.tipo}-${tarjeta.grupo.hora}` : tarjeta.tipo;
  return (
    <Animated.View key={clave} entering={APARECER}>
      {tarjeta.tipo === 'proxima' || tarjeta.tipo === 'esLaHora' ? (
        <View
          style={[styles.heroe, tarjeta.tipo === 'esLaHora' && styles.esLaHora]}
        >
          <Chip
            icono="bell-ringing"
            texto={
              tarjeta.tipo === 'esLaHora'
                ? 'Es la hora'
                : `Próxima · ${tiempoHasta(
                    tarjeta.grupo.dosis[0].momento,
                    ahora,
                  )}`
            }
            tono="heroe"
          />
          <View style={styles.filaHora}>
            <Text style={styles.hora}>{tarjeta.grupo.hora}</Text>
            <Text style={styles.momento}>
              {ETIQUETA_MOMENTO[momentoDelDia(tarjeta.grupo.hora)]}
            </Text>
          </View>
          <ListaPastillas
            grupo={tarjeta.grupo}
            tono="heroe"
            acciones={acciones}
          />
          <Boton
            variante="acento"
            icono="check"
            titulo={textoTomarTodas(pendientesDe(tarjeta.grupo))}
            onPress={() =>
              marcarDosis(acciones, pendientesDe(tarjeta.grupo), 'tomado')
            }
          />
        </View>
      ) : tarjeta.tipo === 'sinMarcar' ? (
        <SinMarcar grupo={tarjeta.grupo} acciones={acciones} />
      ) : (
        <Terminado
          sinTomas={tarjeta.tipo === 'sinTomas'}
          todoTomado={todoTomado}
          manana={manana}
        />
      )}
    </Animated.View>
  );
}

const pendientesDe = (g: GrupoHora) => g.dosis.filter(d => !estaHecha(d));

/** Se ha pasado la hora sin marcar: se pregunta, sin regañar, y se puede decir que no. */
function SinMarcar({
  grupo,
  acciones,
}: {
  grupo: GrupoHora;
  acciones: AccionesDosis;
}) {
  const { tipografia } = useTema();
  const styles = useEstilos();
  const pendientes = pendientesDe(grupo);
  const varias = pendientes.length > 1;
  return (
    <View style={[styles.heroe, styles.ambar]}>
      <Chip icono="clock" texto={`Sin marcar · ${grupo.hora}`} tono="ambar" />
      <Text style={tipografia.subtitle} accessibilityRole="header">
        {`¿Te has tomado ${varias ? 'las' : 'la'} de las ${grupo.hora}?`}
      </Text>
      <ListaPastillas grupo={grupo} tono="claro" acciones={acciones} />
      <Boton
        variante="acento"
        icono="check"
        titulo={varias ? 'Sí, me las he tomado' : 'Sí, me la he tomado'}
        onPress={() => marcarDosis(acciones, pendientes, 'tomado')}
      />
      <Boton
        variante="secundario"
        titulo={varias ? 'No me las he tomado' : 'No me la he tomado'}
        onPress={() => marcarDosis(acciones, pendientes, 'omitido')}
      />
    </View>
  );
}

/** Ya no queda nada hoy: calma y qué viene después. Sin celebraciones. */
function Terminado({
  sinTomas,
  todoTomado,
  manana,
}: {
  sinTomas: boolean;
  todoTomado: boolean;
  manana: GrupoHora | null;
}) {
  const { tipografia } = useTema();
  const styles = useEstilos();
  return (
    <View style={[styles.heroe, sinTomas ? styles.neutro : styles.calma]}>
      <Chip
        icono={sinTomas ? 'minus' : 'check-circle'}
        texto={
          sinTomas
            ? 'Hoy no tienes tomas'
            : todoTomado
            ? 'Todo tomado por hoy'
            : 'Nada pendiente por hoy'
        }
        tono={sinTomas ? 'neutro' : 'calma'}
      />
      {manana ? (
        <>
          <Text style={styles.calmaTexto}>
            Tu próxima toma es{' '}
            <Text style={styles.fuerte}>mañana a las {manana.hora}</Text>.
          </Text>
          <Text style={tipografia.bodySecondary}>
            {nombresDe(manana.dosis)}
          </Text>
        </>
      ) : null}
    </View>
  );
}

type Tono = 'heroe' | 'ambar' | 'calma' | 'neutro' | 'claro';

function Chip({
  icono,
  texto,
  tono,
}: {
  icono: NombreIcono;
  texto: string;
  tono: Exclude<Tono, 'claro'>;
}) {
  const { colores } = useTema();
  const styles = useEstilos();
  const { fondo, color } = {
    heroe: {
      fondo: mezclar(colores.heroFondo, colores.textOnHero, 0.16),
      color: colores.textOnHero,
    },
    ambar: { fondo: colores.surface, color: colores.warningDark },
    calma: { fondo: colores.success, color: colores.textOnSuccess },
    neutro: { fondo: colores.surface, color: colores.textSecondary },
  }[tono];
  return (
    <View style={[styles.chip, { backgroundColor: fondo }]}>
      <Icono nombre={icono} tamano={18} color={color} />
      <Text style={[styles.chipTexto, { color }]}>{texto}</Text>
    </View>
  );
}

/**
 * Las pastillas de esa hora. Si hay más de una, cada una lleva su círculo para
 * marcarla sola (a veces se toma una y la otra no). Pulsar la fila abre las
 * opciones de siempre: no tomarla o deshacer.
 */
function ListaPastillas({
  grupo,
  tono,
  acciones,
}: {
  grupo: GrupoHora;
  tono: 'heroe' | 'claro';
  acciones: AccionesDosis;
}) {
  const { colores } = useTema();
  const styles = useEstilos();
  const conCirculo = grupo.dosis.length > 1;
  const principal = tono === 'heroe' ? colores.textOnHero : colores.textPrimary;
  const suave =
    tono === 'heroe' ? colores.textOnHeroSuave : colores.textSecondary;
  return (
    <View style={styles.lista}>
      {grupo.dosis.map(d => {
        const hecha = estaHecha(d);
        const detalle = detalleDosis(d);
        return (
          <Pressable
            key={d.horarioId}
            onPress={() => opcionesDosis(acciones, d)}
            accessibilityRole="button"
            accessibilityLabel={[d.nombre, d.dosis, detalle]
              .filter(Boolean)
              .join(', ')}
            accessibilityHint={
              hecha ? 'Opciones para deshacer' : 'Más opciones'
            }
            style={({ pressed }) => [
              styles.pastilla,
              pressed && styles.pulsada,
            ]}
          >
            <Capsula
              color={d.color}
              tamano={34}
              marcada={d.estado === 'tomada'}
            />
            <View style={styles.textos}>
              <Text style={[styles.nombre, { color: principal }]}>
                {d.nombre}
                {d.dosis ? (
                  <Text style={[styles.dosis, { color: suave }]}>
                    {' '}
                    {d.dosis}
                  </Text>
                ) : null}
              </Text>
              {detalle ? (
                <Text style={[styles.detalle, { color: suave }]}>
                  {detalle}
                </Text>
              ) : null}
            </View>
            {conCirculo ? (
              <Circulo
                dosis={d}
                tono={tono}
                onPress={() =>
                  hecha
                    ? opcionesDosis(acciones, d)
                    : marcarDosis(acciones, [d], 'tomado')
                }
              />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function detalleDosis(d: Dosis): string | null {
  if (d.estado === 'tomada' && d.confirmadoEn)
    return `Tomada a las ${horaDe(new Date(d.confirmadoEn))}`;
  if (d.estado === 'tomada') return 'Tomada';
  if (d.estado === 'omitida') return 'No tomada';
  return null;
}

function Circulo({
  dosis,
  tono,
  onPress,
}: {
  dosis: Dosis;
  tono: 'heroe' | 'claro';
  onPress: () => void;
}) {
  const { colores } = useTema();
  const styles = useEstilos();
  const hecha = estaHecha(dosis);
  const borde = tono === 'heroe' ? colores.textOnHero : colores.primary;
  const relleno = tono === 'heroe' ? colores.textOnHero : colores.success;
  const marca = tono === 'heroe' ? colores.heroFondo : colores.textOnSuccess;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={
        hecha
          ? `${dosis.nombre}: ya marcada`
          : `Marcar ${dosis.nombre} como tomada`
      }
      accessibilityState={{ checked: dosis.estado === 'tomada' }}
      style={({ pressed }) => [
        styles.circulo,
        { borderColor: hecha ? relleno : borde },
        hecha && { backgroundColor: relleno },
        pressed && styles.pulsada,
      ]}
    >
      {hecha ? (
        <Icono
          nombre={dosis.estado === 'tomada' ? 'check' : 'minus'}
          tamano={22}
          color={marca}
        />
      ) : (
        // Marca tenue: dice que el círculo se puede pulsar
        <View style={styles.marcaTenue}>
          <Icono nombre="check" tamano={22} color={borde} />
        </View>
      )}
    </Pressable>
  );
}

const useEstilos = crearEstilos((colores, tipografia) => ({
  heroe: {
    backgroundColor: colores.heroFondo,
    borderRadius: radii.lg + 6,
    padding: spacing.md,
    gap: spacing.sm,
  },
  esLaHora: { borderWidth: 3, borderColor: colores.accent },
  ambar: {
    backgroundColor: colores.warningLight,
    borderWidth: 2,
    borderColor: colores.warning,
  },
  calma: { backgroundColor: colores.successLight },
  neutro: {
    backgroundColor: colores.surface,
    borderWidth: 1,
    borderColor: colores.border,
  },
  chip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  chipTexto: { fontFamily: FUENTE, fontSize: 16, fontWeight: '700' },
  filaHora: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  hora: {
    fontFamily: FUENTE,
    fontSize: 44,
    fontWeight: '800',
    color: colores.textOnHero,
    fontVariant: ['tabular-nums'],
  },
  momento: { ...tipografia.body, color: colores.textOnHeroSuave },
  lista: { gap: spacing.xs },
  pastilla: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: minTouchTarget + 8,
  },
  pulsada: { opacity: 0.7 },
  textos: { flex: 1 },
  nombre: { ...tipografia.bodyStrong, fontSize: 18 },
  dosis: { ...tipografia.body, fontSize: 17 },
  detalle: { ...tipografia.bodySecondary },
  circulo: {
    width: minTouchTarget,
    height: minTouchTarget,
    borderRadius: minTouchTarget / 2,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marcaTenue: { opacity: 0.4 },
  calmaTexto: { ...tipografia.body, fontSize: 18 },
  fuerte: { fontWeight: '700' },
}));
