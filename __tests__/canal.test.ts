import notifee from 'react-native-notify-kit';
import { asegurarCanal, CANAL_TOMAS } from '../src/notificaciones/canal';

const n = notifee as unknown as Record<string, jest.Mock>;

test('crea el canal con el sonido de Capsora y borra el canal viejo', async () => {
  await asegurarCanal();
  expect(n.createChannel).toHaveBeenCalledWith(
    expect.objectContaining({ id: CANAL_TOMAS, sound: 'capsora_aviso' }),
  );
  expect(n.deleteChannel).toHaveBeenCalledWith('tomas-v1');

  // Solo una vez por arranque
  n.createChannel.mockClear();
  await asegurarCanal();
  expect(n.createChannel).not.toHaveBeenCalled();
});
