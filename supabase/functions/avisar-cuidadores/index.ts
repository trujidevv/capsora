// Función "avisar-cuidadores" (Supabase Edge Function, Deno).
// Cada 5 minutos la llama pg_cron (ver migración 003). Busca tomas sin confirmar
// y manda un aviso al móvil del cuidador con Firebase Cloud Messaging.
//
// Secretos necesarios (Supabase → Edge Functions → Secrets):
//   CRON_SECRET                → el valor de vault 'cron_avisos'
//   FIREBASE_SERVICE_ACCOUNT   → el JSON completo de la cuenta de servicio de Firebase
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los pone Supabase solo.
//
// Importante: desactivar "Enforce JWT verification" en esta función
// (la protege CRON_SECRET, no la sesión de un usuario).

import { createClient } from 'npm:@supabase/supabase-js@2';

interface Aviso {
  paciente: string;
  cuidador: string;
  nombre_paciente: string;
  fecha_toma: string; // YYYY-MM-DD
  hora_toma: string; // HH:MM:SS
  num_medicamentos: number;
  sin_senal: boolean;
}

interface CuentaServicio {
  project_id: string;
  client_email: string;
  private_key: string;
}

const CANAL_ANDROID = 'avisos-cuidador-v1';

// ─── Textos ──────────────────────────────────────────────────
// Sin nombres de medicamentos: el aviso puede verse en la pantalla de bloqueo.
export function textoAviso(a: Aviso): { title: string; body: string } {
  const nombre = a.nombre_paciente?.trim();
  const quien = nombre || 'Tu familiar';
  const hora = a.hora_toma.slice(0, 5);
  if (a.sin_senal) {
    return {
      title: `No podemos confirmar la toma de las ${hora}`,
      body: `El móvil de ${nombre || 'tu familiar'} no da señales o tiene los avisos desactivados. Puede que esté apagado o sin internet.`,
    };
  }
  const cuantas =
    a.num_medicamentos > 1 ? ` (${a.num_medicamentos} medicamentos)` : '';
  return {
    title: `${quien} no ha confirmado la toma de las ${hora}`,
    body: `Aún no ha marcado la medicación de las ${hora}${cuantas}. Quizá quieras llamarle.`,
  };
}

// ─── Acceso a Firebase (OAuth con la cuenta de servicio) ─────
let tokenCache: { valor: string; caduca: number } | null = null;

function base64url(datos: ArrayBuffer | Uint8Array | string): string {
  const bytes =
    typeof datos === 'string'
      ? new TextEncoder().encode(datos)
      : new Uint8Array(datos);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function tokenFirebase(cuenta: CuentaServicio): Promise<string> {
  const ahora = Math.floor(Date.now() / 1000);
  if (tokenCache && tokenCache.caduca - 60 > ahora) return tokenCache.valor;

  const cabecera = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const cuerpo = base64url(
    JSON.stringify({
      iss: cuenta.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: ahora,
      exp: ahora + 3600,
    }),
  );
  const pem = cuenta.private_key
    .replace(/-----[^-]+-----/g, '')
    .replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const clave = await crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const firma = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    clave,
    new TextEncoder().encode(`${cabecera}.${cuerpo}`),
  );
  const jwt = `${cabecera}.${cuerpo}.${base64url(firma)}`;

  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!r.ok) throw new Error(`OAuth de Firebase: ${r.status} ${await r.text()}`);
  const json = await r.json();
  tokenCache = { valor: json.access_token, caduca: ahora + json.expires_in };
  return json.access_token;
}

type ResultadoEnvio = 'ok' | 'token_invalido' | 'error';

async function enviarFcm(
  cuenta: CuentaServicio,
  token: string,
  aviso: Aviso,
): Promise<ResultadoEnvio> {
  const { title, body } = textoAviso(aviso);
  const r = await fetch(
    `https://fcm.googleapis.com/v1/projects/${cuenta.project_id}/messages:send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${await tokenFirebase(cuenta)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token,
          notification: { title, body },
          data: {
            tipo: aviso.sin_senal ? 'sin_senal' : 'toma_sin_confirmar',
            paciente: aviso.paciente,
            fecha: aviso.fecha_toma,
            hora: aviso.hora_toma.slice(0, 5),
          },
          android: {
            priority: 'HIGH',
            notification: { channel_id: CANAL_ANDROID },
          },
        },
      }),
    },
  );
  if (r.ok) return 'ok';
  const texto = await r.text();
  // El móvil desinstaló la app o el token caducó: se borra
  if (r.status === 404 || texto.includes('UNREGISTERED')) return 'token_invalido';
  if (r.status === 400 && texto.includes('registration token')) return 'token_invalido';
  console.error('FCM', r.status, texto);
  return 'error';
}

// ─── Punto de entrada ────────────────────────────────────────
Deno.serve(async req => {
  const secreto = Deno.env.get('CRON_SECRET');
  if (!secreto || req.headers.get('x-cron-secret') !== secreto) {
    return new Response('No autorizado', { status: 401 });
  }

  let cuenta: CuentaServicio;
  try {
    cuenta = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT') ?? '');
  } catch {
    return new Response('Falta FIREBASE_SERVICE_ACCOUNT', { status: 500 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  const { data, error } = await supabase.rpc('reclamar_avisos_cuidador');
  if (error) {
    console.error('reclamar_avisos_cuidador', error);
    return new Response(error.message, { status: 500 });
  }
  const avisos = (data ?? []) as Aviso[];

  let enviados = 0;
  let reintentar = 0;
  for (const aviso of avisos) {
    const { data: disp } = await supabase
      .from('dispositivos')
      .select('token')
      .eq('usuario_id', aviso.cuidador);
    const tokens = (disp ?? []).map(d => d.token as string);
    if (tokens.length === 0) continue; // el cuidador no tiene la app en ningún móvil

    let algunoOk = false;
    let huboError = false;
    for (const token of tokens) {
      const res = await enviarFcm(cuenta, token, aviso).catch(e => {
        console.error(e);
        return 'error' as const;
      });
      if (res === 'ok') algunoOk = true;
      else if (res === 'token_invalido')
        await supabase.from('dispositivos').delete().eq('token', token);
      else huboError = true;
    }

    if (algunoOk) enviados++;
    else if (huboError) {
      // Fallo temporal (Firebase caído, etc.): se reintenta en la próxima pasada
      await supabase.rpc('soltar_aviso_cuidador', {
        p_paciente: aviso.paciente,
        p_fecha: aviso.fecha_toma,
        p_hora: aviso.hora_toma,
      });
      reintentar++;
    }
  }

  return Response.json({ avisos: avisos.length, enviados, reintentar });
});
