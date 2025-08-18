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
