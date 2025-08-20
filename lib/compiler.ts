// lib/compiler.ts
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
 *
 * Notes:
 * - For fmpParam values that are already part of BaseFilter
 *   (exchange, sector, marketCapMoreThan, marketCapLowerThan),
 *   we use a strongly-typed emitter.
 * - For new/extended base params like peMoreThan / peLowerThan,
 *   we emit them via a generic emitter with a safe cast, so you
 *   don't have to immediately expand BaseFilter in types.ts.
 */
export function compileRule(ast: RuleAST): QueryPlan {
  const plan: QueryPlan = { base: [], historical: [], technical: [] };


  /** Strongly-typed emitter for known BaseFilter params */
  function emitBaseKnown(param: BaseFilter) {
    const idx = plan.base.findIndex((b) => b.fmpParam === param.fmpParam);
    if (idx >= 0) {
      plan.base[idx] = param;
    } else {
      plan.base.push(param);
    }
  }


  /**
   * Generic emitter for custom / extended base params (e.g., PER).
   * This lets you add new screener params without changing types.ts immediately.
   */
  function emitBaseGeneric(name: string, value: string | number) {
    const idx = plan.base.findIndex((b: any) => b.fmpParam === name);
    const obj = { fmpParam: name, value } as unknown as BaseFilter;
    if (idx >= 0) {
      (plan.base as unknown as any[])[idx] = obj;
    } else {
      (plan.base as unknown as any[]).push(obj);
    }
  }


  function visit(node: RuleAST) {
    if (!node) return;


    if (node.type === 'condition') {
      const { id, params = {} } = node;


      // ---------- Base filters (direct FMP screener params) ----------
      if (id === 'base.exchange' && typeof params.value === 'string') {
        emitBaseKnown({ fmpParam: 'exchange', value: params.value });
        return;
      }
      if (id === 'base.sector' && typeof params.value === 'string') {
        emitBaseKnown({ fmpParam: 'sector', value: params.value });
        return;
      }
      if (id === 'base.marketCapMin' && typeof params.value === 'number') {
        emitBaseKnown({ fmpParam: 'marketCapMoreThan', value: params.value });
        return;
      }
      if (id === 'base.marketCapMax' && typeof params.value === 'number') {
        emitBaseKnown({ fmpParam: 'marketCapLowerThan', value: params.value });
        return;
      }


      // PER (P/E) — use generic emitter so you don't need to change BaseFilter union
      if (id === 'base.peMoreThan' && typeof params.value === 'number') {
        emitBaseGeneric('peMoreThan', params.value);
        return;
      }
      if (id === 'base.peLowerThan' && typeof params.value === 'number') {
        emitBaseGeneric('peLowerThan', params.value);
        return;
      }


      // ---------- Historical computed filters ----------
      if (id === 'pv.priceChangePctN') {
        const days = Number(params.days);
        const pct = Number(params.pct);
        if (Number.isFinite(days) && Number.isFinite(pct) && days > 0) {
          const h: HistoricalFilter = { kind: 'priceChangePctNDays', days, pct };
          plan.historical.push(h);
        }
        return;
      }
      if (id === 'pv.volumeChangePctN') {
        const days = Number(params.days);
        const pct = Number(params.pct);
        if (Number.isFinite(days) && Number.isFinite(pct) && days > 0) {
          const h: HistoricalFilter = { kind: 'volumeChangePctNDays', days, pct };
          plan.historical.push(h);
        }
        return;
      }
      

      // ---------- Technical filters (RSI) ----------
      if (id === 'ti.rsi') {
        const tf = (params.timeframe ?? 'daily') as TechnicalFilterRSI['timeframe'];
        const period = Number(params.period ?? 14);
        const op = (params.op ?? 'lte') as 'lte' | 'gte';
        const value = Number(params.value);
        if (Number.isFinite(period) && Number.isFinite(value)) {
          const t: TechnicalFilterRSI = { kind: 'rsi', timeframe: tf, period, op, value };
          plan.technical.push(t);
        }
        return;
      }


      // Unknown condition ID: ignore safely
      return;
    }


    // Boolean nodes (AND/OR/NOT) — visit children
    if ((node.type === 'AND' || node.type === 'OR' || node.type === 'NOT') && Array.isArray((node as any).children)) {
      (node as any).children.forEach(visit);
    }
  }


  visit(ast);


  // Default exchange if none provided
  if (!plan.base.some((b) => b.fmpParam === 'exchange')) {
    plan.base.push({ fmpParam: 'exchange', value: 'NASDAQ' } as BaseFilter);
  }


  return plan;
}


