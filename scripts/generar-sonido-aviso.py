"""
Genera el sonido de los avisos de las tomas: «marimba grave» (sol, si, re), hecho
desde cero para Capsora (sin licencias de terceros).

    python scripts/generar-sonido-aviso.py

Requisitos: `pip install numpy imageio-ffmpeg`. Genera
android/app/src/main/res/raw/capsora_aviso.ogg.

Si cambias el sonido, Android NO lo aplica a un canal que ya existe: hay que subir
la versión del canal en src/notificaciones/canal.ts (CANAL_TOMAS) y añadir la
anterior a CANALES_VIEJOS.
"""

import subprocess
import tempfile
import wave
from pathlib import Path

import imageio_ffmpeg
import numpy as np

RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / 'android' / 'app' / 'src' / 'main' / 'res' / 'raw' / 'capsora_aviso.ogg'
SR = 44100
rng = np.random.default_rng(7)


def golpe(dur=0.012, color=6):
    """Golpe de baqueta: ruido muy corto y suavizado."""
    n = int(SR * dur)
    ruido = np.convolve(rng.standard_normal(n), np.ones(color) / color, mode='same')
    return ruido * np.exp(-np.arange(n) / SR * 400)


def marimba(f, dur, caida):
    """Fundamental con resonador, 4.º armónico (~2 octavas) y un toque del 10.º, más el golpe."""
    t = np.arange(int(SR * dur)) / SR
    s = (np.sin(2 * np.pi * f * t) * np.exp(-t * caida)
         + 0.28 * np.sin(2 * np.pi * f * 3.93 * t) * np.exp(-t * caida * 4)
         + 0.07 * np.sin(2 * np.pi * f * 9.2 * t) * np.exp(-t * caida * 10))
    s *= np.minimum(1, t / 0.002)
    g = golpe()
    s[: len(g)] += 0.18 * g
    return s


def mezclar(pistas, dur):
    out = np.zeros(int(SR * dur))
    for inicio, senal, vol in pistas:
        i = int(inicio * SR)
        fin = min(len(out), i + len(senal))
        out[i:fin] += vol * senal[: fin - i]
    cola = int(0.08 * SR)
    out[-cola:] *= np.linspace(1, 0, cola)  # final suave
    return out / np.max(np.abs(out)) * 0.89  # -1 dBFS


# Sol 4, si 4 y re 5: graves y cálidas, se oyen bien aunque se pierda oído en los agudos
sonido = mezclar([
    (0, marimba(392.00, 1.4, 3.5), 1.0),
    (0.16, marimba(493.88, 1.4, 3.5), 0.95),
    (0.32, marimba(587.33, 1.6, 3.0), 1.0),
], 1.9)

with tempfile.TemporaryDirectory() as tmp:
    wav = Path(tmp) / 'aviso.wav'
    with wave.open(str(wav), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((sonido * 32767).astype(np.int16).tobytes())
    subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), '-y', '-loglevel', 'error', '-i', str(wav),
                    '-c:a', 'libvorbis', '-q:a', '5', str(SALIDA)], check=True)
print(f'Sonido en {SALIDA.relative_to(RAIZ)}')
