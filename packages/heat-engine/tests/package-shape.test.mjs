import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

// Scaffold-only test: risk calculations will receive numerical tests later.
test('heat engine package exists and is private', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.private, true);
  assert.equal(pkg.name, '@heatshield/heat-engine');
});
