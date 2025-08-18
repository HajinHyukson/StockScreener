import type { RuleAST, QueryPlan, BaseFilter, HistoricalFilter } from './types';

export function compileRule(ast: RuleAST): QueryPlan {
  const base: BaseFilter[] = [];
  const historical: HistoricalFilter[] = [];

  function walk(node: RuleAST) {
    if (!node) return;
    if (node.type === 'condition') {
      const { id, params = {} } = node;
      switch (id) {
        case 'base.exchange':
          if (typeof params.value === 'string') base.push({ kind: 'base', fmpParam: 'exchange', value: params.value });
          break;
        case 'base.sector':
          if (typeof params.value === 'string') base.push({ kind: 'base', fmpParam: 'sector', value: params.value });
          break;
        case 'base.marketCapMin':
          if (typeof params.value === 'number') base.push({ kind: 'base', fmpParam: 'marketCapMoreThan', value: params.value });
          break;
        case 'base.marketCapMax':
          if (typeof params.value === 'number') base.push({ kind: 'base', fmpParam: 'marketCapLowerThan', value: params.value });
          break;
        case 'pv.priceChangePctN':
          if (typeof params.pct === 'number' && typeof params.days === 'number')
            historical.push({ kind: 'historical', metric: 'priceChangePctNDays', pct: params.pct, days: params.days });
          break;
        case 'pv.volumeChangePctN':
          if (typeof params.pct === 'number' && typeof params.days === 'number')
            historical.push({ kind: 'historical', metric: 'volumeChangePctNDays', pct: params.pct, days: params.days });
          break;
        default:
          break; // unknown condition IDs ignored for now
      }
      return;
    }
    if ((node.type === 'AND' || node.type === 'OR' || node.type === 'NOT') && Array.isArray((node as any).children)) {
      (node as any).children.forEach(walk);
    }
  }

  walk(ast);

  // Ensure at least an exchange default for FMP screener
  if (!base.some(b => b.fmpParam === 'exchange')) {
    base.push({ kind: 'base', fmpParam: 'exchange', value: 'NASDAQ' });
  }

  return { base, historical };
  // Ensure plan.technical exists
const plan: QueryPlan = { base: [], historical: [], technical: [] };

// Inside your AST visitor for condition nodes:
if (node.id === 'ti.rsi') {
  const tf = (node.params?.timeframe ?? 'daily') as TechnicalFilterRSI['timeframe'];
  const period = Number(node.params?.period ?? 14);
  const op = (node.params?.op ?? 'lte') as 'lte' | 'gte';
  const value = Number(node.params?.value);
  if (Number.isFinite(period) && Number.isFinite(value)) {
    plan.technical.push({ kind: 'rsi', timeframe: tf, period, op, value });
  }
}

}
