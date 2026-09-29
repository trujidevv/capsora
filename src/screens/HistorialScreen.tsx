import React, { useCallback, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import Calendario from '../components/Calendario';
import FilaDosis from '../components/FilaDosis';
import Pantalla from '../components/Pantalla';
import Tarjeta from '../components/Tarjeta';
import { Cargando, EstadoVacio, TituloSeccion } from '../components/Varios';
import { opcionesDosis } from '../lib/accionesDosis';
import { DIAS_HISTORIAL, useDatos } from '../lib/DatosContext';
import { useAhora } from '../lib/useAhora';
import { adherencia, dosisDelDia, resumir, semaforo } from '../logic/dosis';
import {
  capitalizar,
  fechaLarga,
  hoy,
  rangoFechas,
  sumarDias,
  type Fecha,
} from '../logic/fechas';
import type { PantallaTab } from '../navigation/tipos';
import { spacing } from '../theme/theme';
import { crearEstilos, useTema } from '../lib/TemaContext';

function Porcentaje({ valor, texto }: { valor: number | null; texto: string }) {
  const { colores, tipografia } = useTema();
  const styles = useEstilos();
  const color =
    valor === null
      ? colores.textSecondary
      : valor >= 90
      ? colores.success
      : valor >= 70
      ? colores.warningDark
      : colores.danger;
  return (
    <View style={styles.porcentaje}>
      <Text style={[tipografia.big, { color }]}>
        {valor === null ? '—' : `${valor}%`}
      </Text>
      <Text style={tipografia.bodySecondary}>{texto}</Text>
    </View>
  );
}

export default function HistorialScreen(_props: PantallaTab<'Historial'>) {
  const { tipografia } = useTema();
  const styles = useEstilos();
  const datos = useDatos();
  const { medicamentos, registros, cargando, recargar } = datos;
  const ahora = useAhora();
  const fechaHoy = hoy(ahora);
  const [seleccionada, setSeleccionada] = useState<Fecha>(fechaHoy);
  const [refrescando, setRefrescando] = useState(false);

  const resumenPorDia = useMemo(() => {
    const mapa = new Map<Fecha, ReturnType<typeof resumir>>();
    for (const f of rangoFechas(
      sumarDias(fechaHoy, -DIAS_HISTORIAL),
      fechaHoy,
    )) {
      mapa.set(f, resumir(dosisDelDia(medicamentos, registros, f, ahora)));
    }
    return mapa;
  }, [medicamentos, registros, fechaHoy, ahora]);

  const ultimos = (dias: number) =>
    rangoFechas(sumarDias(fechaHoy, -(dias - 1)), fechaHoy)
      .map(f => resumenPorDia.get(f)!)
      .filter(Boolean);

  const dosisSeleccionada = useMemo(
    () => dosisDelDia(medicamentos, registros, seleccionada, ahora),
    [medicamentos, registros, seleccionada, ahora],
  );

  const refrescar = useCallback(async () => {
    setRefrescando(true);
    await recargar();
    setRefrescando(false);
  }, [recargar]);

  if (cargando && medicamentos.length === 0) return <Cargando />;
  if (medicamentos.length === 0) {
    return (
      <Pantalla>
        <EstadoVacio
          icono="calendar-check"
          titulo="Aún no hay historial"
          texto="Cuando añadas medicamentos y marques tomas, aquí verás cómo vas."
        />
      </Pantalla>
    );
  }

  const editable = seleccionada >= sumarDias(fechaHoy, -7);

  return (
    <Pantalla onRefrescar={refrescar} refrescando={refrescando}>
      <Tarjeta>
        <Text style={tipografia.bodyStrong}>Tomas hechas</Text>
        <View style={styles.porcentajes}>
          <Porcentaje valor={adherencia(ultimos(7))} texto="últimos 7 días" />
          <Porcentaje valor={adherencia(ultimos(30))} texto="últimos 30 días" />
        </View>
      </Tarjeta>

      <Tarjeta>
        <Calendario
          hoy={fechaHoy}
          semanas={5}
          estadoDe={f => {
            const r = resumenPorDia.get(f);
            return r ? semaforo(r) : 'neutro';
          }}
          seleccionada={seleccionada}
          onSeleccionar={setSeleccionada}
        />
      </Tarjeta>

      <TituloSeccion
        texto={
          seleccionada === fechaHoy
            ? 'Hoy'
            : capitalizar(fechaLarga(seleccionada))
        }
      />
      <Tarjeta>
        {dosisSeleccionada.length === 0 ? (
          <Text style={tipografia.bodySecondary}>
            Ese día no había tomas programadas.
          </Text>
        ) : (
          dosisSeleccionada.map(d => (
            <FilaDosis
              key={d.horarioId}
              dosis={d}
              mostrarHora
              onPress={editable ? () => opcionesDosis(datos, d) : undefined}
            />
          ))
        )}
        {editable &&
        dosisSeleccionada.length > 0 &&
        seleccionada !== fechaHoy ? (
          <Text style={tipografia.caption}>
            ¿Se te olvidó marcar algo? Pulsa la toma para corregirla.
          </Text>
        ) : null}
      </Tarjeta>
    </Pantalla>
  );
}

const useEstilos = crearEstilos(() => ({
  porcentajes: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.sm,
  },
  porcentaje: { alignItems: 'center' },
}));
