#!/usr/bin/env python3
"""Flatten licensed LDraw models and package complete per-part geometry.

Run from any directory: python3 scripts/prepare-models.py [car eiffel house].
Original MPDs are copied byte-for-byte. Derived JSON carries source attribution;
packaged geometry retains every original DAT header, author and license.
The output matrices use LDraw coordinates/units and column-major storage.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
import re
import shutil
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / '.cache/source-models'
OUTPUT = ROOT / 'public/models'
PART_OUTPUT = ROOT / 'public/ldraw/detail'
IDENTITY = [1., 0., 0., 0., 0., 1., 0., 0., 0., 0., 1., 0., 0., 0., 0., 1.]
MODEL_METADATA = {
    'bouquet': {'title': 'Flower Bouquet', 'setNumber': '10280-1', 'author': 'Orion Pobursky [OrionP]', 'license': 'CC BY 2.0', 'licenseUrl': 'https://creativecommons.org/licenses/by/2.0/', 'sourceUrl': 'https://library.ldraw.org/library/omr/10280-1.mpd', 'sourcePage': 'https://library.ldraw.org/omr/sets/1382', 'caveats': ['Complete source model.']},
    'shuttle': {'title': 'NASA Space Shuttle Discovery', 'setNumber': '10283-1', 'author': 'Orion Pobursky [OrionP]', 'license': 'CC BY 2.0', 'licenseUrl': 'https://creativecommons.org/licenses/by/2.0/', 'sourceUrl': 'https://library.ldraw.org/library/omr/10283-1.mpd', 'sourcePage': 'https://library.ldraw.org/omr/sets/1443', 'caveats': ['Hubble is displayed deployed. Source omits its shuttle attachment bracket and stowed solar-array tubes.', 'Source TEXMAP images are not embedded; some labels may render without their printed artwork.']},
    'bonsai': {'title': 'Bonsai — Cherry Blossoms', 'setNumber': '10281-1', 'author': 'Orion Pobursky [OrionP]', 'license': 'CC BY 2.0', 'licenseUrl': 'https://creativecommons.org/licenses/by/2.0/', 'sourceUrl': 'https://library.ldraw.org/library/omr/10281-1_Cherry-Blossoms.mpd', 'sourcePage': 'https://library.ldraw.org/omr/sets/1383', 'caveats': ['Cherry blossom variant; complete source geometry.']},
    'car': {
        'title': 'Ferrari F40', 'setNumber': '10248-1',
        'author': 'Magnus Forsberg [MagFors]', 'license': 'CC BY 2.0',
        'licenseUrl': 'https://creativecommons.org/licenses/by/2.0/',
        'sourceUrl': 'https://library.ldraw.org/library/omr/10248-1.mpd',
        'sourcePage': 'https://library.ldraw.org/omr/sets/1187',
        'caveats': ['OMR reports missing stickers, no missing parts or patterns.',
                    'File-derived element count differs from the retail inventory.'],
    },
    'eiffel': {
        'title': 'The Eiffel Tower', 'setNumber': '21019-1',
        'author': 'Damien Roux [Darats]; flexible axle: Orion Pobursky [OrionP]',
        'license': 'CC BY 2.0',
        'licenseUrl': 'https://creativecommons.org/licenses/by/2.0/',
        'sourceUrl': 'https://library.ldraw.org/library/omr/21019-1.mpd',
        'sourcePage': 'https://library.ldraw.org/omr/sets/81',
        'caveats': ['OMR reports no missing parts, patterns or stickers.',
                    'Generated flexible axle geometry is preserved as a custom element.'],
    },
    'house': {
        'title': 'Carriage House', 'author': 'Michael Horvath',
        'license': 'CC BY-SA 4.0',
        'licenseUrl': 'https://creativecommons.org/licenses/by-sa/4.0/',
        'sourceUrl': 'https://raw.githubusercontent.com/mjhorvath/Mike-LDraw-Models/master/source/ldr_carriage_house_newer.mpd',
        'sourcePage': 'https://github.com/mjhorvath/Mike-LDraw-Models',
        'caveats': ['CAD ışık ve kamera işaretleri parça listesine ve modele dahil edilmez.'],
    },
}


def normal(name: str) -> str:
    return name.strip().replace('\\', '/').lower()


def references(text: str):
    """Only visible type-1 references, excluding MLCAD HIDE/comment content."""
    for line_number, line in enumerate(text.splitlines(), 1):
        fields = line.strip().split(maxsplit=14)
        if fields and fields[0] == '1':
            if len(fields) != 15:
                raise ValueError(f'Malformed type-1 line {line_number}: {line}')
            yield fields


def split_mpd(text: str, fallback: str) -> dict[str, str]:
    files: dict[str, str] = {}
    current = None
    for line in text.splitlines(keepends=True):
        stripped = line.strip()
        if stripped.upper().startswith('0 FILE '):
            current = normal(stripped[7:])
            if current in files:
                raise ValueError(f'Duplicate embedded file {current}')
            files[current] = ''
        elif stripped.upper() == '0 NOFILE':
            current = None
        elif current is not None:
            files[current] += line
    return files or {normal(fallback): text}


def is_submodel(name: str, text: str) -> bool:
    """Use metadata/geometry, never a DAT extension alone (house uses DAT models)."""
    upper = text.upper()
    if re.search(r'^0\s+!LDRAW_ORG\s+(?:UNOFFICIAL_)?(?:PART|SUBPART|PRIMITIVE|SHORTCUT)\b', upper, re.M):
        return False
    if re.search(r'^0\s+UN-?OFFICIAL\s+PART\b', upper, re.M):
        return False
    if re.search(r'^[2345]\s', text, re.M):
        return False
    return True


def multiply(a: list[float], b: list[float]) -> list[float]:
    return [sum(a[k * 4 + row] * b[column * 4 + k] for k in range(4))
            for column in range(4) for row in range(4)]


def transform(fields: list[str]) -> list[float]:
    x, y, z, a, b, c, d, e, f, g, h, i = map(float, fields[2:14])
    values = [a, d, g, 0., b, e, h, 0., c, f, i, 0., x, y, z, 1.]
    if not all(math.isfinite(v) for v in values):
        raise ValueError('Non-finite LDraw transform')
    return values


def loader_name(name: str) -> str:
    """Match Three.js LDrawLoader's automatic subpart/hi-res namespace expansion."""
    name = normal(name)
    if name.startswith('s/'):
        return 'parts/' + name
    if name.startswith('48/'):
        return 'p/' + name
    return name


class Library:
    def __init__(self, filename: Path):
        self.archive = zipfile.ZipFile(filename)
        self.index = {normal(n): n for n in self.archive.namelist()}
        self.cache: dict[str, str] = {}

    def read(self, name: str) -> tuple[str, str] | None:
        name = normal(name)
        for candidate in ('ldraw/parts/' + name, 'ldraw/p/' + name, 'ldraw/' + name):
            if candidate in self.index:
                if candidate not in self.cache:
                    self.cache[candidate] = self.archive.read(self.index[candidate]).decode('utf-8-sig')
                return candidate, self.cache[candidate]
        return None


class Model:
    def __init__(self, model_id: str, library: Library):
        self.model_id = model_id
        self.library = library
        self.source_path = SOURCE / f'{model_id}.mpd'
        self.source_bytes = self.source_path.read_bytes()
        self.files = split_mpd(self.source_bytes.decode('utf-8-sig'), self.source_path.name)
        self.root = next(iter(self.files))
        self.pieces = []
        self.parts = {}
        self.part_sources = {}
        self.missing = []
        self.warnings = []
        self.texture_fallbacks = {}
        self.excluded_helpers = {}

    def resolve(self, name: str) -> tuple[str, str, bool] | None:
        name = normal(name)
        # Embedded definitions take priority over the installed standard library.
        for embedded_name in (name, name.removeprefix('parts/').removeprefix('p/')):
            if embedded_name in self.files:
                return embedded_name, self.files[embedded_name], True
        found = self.library.read(name)
        return (*found, False) if found else None

    def part_key(self, name: str, text: str, embedded: bool) -> str:
        base = re.sub(r'[^a-z0-9_-]+', '-', normal(name).removesuffix('.dat').removesuffix('.ldr')).strip('-')
        if not embedded:
            return base
        digest = hashlib.sha256(text.encode()).hexdigest()[:8]
        return f'{self.model_id}-custom-{base}-{digest}'

    def description(self, name: str, text: str, chain=()) -> str:
        """Follow official moved aliases for display only; geometry IDs stay intact."""
        description = next((l[2:].strip() for l in text.splitlines()
                            if l.startswith('0 ') and l[2:].strip()
                            and not l[2:].startswith(('Name:', 'Author:', '!'))), name)
        moved = re.match(r'^~?Moved to\s+(.+?)\s*$', description, re.I)
        if moved:
            target = normal(moved.group(1))
            if not target.endswith(('.dat', '.ldr')):
                target += '.dat'
            if target not in chain:
                found = self.library.read(target)
                if found:
                    return self.description(target, found[1], chain + (target,))
            self.warnings.append(f'Part description alias unresolved: {name} -> {target}')
        return re.sub(r'\s+', ' ', description)

    def helper_reason(self, name: str, text: str) -> str | None:
        """Exclude source CAD markers, while retaining physical LEGO camera parts."""
        if re.search(r'^0\s+!CATEGORY\s+Helper\b', text, re.M | re.I):
            return 'LDraw Helper category; CAD scene marker, not a physical LEGO element'
        if normal(name) == 'light.dat':
            return 'CAD light-source marker'
        if re.search(r'^0\s+~(?:Camera Position|Light Source)\s*$', text, re.M | re.I):
            return 'CAD camera/light placement marker'
        return None

    def flatten(self, name: str, matrix=None, color='16', chain=()):
        matrix = matrix or IDENTITY
        name = normal(name)
        found = self.resolve(name)
        if found is None:
            self.missing.append({'file': name, 'context': 'model', 'chain': list(chain)})
            return
        resolved_name, text, embedded = found
        if resolved_name in chain:
            raise ValueError(f'Model recursion cycle: {chain} -> {resolved_name}')
        helper_reason = self.helper_reason(name, text)
        if helper_reason:
            if name not in self.excluded_helpers:
                self.excluded_helpers[name] = {'sourceId': name, 'name': self.description(name, text),
                                                'count': 0, 'reason': helper_reason}
            self.excluded_helpers[name]['count'] += 1
            return
        if embedded and is_submodel(name, text):
            for fields in references(text):
                child_color = color if fields[1] == '16' else fields[1]
                self.flatten(fields[14], multiply(matrix, transform(fields)), child_color, chain + (resolved_name,))
            return

        key = self.part_key(name, text, embedded)
        if key not in self.parts:
            description = self.description(name, text)
            self.parts[key] = {'name': description, 'sourceId': name,
                               'assetUrl': f'/ldraw/detail/{key}.mpd'}
            self.part_sources[key] = name
        self.pieces.append({'id': f'{self.model_id}-{len(self.pieces) + 1:05}',
                            'part': key, 'color': str(color),
                            'matrix': [round(v, 10) for v in matrix]})

    def pack(self, key: str, root_name: str):
        seen = {}
        missing = []

        def visit(name: str, chain=()):
            alias = loader_name(name)
            if alias in seen:
                return
            found = self.resolve(name)
            if found is None:
                missing.append({'file': normal(name), 'context': f'part:{key}', 'chain': list(chain)})
                return
            _, text, _ = found
            seen[alias] = text
            if '!TEXMAP' in text.upper():
                fallbacks = re.findall(r'^0\s+!TEXMAP\s+FALLBACK\s*\r?\n(.*?)^0\s+!TEXMAP\s+END\b', text, re.M | re.S | re.I)
                fallback_faces = sum(len(re.findall(r'^[34]\s', fallback, re.M)) for fallback in fallbacks)
                if fallback_faces:
                    # Three.js LDrawLoader ignores the type-0 TEXMAP and !: directives,
                    # while parsing the source's ordinary type-3/4 fallback polygons.
                    self.texture_fallbacks[normal(name)] = {
                        'part': key, 'sourceId': normal(name),
                        'description': self.description(name, text),
                        'fallbackFaceCount': fallback_faces,
                        'rendering': 'Original visible polygon fallback; texture directives ignored by Three.js LDrawLoader',
                    }
                else:
                    self.warnings.append(f'TEXMAP has no verified polygon fallback in {name}')
            for fields in references(text):
                visit(fields[14], chain + (normal(name),))

        visit(root_name)
        self.missing.extend(missing)
        if missing:
            return
        # All original file contents/headers remain unchanged within this MPD.
        packed = ('0 FILE main.ldr\n0 Self-contained source part package\n'
                  '0 !LDRAW_ORG Model\n'
                  f'0 Original geometry and licenses retained; source model {self.model_id}.\n'
                  f'1 16 0 0 0 1 0 0 0 1 0 0 0 1 {root_name}\n')
        packed += ''.join(f'\n0 FILE {alias}\n{text}\n' for alias, text in seen.items())
        (PART_OUTPUT / f'{key}.mpd').write_text(packed, encoding='utf-8')

    def export(self) -> dict:
        self.flatten(self.root)
        for key, name in self.part_sources.items():
            self.pack(key, name)
        metadata = dict(MODEL_METADATA.get(self.model_id, {}))
        override_file = SOURCE / f'{self.model_id}-metadata.json'
        if override_file.exists():
            metadata.update(json.loads(override_file.read_text()))
        if self.texture_fallbacks:
            note = ('Han Solo karbonit desenli parça, kaynak dosyadaki geometrik desenle gösterilir; '
                    'küçük baskı ayrıntıları farklı olabilir.' if self.model_id == 'house' else
                    'Bazı baskılı parçalar kaynak dosyadaki geometrik desenle gösterilir; küçük baskı ayrıntıları farklı olabilir.')
            metadata['caveats'] = [*metadata.get('caveats', []), note]
            self.warnings.append(note)
        metadata.update({
            'sourceFile': f'/models/sources/{self.model_id}.mpd',
            'sourceSha256': hashlib.sha256(self.source_bytes).hexdigest(),
            'rootFile': self.root,
            'pieceCount': len(self.pieces), 'partCount': len(self.parts),
            'partColorCount': len({(p['part'], p['color']) for p in self.pieces}),
            'embeddedFileCount': len(self.files),
            'coordinateSystem': 'LDraw; column-major matrices; 20 units per stud; Y points down',
            'modifications': 'Nested assembly transforms flattened into per-element JSON; original MPD unchanged.',
            'originalStepCount': sum(len(re.findall(r'^0 (?:STEP|ROTSTEP)\b', t, re.M)) for t in self.files.values()),
            'missingDependencies': self.missing,
            'warnings': sorted(set(self.warnings)),
            'textureFallbacks': list(self.texture_fallbacks.values()),
            'excludedHelpers': list(self.excluded_helpers.values()),
            'excludedHelperCount': sum(item['count'] for item in self.excluded_helpers.values()),
        })
        result = {'id': self.model_id, 'metadata': metadata,
                  'pieces': self.pieces, 'parts': self.parts}
        report_path = OUTPUT / f'{self.model_id}-validation.json'
        report_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + '\n')
        if self.missing:
            raise ValueError(f'{self.model_id}: missing {len(self.missing)} dependencies; see {report_path}')
        (OUTPUT / f'{self.model_id}.json').write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')) + '\n')
        shutil.copyfile(self.source_path, OUTPUT / 'sources' / self.source_path.name)
        for sidecar in SOURCE.glob(f'{self.model_id}-*'):
            if sidecar.is_file():
                shutil.copyfile(sidecar, OUTPUT / 'sources' / sidecar.name)
        print(f'{self.model_id}: {len(self.pieces)} elements, {len(self.parts)} geometry assets, '
              f'{metadata["partColorCount"]} part/color groups, no missing dependencies', flush=True)
        return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('models', nargs='*', default=['car', 'eiffel', 'house', 'bonsai', 'shuttle', 'bouquet'])
    args = parser.parse_args()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    (OUTPUT / 'sources').mkdir(exist_ok=True)
    PART_OUTPUT.mkdir(parents=True, exist_ok=True)
    library = Library(ROOT / '.cache/ldraw-complete.zip')
    for filename in ['LDConfig.ldr', 'CAreadme.txt', 'CAlicense.txt', 'CAlicense4.txt']:
        (ROOT / 'public/ldraw' / filename).write_bytes(library.archive.read('ldraw/' + filename))
    failures = []
    for model_id in args.models:
        try:
            Model(model_id, library).export()
        except (ValueError, FileNotFoundError) as error:
            failures.append(str(error))
            print(error, file=sys.stderr)
    if failures:
        sys.exit(1)


if __name__ == '__main__':
    main()
