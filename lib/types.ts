// /lib/types.ts
export type RuleAST =
  | { type: 'condition'; id: string; params: Record<string, any> }
  | { type: 'AND' | 'OR' | 'NOT'; children: RuleAST[] };
// ---- Compile/execute types ----
export type BaseFilter =
  | { kind: 'base'; fmpParam: 'exchange' | 'sector' | 'marketCapMoreThan' | 'marketCapLowerThan'; value: string | number };

export type HistoricalFilter =
  | { kind: 'historical'; metric: 'priceChangePctNDays'; pct: number; days: number }
  | { kind: 'historical'; metric: 'volumeChangePctNDays'; pct: number; days: number };

export type QueryPlan = {
  base: BaseFilter[];            // mapped to FMP screener params
  historical: HistoricalFilter[]; // computed per symbol using historical data
};

export type ScreenerRow = {
  symbol: string;
  companyName?: string;
  price?: number;
  marketCap?: number;
  sector?: string;
  volume?: number;
  priceChangePct?: number;   // optional: if computed
};
export type TechnicalFilterRSI = {
  kind: 'rsi';
  timeframe: 'daily' | '1min' | '5min' | '15min' | '30min' | '1hour';
  period: number;
  op: 'lte' | 'gte';
  value: number;
};

// If you have a generic plan type, add a technical array:
export type QueryPlan = {
  base: { fmpParam: string; value: string | number }[];
  historical: any[]; // existing
  technical: (TechnicalFilterRSI)[]; // ADD
};

// Extend row
export type ScreenerRow = {
  symbol: string;
  companyName?: string;
  price?: number;
  marketCap?: number;
  sector?: string;
  volume?: number;
  priceChangePct?: number;
  rsi?: number; // ADD
  explain?: { id: string; pass: boolean; value?: string }[];
};
