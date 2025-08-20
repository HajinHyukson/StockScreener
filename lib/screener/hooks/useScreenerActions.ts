'use client';
import type { RuleAST } from '@/types';
import { buildASTFromFilterValues, summaryFromValues, valuesFromAST } from '@/lib/screener/ast';
import { runScreener } from '@/screener/services/runService';
import { listRules, saveRule as saveRuleApi, deleteRule as deleteRuleApi } from '@/screener/services/rulesService';
import { allFilters } from '@/filters';


type State = ReturnType<any>; // a relaxed type for quick integration; optionally type this tighter


export function useScreenerActions(
  state: any,
  combos: { pruneInactive: (v: Record<string, any>) => Record<string, any> }
) {
  async function run() {
    const values = combos.pruneInactive({ ...state.filterValues });
    const ast = buildASTFromFilterValues(values);
    state.setServerLimit(50);
    await runWithAst(ast, 50, false);
  }


  async function loadMore() {
    const values = combos.pruneInactive({ ...state.filterValues });
    const ast = buildASTFromFilterValues(values);
    const next = state.serverLimit + 50;
    await runWithAst(ast, next, true);
  }


  async function runWithAst(ast: RuleAST, nextLimit?: number, append = false) {
    state.setLoading(true); state.setErr(null);
    const limit = Number.isFinite(nextLimit as number) ? Number(nextLimit) : state.serverLimit;
    const res = await runScreener({ ast, limit });


    if (!res.ok) {
      state.setErr((res.error || 'Error') + (res.detail ? ` — ${res.detail}` : ''));
      if (!append) state.setRows([]);
      state.setHasMore(false);
      state.setLoading(false);
      return;
    }


    state.setAsOf(res.asOf || new Date().toISOString());


    if (append) {
      const existing = new Set((state.rows || []).map((r: any) => r.symbol));
      const add = (res.rows || []).filter((r: any) => !existing.has(r.symbol));
      state.setRows([...(state.rows || []), ...add]);
      state.setHasMore((res.rows || []).length >= limit);
    } else {
      state.setRows(res.rows || []);
      state.setHasMore((res.rows || []).length >= limit);
      state.setPage(1);
    }
    state.setServerLimit(limit);
    state.setLoading(false);
  }


  async function saveRule() {
    state.setSaving(true);
    try {
      const values = combos.pruneInactive({ ...state.filterValues });
      const ast = buildASTFromFilterValues(values);
      const name = state.ruleName?.trim() || `Rule ${new Date().toLocaleString()}`;
      await saveRuleApi({ name, ast });
      state.setRuleName('');
      await loadRules();
    } finally {
      state.setSaving(false);
    }
  }


  async function loadRules() {
    state.setLoadingRules(true); state.setRulesError(null);
    try {
      const rules = await listRules();
      state.setRules(rules);
    } catch (e: any) {
      state.setRulesError(e.message ?? 'Failed to load rules');
    } finally {
      state.setLoadingRules(false);
    }
  }


  async function deleteRule(id: string) {
    await deleteRuleApi(id);
    await loadRules();
  }


  async function applyRuleAndRun(rule: any) {
    const vals = valuesFromAST(rule.ast);
    state.setFilterValues(vals);


    // reflect active combos based on present value buckets
    state.setFundamentalSel(
      allFilters.filter(f => f.group === 'fundamental' && vals[f.id] !== undefined).map(f => f.id)
    );
    state.setTechnicalSel(
      allFilters.filter(f => f.group === 'technical' && vals[f.id] !== undefined).map(f => f.id)
    );


    await runWithAst(rule.ast, 50, false);
  }


  function openViewModal(rule: any) {
    const vals = valuesFromAST(rule.ast);
    const fields = summaryFromValues(vals);
    state.setViewData({ name: rule.name, fields });
    state.setViewOpen(true);
  }


  return { run, loadMore, runWithAst, saveRule, loadRules, deleteRule, applyRuleAndRun, openViewModal };
}






