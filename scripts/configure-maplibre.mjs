/** Idempotently add the MapLibre Expo plugin without replacing other Expo settings. */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const file = resolve(root, 'apps/mobile/app.json');
const config = JSON.parse(readFileSync(file, 'utf8'));
if (!config.expo || typeof config.expo !== 'object') throw new Error('Missing expo app configuration');
const plugins = config.expo.plugins ?? [];
if (!Array.isArray(plugins)) throw new Error('expo.plugins must be an array');
const installed = plugins.some(plugin =>
  plugin === '@maplibre/maplibre-react-native' ||
  (Array.isArray(plugin) && plugin[0] === '@maplibre/maplibre-react-native'),
);
if (!installed) {
  plugins.push('@maplibre/maplibre-react-native');
  config.expo.plugins = plugins;
  writeFileSync(file, JSON.stringify(config, null, 2) + '\n');
  console.log('Added MapLibre Expo plugin.');
} else {
  console.log('MapLibre Expo plugin already configured.');
}
