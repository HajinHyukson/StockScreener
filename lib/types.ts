/** Core AST used by UI and compiler */
export type RuleAST =
  | { type: 'condition'; id: string; params: Record<string, any> }
  | { type: 'AND' | 'OR' | 'NOT'; children: RuleAST[] };

/** Stock row returned to the client */
export type ScreenerRow = {
  symbol: string;
  companyName?: string;
  price?: number;
  sector?: string;
  volume?: number;


  marketCap?: number;
  per?: number;   //PER Value
  priceChangePct?: number; // computed (N-day price % change)
  dailyChangePct?: number; // N-day price change fromhistorical
  rsi?: number;            // latest RSI value when requested
  
  explain?: { id: string; pass: boolean; value?: string }[]; // per-condition evidence
};

/** Base (FMP screener) filters compiled from AST */
export type BaseFilter =
  | { fmpParam: 'exchange'; value: string }
  | { fmpParam: 'sector'; value: string }
  | { fmpParam: 'marketCapMoreThan'; value: number }
  | { fmpParam: 'marketCapLowerThan'; value: number };

/** Historical filters (computed from price/volume history) */
export type HistoricalFilter =
  | { kind: 'priceChangePctNDays'; days: number; pct: number }      // >= pct
  | { kind: 'volumeChangePctNDays'; days: number; pct: number };     // >= pct

/** Technical filters (FMP technical indicator endpoints) */
export type TechnicalFilterRSI = {
  kind: 'rsi';
  timeframe: 'daily' | '1min' | '5min' | '15min' | '30min' | '1hour';
  period: number;                 // e.g., 14
  op: 'lte' | 'gte';              // ≤ or ≥
  value: number;                  // threshold
};

/** Executable plan assembled by the compiler */
export type QueryPlan = {
  base: BaseFilter[];                       // maps to FMP /stock-screener params
  historical: HistoricalFilter[];           // pulls price/volume series, compute features
  technical: (TechnicalFilterRSI)[];        // calls technical indicator API
};




