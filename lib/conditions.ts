// /lib/conditions.ts
export type ParamType = 'number' | 'integer' | 'percent' | 'select' | 'days' | 'string';

export type ConditionParam = {
  key: string;
  label: string;
  type: ParamType;
  unit?: string;         // e.g., "USD", "%", "days"
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  options?: { value: string; label: string }[];  // for select
  default?: number | string;
  required?: boolean;
};

export type Condition = {
  id: string;                            // unique id (stable)
  name: string;                          // display name
  category: 'Price/Volume' | 'Technical' | 'Fundamental' | 'Base Filter' | 'Ranking/Score';
  description?: string;
  // How to evaluate/compile this condition
  evaluator:
    | {
        kind: 'base';                    // direct FMP screener param
        fmpParam: string;                // e.g., "marketCapMoreThan"
        comparator?: 'eq' | 'gte' | 'lte' | 'in';
      }
    | {
        kind: 'historical';              // needs historical series
        metric:
          | 'priceChangePctNDays'
          | 'volumeChangePctNDays'
          | 'smaCross'
          | 'rsi'
          | 'breakout52wHigh'
          | 'breakout52wLow';
      }
    | {
        kind: 'fundamental';             // needs fundamentals endpoint
        metric:
          | 'peTTM'
          | 'pb'
          | 'roe'
          | 'psTTM';
      };
  params: ConditionParam[];
  // Optional: default logical operator recommendation (AND/OR)
  suggestedOp?: 'AND' | 'OR';
};

// --- Catalog ---

export const CONDITIONS: Condition[] = [
  // ===== Base filters (compiled to FMP /api/v3/stock-screener params) =====
  {
    id: 'base.exchange',
    name: 'Exchange equals',
    category: 'Base Filter',
    description: 'Limit universe by exchange/venue.',
    evaluator: { kind: 'base', fmpParam: 'exchange', comparator: 'eq' },
    params: [
      {
        key: 'value',
        label: 'Exchange',
        type: 'select',
        options: [
          { value: 'NASDAQ', label: 'NASDAQ' },
          { value: 'NYSE', label: 'NYSE' },
          { value: 'AMEX', label: 'AMEX' }
        ],
        default: 'NASDAQ',
        required: true
      }
    ],
    suggestedOp: 'AND'
  },
  {
    id: 'base.sector',
    name: 'Sector equals',
    category: 'Base Filter',
    description: 'Sector must equal selected value.',
    evaluator: { kind: 'base', fmpParam: 'sector', comparator: 'eq' },
    params: [
      {
        key: 'value',
        label: 'Sector',
        type: 'select',
        options: [
          { value: 'Technology', label: 'Technology' },
          { value: 'Financial Services', label: 'Financial Services' },
          { value: 'Healthcare', label: 'Healthcare' },
          { value: 'Consumer Cyclical', label: 'Consumer Cyclical' },
          { value: 'Consumer Defensive', label: 'Consumer Defensive' },
          { value: 'Industrials', label: 'Industrials' },
          { value: 'Energy', label: 'Energy' },
          { value: 'Basic Materials', label: 'Basic Materials' },
          { value: 'Utilities', label: 'Utilities' },
          { value: 'Real Estate', label: 'Real Estate' },
          { value: 'Communication Services', label: 'Communication Services' }
        ]
      }
    ],
    suggestedOp: 'AND'
  },
  {
    id: 'base.marketCapMin',
    name: 'Market cap ≥',
    category: 'Base Filter',
    description: 'Minimum market capitalization (USD).',
    evaluator: { kind: 'base', fmpParam: 'marketCapMoreThan', comparator: 'gte' },
    params: [
      { key: 'value', label: 'Min Market Cap (USD)', type: 'number', unit: 'USD', min: 0, step: 1, default: 1_000_000_000 }
    ],
    suggestedOp: 'AND'
  },
  {
    id: 'base.marketCapMax',
    name: 'Market cap ≤',
    category: 'Base Filter',
    description: 'Maximum market capitalization (USD).',
    evaluator: { kind: 'base', fmpParam: 'marketCapLowerThan', comparator: 'lte' },
    params: [
      { key: 'value', label: 'Max Market Cap (USD)', type: 'number', unit: 'USD', min: 0, step: 1 }
    ],
    suggestedOp: 'AND'
  },

  // ===== Price/Volume (historical) =====
  {
    id: 'pv.priceChangePctN',
    name: 'Price change ≥ X% over last N days',
    category: 'Price/Volume',
    description: 'Compute percent change from N days ago to latest close.',
    evaluator: { kind: 'historical', metric: 'priceChangePctNDays' },
    params: [
      { key: 'pct',  label: 'Percent ≥', type: 'percent', unit: '%', min: -100, max: 1000, step: 0.1 },
      { key: 'days', label: 'Days',       type: 'days',    unit: 'd', min: 1, max: 252, default: 20 }
    ],
    suggestedOp: 'AND'
  },
  {
    id: 'pv.volumeChangePctN',
    name: 'Volume change ≥ X% over last N days',
    category: 'Price/Volume',
    description: 'Percent change in daily volume vs N days ago.',
    evaluator: { kind: 'historical', metric: 'volumeChangePctNDays' },
    params: [
      { key: 'pct',  label: 'Percent ≥', type: 'percent', unit: '%', min: -100, max: 1000, step: 1 },
      { key: 'days', label: 'Days',       type: 'days',    unit: 'd', min: 1, max: 252, default: 20 }
    ],
    suggestedOp: 'AND'
  },

  // ===== Technical =====
  {
    id: 'ta.smaCross.50over200',
    name: 'SMA(50) crosses above SMA(200)',
    category: 'Technical',
    description: 'Golden cross; bullish moving-average crossover.',
    evaluator: { kind: 'historical', metric: 'smaCross' },
    params: [
      { key: 'fast', label: 'Fast SMA', type: 'integer', min: 5, max: 200, default: 50 },
      { key: 'slow', label: 'Slow SMA', type: 'integer', min: 20, max: 400, default: 200 },
      { key: 'direction', label: 'Direction', type: 'select',
        options: [{ value: 'above', label: 'Crosses Above' }, { value: 'below', label: 'Crosses Below' }], default: 'above' }
    ],
    suggestedOp: 'AND'
  },
  {
    id: 'ta.breakout.52wHigh',
    name: 'Breakout above 52-week high',
    category: 'Technical',
    description: 'Latest close > max close over last 252 trading days.',
    evaluator: { kind: 'historical', metric: 'breakout52wHigh' },
    params: [],
    suggestedOp: 'AND'
  },
  {
    id: 'ta.rsi.lte',
    name: 'RSI ≤ X',
    category: 'Technical',
    description: 'Relative Strength Index threshold (default 14-day).',
    evaluator: { kind: 'historical', metric: 'rsi' },
    params: [
      { key: 'period', label: 'Period', type: 'integer', min: 2, max: 50, default: 14 },
      { key: 'value',  label: 'RSI ≤',  type: 'number', min: 0, max: 100, default: 30 }
    ],
    suggestedOp: 'AND'
  },

  // ===== Fundamental (simple; extend later) =====
  {
    id: 'fa.peTTM.lte',
    name: 'P/E (TTM) ≤ X',
    category: 'Fundamental',
    description: 'Price/Earnings trailing-12-months.',
    evaluator: { kind: 'fundamental', metric: 'peTTM' },
    params: [{ key: 'value', label: 'P/E ≤', type: 'number', min: 0, max: 200, step: 0.1 }]
  },
  {
    id: 'fa.roe.gte',
    name: 'ROE ≥ X%',
    category: 'Fundamental',
    description: 'Return on Equity.',
    evaluator: { kind: 'fundamental', metric: 'roe' },
    params: [{ key: 'value', label: 'ROE ≥', type: 'percent', unit: '%', min: -100, max: 200, step: 0.1 }]
  }
];

// Helper to group by category for the UI left panel
export function groupByCategory(list: Condition[]) {
  return list.reduce<Record<string, Condition[]>>((acc, c) => {
    (acc[c.category] ||= []).push(c);
    return acc;
  }, {});
}
