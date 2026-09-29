import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import Icono from '../components/Icono';
import Aviso from '../components/Aviso';
import Boton from '../components/Boton';
import Pantalla from '../components/Pantalla';
import Capsula from '../components/Capsula';
import Tarjeta from '../components/Tarjeta';
import { Cargando, EstadoVacio } from '../components/Varios';
import { useDatos } from '../lib/DatosContext';
import { compararHoras } from '../logic/fechas';
import type { PantallaTab } from '../navigation/tipos';
import { radii, spacing, FUENTE } from '../theme/theme';
import { crearEstilos, useTema } from '../lib/TemaContext';

export default function MedicamentosScreen({
  navigation,
}: PantallaTab<'Medicamentos'>) {
  const { colores, tipografia } = useTema();
  const styles = useEstilos();
  const { medicamentos, cargando, error, recargar } = useDatos();
  const [refrescando, setRefrescando] = useState(false);

  const refrescar = useCallback(async () => {
    setRefrescando(true);
    await recargar();
    setRefrescando(false);
  }, [recargar]);

  if (cargando && medicamentos.length === 0) return <Cargando />;

  const anadir = () => navigation.navigate('FormularioMedicamento');

  return (
    <Pantalla onRefrescar={refrescar} refrescando={refrescando}>
      {error ? (
        <Aviso
          tipo="peligro"
          titulo="No se han podido cargar"
          texto={error}
          accion={{ titulo: 'Reintentar', onPress: refrescar }}
        />
      ) : null}

      <Boton titulo="Añadir medicamento" icono="plus" onPress={anadir} />

      {medicamentos.length === 0 ? (
        <EstadoVacio
          icono="list-checks"
          titulo="Tu lista está vacía"
          texto="Añade cada medicamento con sus horas. Puedes cambiarlo cuando quieras."
        />
      ) : (
        medicamentos.map(m => {
          const horas = m.horarios
            .filter(h => h.activo)
            .map(h => h.hora)
            .sort(compararHoras);
          return (
            <Tarjeta
              key={m.id}
              onPress={() =>
                navigation.navigate('FormularioMedicamento', { medicamento: m })
              }
              accessibilityLabel={`${m.nombre}. ${horas.length} ${
                horas.length === 1 ? 'toma' : 'tomas'
              } al día. Pulsa para editar.`}
            >
              <View style={styles.fila}>
                <Capsula color={m.color} tamano={40} />
                <View style={styles.textos}>
                  <Text style={tipografia.subtitle}>{m.nombre}</Text>
                  {m.dosis ? (
                    <Text style={tipografia.bodySecondary}>{m.dosis}</Text>
                  ) : null}
                </View>
                <Icono nombre="caret-right" color={colores.textSecondary} />
              </View>
              <View style={styles.horas}>
                {horas.length === 0 ? (
                  <Text style={tipografia.caption}>
                    Sin horas: no recibirás avisos
                  </Text>
                ) : (
                  horas.map(h => (
                    <View key={h} style={styles.hora}>
                      <Icono
                        nombre="clock"
                        tamano={18}
                        color={colores.primaryDark}
                      />
                      <Text style={styles.textoHora}>{h}</Text>
                    </View>
                  ))
                )}
              </View>
            </Tarjeta>
          );
        })
      )}
    </Pantalla>
  );
}

const useEstilos = crearEstilos(colores => ({
  fila: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  textos: { flex: 1, gap: 2 },
  horas: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  hora: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colores.primaryLight,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  textoHora: {
    fontFamily: FUENTE,
    fontSize: 16,
    fontWeight: '600',
    color: colores.primaryDark,
  },
}));
