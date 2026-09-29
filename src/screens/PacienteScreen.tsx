import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Aviso from '../components/Aviso';
import FilaDosis from '../components/FilaDosis';
import Pantalla from '../components/Pantalla';
import ResumenPaciente, {
  EXPLICACION_CUIDADOR,
  calcularEstadoPaciente,
} from '../components/ResumenPaciente';
import Icono, { type NombreIcono } from '../components/Icono';
import Tarjeta from '../components/Tarjeta';
import { Cargando, TituloSeccion } from '../components/Varios';
import { obtenerDatosPaciente, type DatosPaciente } from '../data/paciente';
import { mensajeDeError } from '../lib/errores';
import { useAhora } from '../lib/useAhora';
import {
  adherencia,
  dosisDelDia,
  estadoDiaParaCuidador,
  resumir,
  type EstadoCuidador,
} from '../logic/dosis';
import {
  fechaLarga,
  hoy,
  inicialDia,
  rangoFechas,
  sumarDias,
} from '../logic/fechas';
import type { PantallaApp } from '../navigation/tipos';
import { radii, spacing, type Colores } from '../theme/theme';
import { crearEstilos, useTema } from '../lib/TemaContext';

/** Color, marca (para no depender solo del color) y texto para el lector. */
function infoDia(
  colores: Colores,
): Record<
  EstadoCuidador,
  { fondo: string; marca: NombreIcono | null; color: string; texto: string }
> {
  return {
    verde: {
      fondo: colores.success,
      marca: 'check',
      color: colores.textOnSuccess,
      texto: 'todo tomado',
    },
    ambar: {
      fondo: colores.warning,
      marca: 'warning',
      color: colores.textOnWarning,
      texto: 'algo omitido',
    },
    rojo: {
      fondo: colores.danger,
      marca: 'x',
      color: colores.textOnDanger,
      texto: 'tomas sin hacer',
    },
    neutro: {
      fondo: colores.unknownLight,
      marca: null,
      color: colores.textSecondary,
      texto: 'sin tomas',
    },
    desconocido: {
      fondo: colores.unknown,
      marca: 'question',
      color: colores.background,
      texto: 'sin datos de su móvil',
    },
  };
}

export default function PacienteScreen({
  navigation,
  route,
}: PantallaApp<'Paciente'>) {
  const { colores, tipografia } = useTema();
  const styles = useEstilos();
  const { pacienteId, nombre } = route.params;
  const ahora = useAhora();
  const [datos, setDatos] = useState<DatosPaciente | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: nombre });
  }, [navigation, nombre]);

  const cargar = useCallback(async () => {
    try {
      setDatos(await obtenerDatosPaciente(pacienteId, 7));
      setError(null);
    } catch (e) {
      setError(mensajeDeError(e));
    }
  }, [pacienteId]);

  useFocusEffect(
    useCallback(() => {
      cargar();
      const id = setInterval(cargar, 60000);
      return () => clearInterval(id);
    }, [cargar]),
  );

  const semana = useMemo(() => {
    if (!datos) return [];
    const fechaHoy = hoy(ahora);
    return rangoFechas(sumarDias(fechaHoy, -6), fechaHoy).map(f => {
      const r = resumir(
        dosisDelDia(datos.medicamentos, datos.registros, f, ahora),
      );
      return { fecha: f, resumen: r, estado: estadoDiaParaCuidador(r) };
    });
  }, [datos, ahora]);

  async function refrescar() {
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  }

  if (!datos && !error) return <Cargando />;

  if (!datos) {
    return (
      <Pantalla>
        <Aviso
          tipo="peligro"
          titulo="No se ha podido cargar"
          texto={error ?? undefined}
          accion={{ titulo: 'Reintentar', onPress: refrescar }}
        />
      </Pantalla>
    );
  }

  const { dosis, estado } = calcularEstadoPaciente(datos, ahora);
  // Los días en que su móvil no dio señales no cuentan como "no tomadas"
  const dia = infoDia(colores);
  const pct = adherencia(
    semana.filter(s => s.estado !== 'desconocido').map(s => s.resumen),
  );

  return (
    <Pantalla onRefrescar={refrescar} refrescando={refrescando}>
      {error ? (
        <Aviso tipo="alerta" titulo="Datos sin actualizar" texto={error} />
      ) : null}

      <Tarjeta>
        <ResumenPaciente datos={datos} ahora={ahora} />
        <Text style={tipografia.body}>{EXPLICACION_CUIDADOR[estado]}</Text>
      </Tarjeta>

      <TituloSeccion texto="Hoy" />
      <Tarjeta>
        {dosis.length === 0 ? (
          <Text style={tipografia.bodySecondary}>
            Hoy no tiene tomas programadas.
          </Text>
        ) : (
          dosis.map(d => <FilaDosis key={d.horarioId} dosis={d} mostrarHora />)
        )}
      </Tarjeta>

      <TituloSeccion
        texto="Últimos 7 días"
        derecha={
          <Text style={tipografia.bodyStrong}>
            {pct === null ? '—' : `${pct}%`}
          </Text>
        }
      />
      <Tarjeta>
        <View style={styles.semana}>
          {semana.map(s => {
            const d = dia[s.estado];
            return (
              <View
                key={s.fecha}
                style={styles.dia}
                accessible
                accessibilityLabel={`${fechaLarga(s.fecha)}: ${d.texto}, ${
                  s.resumen.tomadas
                } de ${s.resumen.total}`}
              >
                <View style={[styles.cuadro, { backgroundColor: d.fondo }]}>
                  {d.marca ? (
                    <Icono nombre={d.marca} tamano={18} color={d.color} />
                  ) : null}
                </View>
                <Text style={tipografia.caption}>{inicialDia(s.fecha)}</Text>
              </View>
            );
          })}
        </View>
        <Text style={tipografia.caption}>
          Verde: todo tomado · Ámbar: algo omitido · Rojo: tomas sin hacer ·
          Gris: sin datos de su móvil ese día
        </Text>
      </Tarjeta>

      <Text style={tipografia.caption}>
        Solo puedes ver esta información. {nombre} puede dejar de compartirla
        cuando quiera.
      </Text>
    </Pantalla>
  );
}

const useEstilos = crearEstilos(() => ({
  semana: { flexDirection: 'row', justifyContent: 'space-between' },
  dia: { alignItems: 'center', gap: spacing.xs, flex: 1 },
  cuadro: {
    width: 34,
    height: 34,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
