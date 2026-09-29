"""
Genera las capturas de la ficha de Google Play (1080×1920, PNG sin transparencia)
y el gráfico destacado (1024×500) a partir de capturas reales de la app.

    python scripts/generar-capturas-tienda.py

Requisito: `pip install pillow`. Las capturas originales (1080×2400, emulador, cuenta
de demostración «Carmen» y su familiar «Luis») están en tienda/capturas/originales/.
Reglas de Google: nada de llamadas a la acción («descarga ya») ni textos con fecha.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

RAIZ = Path(__file__).resolve().parent.parent
ORIGINALES = RAIZ / 'tienda' / 'capturas' / 'originales'
SALIDA = RAIZ / 'tienda' / 'capturas'
FUENTE = RAIZ / 'android' / 'app' / 'src' / 'main' / 'res' / 'font'

VERDE = (46, 111, 107)       # primary
VERDE_OSCURO = (31, 79, 76)  # primaryDark
MENTA = (228, 241, 239)      # primaryLight
NARANJA = (232, 141, 79)     # accent
MARCO = (31, 35, 32)

ANCHO, ALTO = 1080, 1920

CAPTURAS = [
    ('1-hoy', 'Tus pastillas,\na su hora', 'hoy.png'),
    ('2-aviso', 'Márcala desde\nel propio aviso', None),
    ('3-familia', 'Tu familia lo ve\nsin tener que llamarte', 'familiar.png'),
    ('4-colores', 'Cada pastilla\ncon su color', 'medicamentos.png'),
    ('5-sin-marcar', 'Te recuerda\nlo que falta', 'hoy-sin-marcar.png'),
]


def letra(peso: int, tam: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FUENTE / f'lexend_{peso}.ttf'), tam)


def redondear(im: Image.Image, radio: int) -> Image.Image:
    mascara = Image.new('L', im.size, 0)
    ImageDraw.Draw(mascara).rounded_rectangle([0, 0, im.width - 1, im.height - 1], radio, fill=255)
    out = Image.new('RGBA', im.size, (0, 0, 0, 0))
    out.paste(im, (0, 0), mascara)
    return out


def movil(captura: Image.Image, ancho: int) -> Image.Image:
    """La captura dentro de un marco de móvil sencillo, con sombra."""
    borde = int(ancho * 0.035)
    pantalla = captura.convert('RGB').resize(
        (ancho - 2 * borde, int((ancho - 2 * borde) * captura.height / captura.width)), Image.LANCZOS
    )
    radio_ext = int(ancho * 0.13)
    cuerpo = Image.new('RGBA', (ancho, pantalla.height + 2 * borde), (0, 0, 0, 0))
    ImageDraw.Draw(cuerpo).rounded_rectangle([0, 0, cuerpo.width - 1, cuerpo.height - 1], radio_ext, fill=MARCO)
    cuerpo.alpha_composite(redondear(pantalla, radio_ext - borde), (borde, borde))
    return cuerpo


def sombra(capa: Image.Image, desenfoque: int = 40, opacidad: int = 90) -> Image.Image:
    s = Image.new('RGBA', (capa.width + 4 * desenfoque, capa.height + 4 * desenfoque), (0, 0, 0, 0))
    alfa = capa.split()[3].point(lambda a: opacidad if a else 0)
    s.paste((0, 0, 0, 255), (2 * desenfoque, 2 * desenfoque), alfa)
    return s.filter(ImageFilter.GaussianBlur(desenfoque))


def titular(lienzo: Image.Image, texto: str, y: int = 120) -> int:
    d = ImageDraw.Draw(lienzo)
    f = letra(700, 84)
    for linea in texto.split('\n'):
        w = d.textlength(linea, font=f)
        d.text(((ANCHO - w) / 2, y), linea, font=f, fill='white')
        y += 104
    return y


def pegar_con_sombra(lienzo: Image.Image, capa: Image.Image, x: int, y: int) -> None:
    s = sombra(capa)
    lienzo.alpha_composite(s, (x - 80, y - 60))
    lienzo.alpha_composite(capa, (x, y))


def captura_movil(nombre: str, texto: str, archivo: str) -> None:
    lienzo = Image.new('RGBA', (ANCHO, ALTO), VERDE)
    fin = titular(lienzo, texto)
    tel = movil(Image.open(ORIGINALES / archivo), 760)
    # El móvil sale por abajo: se ve lo importante de la pantalla, como en muchas fichas
    pegar_con_sombra(lienzo, tel, (ANCHO - tel.width) // 2, fin + 70)
    lienzo.convert('RGB').save(SALIDA / f'{nombre}.png', optimize=True)


def captura_aviso(nombre: str, texto: str) -> None:
    lienzo = Image.new('RGBA', (ANCHO, ALTO), VERDE)
    fin = titular(lienzo, texto)
    # Debajo, la pantalla Hoy con esas dos tomas ya marcadas
    tel = movil(Image.open(ORIGINALES / 'hoy.png'), 700)
    y_tel = fin + 330
    pegar_con_sombra(lienzo, tel, (ANCHO - tel.width) // 2, y_tel)
    # Encima, el aviso real (recortado de la barra de notificaciones)
    aviso = Image.open(ORIGINALES / 'aviso.png').convert('RGB').crop((42, 619, 1038, 1082))
    aviso = redondear(aviso.resize((960, int(960 * aviso.height / aviso.width)), Image.LANCZOS), 56)
    pegar_con_sombra(lienzo, aviso, (ANCHO - aviso.width) // 2, fin + 60)
    lienzo.convert('RGB').save(SALIDA / f'{nombre}.png', optimize=True)


def capsula(tam: int) -> Image.Image:
    """Cápsula blanca y naranja inclinada, como el icono."""
    esc = 4
    T = tam * esc
    capa = Image.new('RGBA', (T, T), (0, 0, 0, 0))
    d = ImageDraw.Draw(capa)
    L, H = T * 0.9, T * 0.37
    x0, x1, y0, y1, r = T / 2 - L / 2, T / 2 + L / 2, T / 2 - H / 2, T / 2 + H / 2, H / 2
    d.rectangle([x0 + r, y0, T / 2, y1], fill='white')
    d.pieslice([x0, y0, x0 + H, y1], 90, 270, fill='white')
    d.rectangle([T / 2, y0, x1 - r, y1], fill=NARANJA)
    d.pieslice([x1 - H, y0, x1, y1], 270, 90, fill=NARANJA)
    return capa.rotate(45, resample=Image.BICUBIC).resize((tam, tam), Image.LANCZOS)


def grafico_destacado() -> None:
    lienzo = Image.new('RGBA', (1024, 500), VERDE)
    d = ImageDraw.Draw(lienzo)
    d.ellipse([70, 90, 390, 410], fill=VERDE_OSCURO)
    lienzo.alpha_composite(capsula(250), (105, 125))
    d.text((440, 150), 'Capsora', font=letra(700, 104), fill='white')
    d.text((446, 285), 'Tus pastillas, a su hora.', font=letra(400, 40), fill=MENTA)
    d.text((446, 338), 'Y tu familia, tranquila.', font=letra(400, 40), fill=MENTA)
    lienzo.convert('RGB').save(RAIZ / 'tienda' / 'grafico-destacado.png', optimize=True)


def main() -> None:
    SALIDA.mkdir(parents=True, exist_ok=True)
    for nombre, texto, archivo in CAPTURAS:
        if archivo:
            captura_movil(nombre, texto, archivo)
        else:
            captura_aviso(nombre, texto)
    grafico_destacado()
    print(f'{len(CAPTURAS)} capturas en tienda/capturas/ y tienda/grafico-destacado.png')


if __name__ == '__main__':
    main()
