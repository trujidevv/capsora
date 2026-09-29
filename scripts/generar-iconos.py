"""
Genera la fuente de iconos de la app (solo los iconos que se usan) a partir de
Phosphor Icons, peso Bold (licencia MIT).

    python scripts/generar-iconos.py

Requisitos: `npm install` (trae @phosphor-icons/web como dependencia de
desarrollo) y `pip install fonttools`.

Para añadir un icono: ponlo en ICONOS (nombre de https://phosphoricons.com),
ejecuta el script y recompila la app (`npx react-native run-android`).
Genera:
  - android/app/src/main/assets/fonts/PastillinIconos.ttf
  - src/components/iconos.ts (nombre del icono -> carácter de la fuente)
  - android/app/src/main/assets/licencias/Phosphor-MIT.txt
"""

import re
import sys
from pathlib import Path

from fontTools import subset

ICONOS = [
    # Pestañas
    'sun', 'pill', 'calendar-check', 'users-three', 'gear-six',
    # Estados y avisos
    'check', 'check-circle', 'minus', 'clock', 'clock-countdown', 'x',
    'x-circle', 'question', 'info', 'warning', 'warning-octagon',
    # Acciones y pantallas
    'plus', 'caret-right', 'bell-ringing', 'user', 'key', 'share-network',
    'file-text', 'list-checks', 'confetti', 'shield-check', 'trash',
    'sign-out', 'download-simple', 'battery-warning', 'alarm', 'envelope-simple',
]

RAIZ = Path(__file__).resolve().parent.parent
ORIGEN = RAIZ / 'node_modules' / '@phosphor-icons' / 'web' / 'src' / 'bold'
FUENTE = RAIZ / 'android' / 'app' / 'src' / 'main' / 'assets' / 'fonts' / 'PastillinIconos.ttf'
MAPA = RAIZ / 'src' / 'components' / 'iconos.ts'
LICENCIA = RAIZ / 'android' / 'app' / 'src' / 'main' / 'assets' / 'licencias' / 'Phosphor-MIT.txt'


def main() -> None:
    css = (ORIGEN / 'style.css').read_text(encoding='utf-8')
    codigos = {
        nombre: int(codigo, 16)
        for nombre, codigo in re.findall(
            r'\.ph-bold\.ph-([a-z0-9-]+):before\s*\{\s*content:\s*"\\([0-9a-f]+)"', css
        )
    }
    faltan = [n for n in ICONOS if n not in codigos]
    if faltan:
        sys.exit(f'Estos iconos no existen en Phosphor: {faltan}')

    FUENTE.parent.mkdir(parents=True, exist_ok=True)
    LICENCIA.parent.mkdir(parents=True, exist_ok=True)
    LICENCIA.write_bytes((ORIGEN.parent.parent / 'LICENSE').read_bytes())
    opciones = subset.Options()
    opciones.layout_features = []  # sin ligaduras: se usa el carácter directamente
    opciones.name_IDs = ['*']
    fuente = subset.load_font(str(ORIGEN / 'Phosphor-Bold.ttf'), opciones)
    recorte = subset.Subsetter(opciones)
    recorte.populate(unicodes=[codigos[n] for n in ICONOS])
    recorte.subset(fuente)
    subset.save_font(fuente, str(FUENTE), opciones)

    lineas = [
        '// Generado por scripts/generar-iconos.py. No editar a mano.',
        '// Iconos: Phosphor Icons (Bold), licencia MIT, https://phosphoricons.com',
        'export const ICONOS = {',
        *[f"  '{n}': '\\u{{{codigos[n]:x}}}'," for n in ICONOS],
        '} as const;',
        '',
        'export type NombreIcono = keyof typeof ICONOS;',
        '',
    ]
    MAPA.write_text('\n'.join(lineas), encoding='utf-8', newline='\n')
    print(f'{len(ICONOS)} iconos -> {FUENTE.relative_to(RAIZ)} ({FUENTE.stat().st_size // 1024} KB)')


if __name__ == '__main__':
    main()
