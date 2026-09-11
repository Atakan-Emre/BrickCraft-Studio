import test from 'node:test';
import assert from 'node:assert/strict';
import { assetUrl } from '../src/asset-url.js';

test('public resources retain case-sensitive deployment prefix and query strings', () => {
  for (const base of ['/', '/BrickCraft-Studio/', '/renamed-repo/']) {
    for (const path of ['/models/car.json', '/ldraw/detail/3001.mpd', '/models/previews/car.png?v=2', '/models/sources/car.mpd', '/ldraw/CAreadme.txt']) {
      assert.equal(assetUrl(path, base), base + path.slice(1));
      assert.equal(assetUrl(path.slice(1), base), base + path.slice(1));
    }
  }
});
