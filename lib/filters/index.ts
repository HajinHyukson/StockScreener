import { exchangeFilter } from './exchange';
import { sectorFilter } from './sector';
import { priceChangeFilter } from './priceChange';
import { marketCapFilter } from './marketCap';
import { rsiFilter } from './rsi';

export const allFilters = [
  exchangeFilter,     // always
  sectorFilter,       // always
  priceChangeFilter,  // always
  marketCapFilter,    // fundamental (hidden until chosen)
  rsiFilter           // technical (hidden until chosen)
];
