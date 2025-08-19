import { exchangeFilter } from './exchange';
import { sectorFilter } from './sector';
import { priceChangeFilter } from './priceChange';
import { marketCapFilter } from './marketCap';
import { rsiFilter } from './rsi';
import { perFilter } from './per';

export const allFilters = [
  exchangeFilter,     // always
  sectorFilter,       // always
  priceChangeFilter,  // always
  marketCapFilter,    // fundamental
  rsiFilter,          // technical
  perFilter,          // fundamental
];
