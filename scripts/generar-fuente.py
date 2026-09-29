"""
Genera la letra de la app (Lexend, licencia SIL Open Font License 1.1) para Android.

    python scripts/generar-fuente.py

Requisitos: `pip install fonttools` y conexión a internet (descarga la fuente
variable del repositorio de Google Fonts).

Saca de la fuente variable un archivo por cada peso que usa la app y los recorta
a los caracteres latinos. Genera en android/app/src/main/res/font/:
  - lexend_400.ttf, lexend_600.ttf, lexend_700.ttf, lexend_800.ttf
  - lexend.xml (familia: Android elige el archivo según fontWeight)
  - La licencia se guarda en android/app/src/main/assets/licencias/Lexend-OFL.txt
La familia se registra en MainApplication.kt con el nombre «Lexend».
Después hay que recompilar la app.
"""

import io
import urllib.request
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

URL_FUENTE = 'https://github.com/google/fonts/raw/main/ofl/lexend/Lexend%5Bwght%5D.ttf'
URL_LICENCIA = 'https://github.com/google/fonts/raw/main/ofl/lexend/OFL.txt'
PESOS = [400, 600, 700, 800]
# Latín básico, Latin-1 (á, ñ, ¿, «»…), € y puntuación general (… – ’ “ ”)
CARACTERES = [*range(0x20, 0x7F), *range(0xA0, 0x100), 0x20AC, *range(0x2010, 0x2027)]

RAIZ = Path(__file__).resolve().parent.parent
CARPETA = RAIZ / 'android' / 'app' / 'src' / 'main' / 'res' / 'font'
LICENCIA = RAIZ / 'android' / 'app' / 'src' / 'main' / 'assets' / 'licencias' / 'Lexend-OFL.txt'


def descargar(url: str) -> bytes:
    with urllib.request.urlopen(url) as r:
        return r.read()


def main() -> None:
    variable = descargar(URL_FUENTE)
    CARPETA.mkdir(parents=True, exist_ok=True)
    LICENCIA.parent.mkdir(parents=True, exist_ok=True)
    LICENCIA.write_bytes(descargar(URL_LICENCIA))

    for peso in PESOS:
        fuente = instancer.instantiateVariableFont(
            TTFont(io.BytesIO(variable)), {'wght': peso}, updateFontNames=True
        )
        opciones = subset.Options()
        opciones.name_IDs = ['*']
        opciones.name_languages = ['*']
        recorte = subset.Subsetter(opciones)
        recorte.populate(unicodes=CARACTERES)
        recorte.subset(fuente)
        destino = CARPETA / f'lexend_{peso}.ttf'
        fuente.save(str(destino))
        print(f'{destino.relative_to(RAIZ)} ({destino.stat().st_size // 1024} KB)')

    entradas = '\n'.join(
        f'    <font\n'
        f'        android:fontStyle="normal"\n'
        f'        android:fontWeight="{peso}"\n'
        f'        android:font="@font/lexend_{peso}"\n'
        f'        app:fontStyle="normal"\n'
        f'        app:fontWeight="{peso}"\n'
        f'        app:font="@font/lexend_{peso}" />'
        for peso in PESOS
    )
    (CARPETA / 'lexend.xml').write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<!-- Generado por scripts/generar-fuente.py. Lexend, SIL Open Font License 1.1 -->\n'
        '<font-family xmlns:android="http://schemas.android.com/apk/res/android"\n'
        '    xmlns:app="http://schemas.android.com/apk/res-auto">\n'
        f'{entradas}\n'
        '</font-family>\n',
        encoding='utf-8',
        newline='\n',
    )
    print(f'{(CARPETA / "lexend.xml").relative_to(RAIZ)}')


if __name__ == '__main__':
    main()
