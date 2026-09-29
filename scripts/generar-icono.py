"""
Genera el icono de Capsora: cápsula blanca y naranja sobre el verde de la marca.

    python scripts/generar-icono.py

Requisito: `pip install pillow`. Después hay que recompilar la app.

Genera:
  - Icono adaptativo (Android 8+): res/values/ic_launcher_background.xml,
    res/drawable/ic_launcher_foreground.xml y ic_launcher_monochrome.xml
    (iconos temáticos de Android 13) y res/mipmap-anydpi-v26/ic_launcher*.xml
  - PNG para Android 7 (minSdk 24): res/mipmap-*/ic_launcher.png y _round.png
  - Icono de la ficha de Google Play: tienda/icono-512.png

Todas las medidas salen de las mismas constantes, así que el icono se ve igual
en todos los formatos.
"""

from pathlib import Path

from PIL import Image, ImageDraw

FONDO = '#2E6F6B'  # primary de src/theme/theme.ts
MITAD_1 = '#FFFFFF'
MITAD_2 = '#E88D4F'  # accent

# Icono adaptativo: lienzo de 108 dp, de los que se ven los 72 centrales.
# La cápsula mide LARGO × ALTO dp, centrada e inclinada 45°.
LIENZO, VISIBLE = 108, 72
LARGO, ALTO = 42, 17.5

RAIZ = Path(__file__).resolve().parent.parent
RES = RAIZ / 'android' / 'app' / 'src' / 'main' / 'res'
TIENDA = RAIZ / 'tienda'
DENSIDADES = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}


def mitades_svg() -> tuple[str, str]:
    """Rutas (pathData) de las dos mitades en el lienzo de 108 dp, sin inclinar."""
    c = LIENZO / 2
    x0, x1 = c - LARGO / 2, c + LARGO / 2
    y0, y1 = c - ALTO / 2, c + ALTO / 2
    r = ALTO / 2
    izq = f'M{c:g},{y0:g} L{x0 + r:g},{y0:g} A{r:g},{r:g} 0 0,0 {x0 + r:g},{y1:g} L{c:g},{y1:g} Z'
    der = f'M{c:g},{y0:g} L{x1 - r:g},{y0:g} A{r:g},{r:g} 0 0,1 {x1 - r:g},{y1:g} L{c:g},{y1:g} Z'
    return izq, der


def vector(rellenos: tuple[str, str], hueco: float = 0) -> str:
    """Vector drawable con la cápsula. `hueco` separa las dos mitades (monocromo)."""
    izq, der = mitades_svg()
    c = LIENZO / 2
    return (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<!-- Generado por scripts/generar-icono.py -->\n'
        '<vector xmlns:android="http://schemas.android.com/apk/res/android"\n'
        f'    android:width="{LIENZO}dp"\n'
        f'    android:height="{LIENZO}dp"\n'
        f'    android:viewportWidth="{LIENZO}"\n'
        f'    android:viewportHeight="{LIENZO}">\n'
        f'    <group android:rotation="-45" android:pivotX="{c:g}" android:pivotY="{c:g}">\n'
        f'        <group android:translateX="{-hueco / 2:g}">\n'
        f'            <path android:fillColor="{rellenos[0]}" android:pathData="{izq}" />\n'
        '        </group>\n'
        f'        <group android:translateX="{hueco / 2:g}">\n'
        f'            <path android:fillColor="{rellenos[1]}" android:pathData="{der}" />\n'
        '        </group>\n'
        '    </group>\n'
        '</vector>\n'
    )


def adaptativo() -> str:
    return (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<!-- Generado por scripts/generar-icono.py -->\n'
        '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
        '    <background android:drawable="@color/ic_launcher_background" />\n'
        '    <foreground android:drawable="@drawable/ic_launcher_foreground" />\n'
        '    <monochrome android:drawable="@drawable/ic_launcher_monochrome" />\n'
        '</adaptive-icon>\n'
    )


def png(tam: int, forma: str) -> Image.Image:
    """PNG del icono (lo que se ve: los 72 dp centrales del adaptativo)."""
    esc = 4
    T = tam * esc
    base = Image.new('RGBA', (T, T), FONDO)
    capa = Image.new('RGBA', (T, T), (0, 0, 0, 0))
    d = ImageDraw.Draw(capa)
    L, H = LARGO / VISIBLE * T, ALTO / VISIBLE * T
    x0, x1 = T / 2 - L / 2, T / 2 + L / 2
    y0, y1 = T / 2 - H / 2, T / 2 + H / 2
    r = H / 2
    d.rectangle([x0 + r, y0, T / 2, y1], fill=MITAD_1)
    d.pieslice([x0, y0, x0 + H, y1], 90, 270, fill=MITAD_1)
    d.rectangle([T / 2, y0, x1 - r, y1], fill=MITAD_2)
    d.pieslice([x1 - H, y0, x1, y1], 270, 90, fill=MITAD_2)
    base.alpha_composite(capa.rotate(45, resample=Image.BICUBIC))
    if forma != 'completo':
        mascara = Image.new('L', (T, T), 0)
        dm = ImageDraw.Draw(mascara)
        if forma == 'circulo':
            dm.ellipse([0, 0, T - 1, T - 1], fill=255)
        else:
            dm.rounded_rectangle([0, 0, T - 1, T - 1], radius=T * 0.18, fill=255)
        recortado = Image.new('RGBA', (T, T), (0, 0, 0, 0))
        recortado.paste(base, (0, 0), mascara)
        base = recortado
    return base.resize((tam, tam), Image.LANCZOS)


def escribir(ruta: Path, texto: str) -> None:
    ruta.parent.mkdir(parents=True, exist_ok=True)
    ruta.write_text(texto, encoding='utf-8', newline='\n')


def main() -> None:
    escribir(
        RES / 'values' / 'ic_launcher_background.xml',
        '<?xml version="1.0" encoding="utf-8"?>\n<!-- Generado por scripts/generar-icono.py -->\n'
        f'<resources>\n    <color name="ic_launcher_background">{FONDO}</color>\n</resources>\n',
    )
    escribir(RES / 'drawable' / 'ic_launcher_foreground.xml', vector((MITAD_1, MITAD_2)))
    # Monocromo: Android lo tiñe con el color del tema; un hueco separa las mitades
    escribir(RES / 'drawable' / 'ic_launcher_monochrome.xml', vector(('#FFFFFFFF', '#FFFFFFFF'), hueco=2.5))
    for nombre in ('ic_launcher', 'ic_launcher_round'):
        escribir(RES / 'mipmap-anydpi-v26' / f'{nombre}.xml', adaptativo())
    for densidad, tam in DENSIDADES.items():
        carpeta = RES / f'mipmap-{densidad}'
        carpeta.mkdir(parents=True, exist_ok=True)
        png(tam, 'cuadrado').save(carpeta / 'ic_launcher.png', optimize=True)
        png(tam, 'circulo').save(carpeta / 'ic_launcher_round.png', optimize=True)
    TIENDA.mkdir(exist_ok=True)
    # Google Play aplica su propia máscara: el icono de la ficha va a sangre
    png(512, 'completo').convert('RGB').save(TIENDA / 'icono-512.png', optimize=True)
    print('Icono generado: adaptativo, monocromo, PNG de 5 densidades y tienda/icono-512.png')


if __name__ == '__main__':
    main()
