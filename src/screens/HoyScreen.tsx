import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Icono from '../components/Icono';
import Aviso from '../components/Aviso';
import Boton from '../components/Boton';
import LineaDelDia from '../components/LineaDelDia';
import Pantalla from '../components/Pantalla';
import Tarjeta from '../components/Tarjeta';
import TarjetaAhora from '../components/TarjetaAhora';
import { Cargando, EstadoVacio } from '../components/Varios';
import { useDatos } from '../lib/DatosContext';
import { useFiabilidad } from '../lib/FiabilidadContext';
import { useAhora } from '../lib/useAhora';
import { useMiCuidador } from '../lib/useMiCuidador';
import { agruparPorHora, dosisDelDia, resumir } from '../logic/dosis';
import { capitalizar, fechaLarga, hoy, sumarDias } from '../logic/fechas';
import { fraseDelDia, saludoSegunHora, tarjetaDeHoy } from '../logic/hoy';
import { avisosFuncionan } from '../notificaciones/fiabilidad';
import type { PantallaTab } from '../navigation/tipos';
import { radii, spacing } from '../theme/theme';
import { crearEstilos, useTema } from '../lib/TemaContext';

export default function HoyScreen({ navigation }: PantallaTab<'Hoy'>) {
  const { colores, tipografia } = useTema();
  const styles = useEstilos();
  const datos = useDatos();
  const {
    medicamentos,
    registros,
    nombre,
    cargando,
    sinConexion,
    error,
    recargar,
  } = datos;
  const { estado: fiabilidad } = useFiabilidad();
  const ahora = useAhora();
  const fecha = hoy(ahora);
  const [refrescando, setRefrescando] = useState(false);

  const dosis = useMemo(
    () => dosisDelDia(medicamentos, registros, fecha, ahora),
    [medicamentos, registros, fecha, ahora],
  );
  const manana = useMemo(() => {
    const d = dosisDelDia(medicamentos, registros, sumarDias(fecha, 1), ahora);
    return agruparPorHora(d)[0] ?? null;
  }, [medicamentos, registros, fecha, ahora]);
  const cuidador = useMiCuidador();
  const resumen = resumir(dosis);
  const grupos = agruparPorHora(dosis);
  const hechas = resumen.tomadas + resumen.omitidas;
  const tarjeta = tarjetaDeHoy(dosis, ahora);
  const saludo = saludoSegunHora(ahora);
  const frase = fraseDelDia(dosis, ahora);

  const refrescar = useCallback(async () => {
    setRefrescando(true);
    await recargar();
    setRefrescando(false);
  }, [recargar]);

  if (cargando && medicamentos.length === 0)
    return <Cargando texto="Cargando tus medicamentos…" />;

  const irAAnadir = () => navigation.navigate('FormularioMedicamento');
  const irAFiabilidad = () => navigation.navigate('Fiabilidad');
  const irAFamilia = () => navigation.navigate('Familia');

  return (
    <Pantalla edges={['top']} onRefrescar={refrescar} refrescando={refrescando}>
      <View style={styles.saludo}>
        <Text style={tipografia.bodySecondary}>
          {capitalizar(fechaLarga(fecha))}
        </Text>
        <Text style={tipografia.title} accessibilityRole="header">
          {saludo}
          {nombre ? `, ${nombre}` : ''}
        </Text>
        {frase ? (
          <Text style={tipografia.body}>
            {frase.map((t, i) => (
              <Text key={i} style={t.fuerte ? styles.fuerte : undefined}>
                {t.texto}
              </Text>
            ))}
          </Text>
        ) : null}
      </View>

      {sinConexion ? (
        <Aviso
          tipo="info"
          titulo="Sin conexión"
          texto="Ves los últimos datos guardados. Los avisos siguen funcionando y lo que marques se enviará al volver internet."
        />
      ) : null}
      {error ? (
        <Aviso
          tipo="peligro"
          titulo="No se han podido cargar tus datos"
          texto={error}
          accion={{ titulo: 'Reintentar', onPress: refrescar }}
        />
      ) : null}

      {fiabilidad && medicamentos.length > 0 && !avisosFuncionan(fiabilidad) ? (
        <Aviso
          tipo="peligro"
          titulo="Tus avisos no van a sonar"
          texto="Falta un permiso en el móvil. Arreglarlo lleva un minuto."
          accion={{ titulo: 'Arreglarlo ahora', onPress: irAFiabilidad }}
        />
      ) : fiabilidad &&
        medicamentos.length > 0 &&
        fiabilidad.bateriaOptimizada ? (
        <Aviso
          tipo="alerta"
          titulo="Tus avisos podrían retrasarse"
          texto="El ahorro de batería puede dormir la app. Te enseñamos a evitarlo."
          accion={{ titulo: 'Revisar', onPress: irAFiabilidad }}
        />
      ) : null}

      {medicamentos.length === 0 && error ? null : medicamentos.length === 0 ? (
        <Tarjeta>
          <EstadoVacio
            icono="pill"
            titulo="Aún no tienes medicamentos"
            texto="Añade el primero y te avisaremos a su hora. ¿Cuidas de alguien? Ve a la pestaña Familia."
            accion={{
              titulo: 'Añadir medicamento',
              icono: 'plus',
              onPress: irAAnadir,
            }}
          />
        </Tarjeta>
      ) : (
        <>
          <TarjetaAhora
            tarjeta={tarjeta}
            ahora={ahora}
            manana={manana}
            todoTomado={resumen.tomadas === resumen.total}
            acciones={datos}
          />

          {grupos.length > 0 ? (
            <LineaDelDia
              grupos={grupos}
              ahora={ahora}
              manana={manana}
              hechas={hechas}
              total={resumen.total}
              acciones={datos}
            />
          ) : null}

          {cuidador ? (
            <Pressable
              onPress={irAFamilia}
              accessibilityRole="button"
              accessibilityHint="Abre Familia"
              style={({ pressed }) => [
                styles.familia,
                pressed && styles.pulsada,
              ]}
            >
              <Icono
                nombre="users-three"
                tamano={26}
                color={colores.primaryDark}
              />
              <Text style={[tipografia.bodySecondary, styles.textoFamilia]}>
                <Text style={styles.fuerte}>{cuidador}</Text> ve cómo vas. Solo
                le avisamos si una toma se queda sin marcar.
              </Text>
            </Pressable>
          ) : null}

          <Boton
            variante="secundario"
            titulo="Añadir medicamento"
            icono="plus"
            onPress={irAAnadir}
          />
        </>
      )}
    </Pantalla>
  );
}

const useEstilos = crearEstilos(colores => ({
  saludo: { gap: spacing.xs },
  fuerte: { fontWeight: '700', color: colores.textPrimary },
  familia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colores.surface,
    borderWidth: 1,
    borderColor: colores.border,
  },
  pulsada: { opacity: 0.7 },
  textoFamilia: { flex: 1 },
}));
