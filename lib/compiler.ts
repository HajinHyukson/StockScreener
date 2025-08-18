import type {
  RuleAST,
  QueryPlan,
  BaseFilter,
  HistoricalFilter,
  TechnicalFilterRSI
} from './types';

/**
 * compileRule: walk the AST and produce a concrete QueryPlan
 * that the executor can run efficiently.
 */
export function compileRule(ast: RuleAST): QueryPlan {
  const plan: QueryPlan = { base: [], historical: [], technical: [] };

  function emitBase(param: BaseFilter) {
    // de-duplicate by param type (last one wins)
    const idx = plan.base.findIndex(b => b.fmpParam === param.fmpParam);
    if (idx >= 0) plan.base[idx] = param;
    else plan.base.push(param);
  }

  function visit(node: RuleAST) {
    if (!node) return;

    if (node.type === 'condition') {
      const { id, params = {} } = node;

      // ------ Base filters (map 1:1 to FMP screener params) ------
      if (id === 'base.exchange' && typeof params.value === 'string') {
        emitBase({ fmpParam: 'exchange', value: params.value });
        return;
      }
      if (id === 'base.sector' && typeof params.value === 'string') {
        emitBase({ fmpParam: 'sector', value: params.value });
        return;
      }
      if (id === 'base.marketCapMin' && typeof params.value === 'number') {
        emitBase({ fmpParam: 'marketCapMoreThan', value: params.value });
        return;
      }
      if (id === 'base.marketCapMax' && typeof params.value === 'number') {
        emitBase({ fmpParam: 'marketCapLowerThan', value: params.value });
        return;
      }

      // ------ Historical filters (computed features) ------
      if (id === 'pv.priceChangePctN') {
        const days = Number(params.days);
        const pct = Number(params.pct);
        if (Number.isFinite(days) && Number.isFinite(pct) && days > 0) {
          plan.historical.push({ kind: 'priceChangePctNDays', days, pct });
        }
        return;
      }
      if (id === 'pv.volumeChangePctN') {
        const days = Number(params.days);
        const pct = Number(params.pct);
        if (Number.isFinite(days) && Number.isFinite(pct) && days > 0) {
          plan.historical.push({ kind: 'volumeChangePctNDays', days, pct });
        }
        return;
      }

      // ------ Technical filters (FMP indicators) ------
      if (id === 'ti.rsi') {
        const tf = (params.timeframe ?? 'daily') as TechnicalFilterRSI['timeframe'];
        const period = Number(params.period ?? 14);
        const op = (params.op ?? 'lte') as 'lte' | 'gte';
        const value = Number(params.value);
        if (Number.isFinite(period) && Number.isFinite(value)) {
          plan.technical.push({ kind: 'rsi', timeframe: tf, period, op, value });
        }
        return;
      }

      // Unknown condition ID: safely ignore
      return;
    }

    // Boolean nodes: AND/OR/NOT
    if ((node.type === 'AND' || node.type === 'OR' || node.type === 'NOT') && Array.isArray((node as any).children)) {
      (node as any).children.forEach(visit);
    }
  }

  visit(ast);

  // Sensible defaults if user provided nothing
  if (!plan.base.some(b => b.fmpParam === 'exchange')) {
    plan.base.push({ fmpParam: 'exchange', value: 'NASDAQ' });
  }

  return plan;
}
