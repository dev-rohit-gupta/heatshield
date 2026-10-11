/** NWS heat index is a shade-based screening estimate, not a worker safety clearance. */
export type HeatIndexBand =
  | 'BELOW_CAUTION'
  | 'CAUTION'
  | 'EXTREME_CAUTION'
  | 'DANGER'
  | 'EXTREME_DANGER';

export type HeatIndexScreening = {
  modelVersion: 'nws-heat-index-v1';
  heatIndexC: number;
  band: HeatIndexBand;
  message: string;
  limitation: string;
};

const fahrenheit = (celsius: number): number => (celsius * 9) / 5 + 32;
const celsius = (degreesF: number): number => ((degreesF - 32) * 5) / 9;
const roundOne = (value: number): number => Math.round(value * 10) / 10;

function requireConditions(temperatureC: number, humidityPct: number): void {
  if (!Number.isFinite(temperatureC) || !Number.isFinite(humidityPct)) {
    throw new RangeError('Weather inputs must be finite numbers.');
  }
  if (temperatureC < -60 || temperatureC > 60 || humidityPct < 0 || humidityPct > 100) {
    throw new RangeError('Weather inputs are outside supported bounds.');
  }
}

/** NOAA/NWS Rothfusz regression, with NWS low/high-humidity adjustments. */
export function calculateHeatIndexC(temperatureC: number, humidityPct: number): number {
  requireConditions(temperatureC, humidityPct);
  const t = fahrenheit(temperatureC);
  const h = humidityPct;
  const simple = 0.5 * (t + 61 + (t - 68) * 1.2 + h * 0.094);
  const preliminary = (simple + t) / 2;
  if (preliminary < 80) return roundOne(celsius(preliminary));

  let result =
    -42.379 + 2.04901523 * t + 10.14333127 * h -
    0.22475541 * t * h - 0.00683783 * t * t -
    0.05481717 * h * h + 0.00122874 * t * t * h +
    0.00085282 * t * h * h - 0.00000199 * t * t * h * h;

  if (h < 13 && t >= 80 && t <= 112) {
    result -= ((13 - h) / 4) * Math.sqrt((17 - Math.abs(t - 95)) / 17);
  } else if (h > 85 && t >= 80 && t <= 87) {
    result += ((h - 85) / 10) * ((87 - t) / 5);
  }
  return roundOne(celsius(result));
}

/** NWS public heat-index chart bands, NOT individual medical risk categories. */
export function classifyHeatIndexC(heatIndexC: number): HeatIndexBand {
  if (!Number.isFinite(heatIndexC)) throw new RangeError('Heat index must be finite.');
  const f = fahrenheit(heatIndexC);
  if (f < 80) return 'BELOW_CAUTION';
  if (f < 90) return 'CAUTION';
  if (f < 103) return 'EXTREME_CAUTION';
  if (f < 125) return 'DANGER';
  return 'EXTREME_DANGER';
}

const MESSAGES: Record<HeatIndexBand, string> = {
  BELOW_CAUTION: 'Heat index is below the chart caution band. Physical work can still cause heat stress.',
  CAUTION: 'Heat conditions may be uncomfortable during prolonged outdoor activity.',
  EXTREME_CAUTION: 'Extended physical work in these conditions may increase heat-illness risk.',
  DANGER: 'Conditions may be dangerous during prolonged outdoor work. Seek cooler conditions when possible.',
  EXTREME_DANGER: 'Extreme heat conditions. Avoid prolonged outdoor exertion and follow local safety guidance.',
};

export function screenHeatIndex(temperatureC: number, humidityPct: number): HeatIndexScreening {
  const heatIndexC = calculateHeatIndexC(temperatureC, humidityPct);
  const band = classifyHeatIndexC(heatIndexC);
  return {
    modelVersion: 'nws-heat-index-v1',
    heatIndexC,
    band,
    message: MESSAGES[band],
    limitation: 'Weather-based screening only. Assumes shade; does not account for direct sun, workload, clothing, or individual health. Not a safety clearance.',
  };
}
