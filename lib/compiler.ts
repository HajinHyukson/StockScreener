// lib/compiler.ts
import type {
  RuleAST,
  QueryPlan,
  BaseFilter,
  HistoricalFilter,
  TechnicalFilterRSI,
} from '@/types';

/**
 * We extend the plan with a small "post" bucket for filters that
 * the upstream screener cannot handle (e.g., PER).
 */
export type PostFilter =
  | { kind: 'per'; op: 'lte' | 'gte'; value: number };

export type CompiledPlan = QueryPlan & { post: PostFilter[] };

/**
 * compileRule
 * Walks the AST and produces a plan the executor can run.
 * - base.*  -> /stock-screener params
 * - pv.*    -> historical (computed by executor)
 * - ti.*    -> technical indicators (executor)
 * - per     -> post (server-side filter; screener can't handle pe)
 */
export function compileRule(ast: RuleAST): CompiledPlan {
  const plan: CompiledPlan = { base: [], historical: [], technical: [], post: [] };

  // Simple de-dupe emitter for known BaseFilter params
  function emitBaseKnown(param: BaseFilter) {
    const idx = plan.base.findIndex((b) => b.fmpParam === param.fmpParam);
    if (idx >= 0) plan.base[idx] = param;
    else plan.base.push(param);
  }

  function visit(node?: RuleAST) {
    if (!node) return;

    if (node.type === 'condition') {
      const { id, params = {} } = node;

      // ---------- base.* → screener params ----------
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

      // ---------- PER (server-side post filter; screener has no pe param) ----------
      if (id === 'base.peMoreThan' && typeof params.value === 'number') {
        plan.post.push({ kind: 'per', op: 'gte', value: params.value });
        return;
      }
      if (id === 'base.peLowerThan' && typeof params.value === 'number') {
        plan.post.push({ kind: 'per', op: 'lte', value: params.value });
        return;
      }

      // ---------- historical: priceChange N days (support gte / lte via params.op) ----------
      if (id === 'pv.priceChangePctN' && typeof params.pct === 'number' && typeof params.days === 'number') {
        const op = params.op === 'lte' ? 'lte' : 'gte';
        // @ts-expect-error extend HistoricalFilter with op at runtime
        plan.historical.push({ kind: 'priceChangePctNDays', days: params.days, pct: params.pct, op } as HistoricalFilter);
        return;
      }

      // (If you also support volumeChangePctN, add it here)
      if (id === 'pv.volumeChangePctN' && typeof params.pct === 'number' && typeof params.days === 'number') {
        // @ts-expect-error matching your executor’s expectation
        plan.historical.push({ kind: 'volumeChangePctNDays', days: params.days, pct: params.pct } as HistoricalFilter);
        return;
      }

      // ---------- technical: RSI ----------
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

      // Unknown condition → ignore safely
      return;
    }

    if (('children' in node) && Array.isArray((node as any).children)) {
      (node as any).children.forEach(visit);
    }
  }

  visit(ast);

  // default exchange if none provided
  if (!plan.base.some((b) => b.fmpParam === 'exchange')) {
    plan.base.push({ fmpParam: 'exchange', value: 'NASDAQ' });
  }

  return plan;
}
