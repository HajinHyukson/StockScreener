// lib/types/index.ts


// ===== Rule AST =====
export type RuleAST =
  | { type: 'condition'; id: string; params: Record<string, any> }
  | { type: 'AND' | 'OR' | 'NOT'; children: RuleAST[] };


// ===== Screener Rows (API → UI) =====
export type Explain = { id: string; pass: boolean; value?: string };


export type ScreenerRow = {
  symbol: string;
  companyName?: string;
  price?: number;
  sector?: string;
  volume?: number;


  marketCap?: number;
  per?: number;
  rsi?: number;
  priceChangePct?: number;   // N-day % change (historical)
  dailyChangePct?: number;   // daily % change (screener)


  explain?: Explain[];
};


// ===== Page local sort keys =====
export type SortKey = 'symbol' | 'companyName' | 'price' | 'marketCap' | 'sector' | 'priceChangePct';


// ===== Saved Rule =====
export type SavedRule = {
  id: string;
  name: string;
  ast: RuleAST;
  createdAt: string;
  updatedAt: string;
};


// ===== Query Plan (compiler → executor) =====
export type BaseFilter =
  | { fmpParam: 'exchange'; value: string }
  | { fmpParam: 'sector'; value: string }
  | { fmpParam: 'marketCapMoreThan'; value: number }
  | { fmpParam: 'marketCapLowerThan'; value: number };


// historical
export type HistoricalFilter =
  | { kind: 'priceChangePctNDays'; days: number; pct: number }
  | { kind: 'volumeChangePctNDays'; days: number; pct: number };


// technical
export type TechnicalFilterRSI = {
  kind: 'rsi';
  timeframe: 'daily' | '1min' | '5min' | '15min' | '30min' | '1hour';
  period: number;
  op: 'lte' | 'gte';
  value: number;
};


export type QueryPlan = {
  base: BaseFilter[];                  // mapped to /stock-screener params
  historical: HistoricalFilter[];      // derived via historical series
  technical: TechnicalFilterRSI[];     // technical indicators (RSI etc)
};
