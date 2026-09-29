"""
Genera las imágenes de la cápsula que sale a la derecha de cada aviso: una por
color de pastilla y una por cada pareja de colores (si en una misma hora tocan
pastillas de colores distintos, salen las dos).

    python scripts/generar-capsulas-aviso.py

Requisito: `pip install pillow`. Los colores salen de `pillColors` en
src/theme/theme.ts (si cambian allí, vuelve a ejecutar esto). Genera:
  - src/assets/avisos/capsula_<color>[_<color>].png (192×192)
  - src/notificaciones/capsulas.ts (color o pareja -> imagen)
"""

import itertools
import re
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw

RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / 'src' / 'assets' / 'avisos'
MAPA = RAIZ / 'src' / 'notificaciones' / 'capsulas.ts'

LADO = 192
ESCALA = 4  # se dibuja a 4× y se reduce: bordes suaves
FONDO = '#E4F1EF'  # primaryLight

tema = (RAIZ / 'src' / 'theme' / 'theme.ts').read_text(encoding='utf-8')
COLORES = re.findall(r"\{ id: '(\w+)', nombre: '[^']+', valor: '(#[0-9A-Fa-f]{6})' \}", tema)
assert len(COLORES) >= 2, 'no encuentro pillColors en theme.ts'


def rgb(hex_: str) -> tuple[int, int, int]:
    return tuple(int(hex_[i:i + 2], 16) for i in (1, 3, 5))


def mezclar(a, b, t):
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))


def capsula(color: str, largo: int, alto: int) -> Image.Image:
    """Cápsula horizontal de dos mitades (como el componente Capsula de la app)."""
    base = rgb(color)
    clara = mezclar(base, (255, 255, 255), 0.55)
    borde = mezclar(base, (0, 0, 0), 0.28)
    grosor = max(4, alto // 11)
    im = Image.new('RGBA', (largo, alto), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    mascara = Image.new('L', (largo, alto), 0)
    ImageDraw.Draw(mascara).rounded_rectangle([0, 0, largo - 1, alto - 1], alto // 2, fill=255)
    mitades = Image.new('RGBA', (largo, alto), clara + (255,))
    ImageDraw.Draw(mitades).rectangle([0, 0, largo // 2, alto], fill=base + (255,))
    im.paste(mitades, (0, 0), mascara)
    d.rounded_rectangle([0, 0, largo - 1, alto - 1], alto // 2, outline=borde + (255,), width=grosor)
    d.line([(largo // 2, grosor), (largo // 2, alto - grosor)], fill=borde + (255,), width=max(2, grosor // 2))
    return im


def pegar(lienzo: Image.Image, im: Image.Image, cx: int, cy: int, angulo: float):
    girada = im.rotate(angulo, resample=Image.BICUBIC, expand=True)
    lienzo.alpha_composite(girada, (cx - girada.width // 2, cy - girada.height // 2))


def imagen(colores: list[str]) -> Image.Image:
    lado = LADO * ESCALA
    lienzo = Image.new('RGBA', (lado, lado), (0, 0, 0, 0))
    ImageDraw.Draw(lienzo).ellipse([0, 0, lado - 1, lado - 1], fill=rgb(FONDO) + (255,))
    if len(colores) == 1:
        pegar(lienzo, capsula(colores[0], int(lado * 0.66), int(lado * 0.28)), lado // 2, lado // 2, 40)
    else:
        largo, alto = int(lado * 0.52), int(lado * 0.22)
        pegar(lienzo, capsula(colores[0], largo, alto), int(lado * 0.40), int(lado * 0.40), 40)
        pegar(lienzo, capsula(colores[1], largo, alto), int(lado * 0.60), int(lado * 0.62), 40)
    return lienzo.resize((LADO, LADO), Image.LANCZOS)


SALIDA.mkdir(parents=True, exist_ok=True)
for viejo in SALIDA.glob('capsula_*.png'):
    viejo.unlink()

grupos = [[c] for c in COLORES] + [list(p) for p in itertools.combinations(COLORES, 2)]
lineas = []
for grupo in grupos:
    clave = '_'.join(i for i, _ in grupo)
    imagen([v for _, v in grupo]).save(SALIDA / f'capsula_{clave}.png', optimize=True)
    lineas.append(f"  {clave}: require('../assets/avisos/capsula_{clave}.png'),")

orden = ', '.join(f"'{v.upper()}'" for _, v in COLORES)
ids = ', '.join(f"'{i}'" for i, _ in COLORES)
MAPA.write_text(
    f"""// Generado por scripts/generar-capsulas-aviso.py: no editar a mano.

/** Colores de pastilla (de pillColors) en orden, y su id. */
const VALORES = [{orden}];
const IDS = [{ids}] as const;

const IMAGENES: Record<string, number> = {{
{chr(10).join(lineas)}
}};

/**
 * Imagen de la cápsula para el aviso: la de un color o la de dos. Un color que
 * no es de la paleta (o sin color) se pinta como el primero, blanco.
 */
export function imagenCapsulas(colores: string[]): number {{
  const indices = [
    ...new Set(
      (colores.length ? colores : ['']).map(c =>
        Math.max(0, VALORES.indexOf(c.toUpperCase())),
      ),
    ),
  ]
    .slice(0, 2)
    .sort((a, b) => a - b);
  return IMAGENES[indices.map(i => IDS[i]).join('_')];
}}
""",
    encoding='utf-8',
)
# Mismo formato que el resto del código
subprocess.run(f'npx prettier --write "{MAPA}"', shell=True, cwd=RAIZ, check=True, capture_output=True)
print(f'{len(grupos)} imágenes en src/assets/avisos/ y src/notificaciones/capsulas.ts')
