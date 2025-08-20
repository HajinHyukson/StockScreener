'use client';
import { FilterModule } from '@/lib/filterTypes';
import type { RuleAST } from '@/lib/types';

export const priceChangeFilter: FilterModule = {
  id: 'pv.priceChangePctN',
  label: 'Price Change',
  group: 'always',

  Component: ({ value, onChange }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
      <div>
        <div style={{ fontSize: 12, color: '#64748b' }}>Operator</div>
        <select
          value={value?.op ?? 'gte'}
          onChange={(e) => onChange({ ...(value ?? {}), op: e.target.value })}
          style={{ width: '100%' }}
        >
          <option value="gte">≥</option>
          <option value="lte">≤</option>
        </select>
      </div>

      <div>
        <div style={{ fontSize: 12, color: '#64748b' }}>Change (%)</div>
        <input
          value={value?.pct ?? ''}
          onChange={(e) => onChange({ ...(value ?? {}), pct: e.target.value })}
          inputMode="decimal"
          style={{ width: '100%' }}
          placeholder="e.g. 5 or -5"
        />
      </div>

      <div>
        <div style={{ fontSize: 12, color: '#64748b' }}>Over Last (days)</div>
        <input
          value={value?.days ?? ''}
          onChange={(e) => onChange({ ...(value ?? {}), days: e.target.value })}
          inputMode="numeric"
          style={{ width: '100%' }}
          placeholder="e.g. 20"
        />
      </div>
    </div>
  ),

  /**
   * Emit a single condition with op embedded in params.
   * (Keeps backward compatibility: same 'id', richer params.)
   */
  toAST: (v): RuleAST[] => {
    const pct = Number(v?.pct);
    const days = Number(v?.days);
    const op = (v?.op === 'lte' ? 'lte' : 'gte'); // default to gte
    if (!Number.isFinite(pct) || !Number.isFinite(days) || days <= 0) return [];
    return [{
      type: 'condition',
      id: 'pv.priceChangePctN',
      params: { pct, days, op } // <- op included
    }];
  },

  /**
   * Rehydrate UI from AST. Accept both legacy (no op) and new (with op).
   */
  fromAST: (ast: RuleAST) => {
    if (ast.type !== 'condition' || ast.id !== 'pv.priceChangePctN') return undefined;
    const pct = ast.params?.pct;
    const days = ast.params?.days;
    const op = ast.params?.op ?? 'gte';
    return {
      pct: pct !== undefined ? String(pct) : '',
      days: days !== undefined ? String(days) : '',
      op
    };
  },

  summarize: (v): Record<string, string> => {
    const out: Record<string, string> = {};
    const pct = Number(v?.pct);
    const days = Number(v?.days);
    const op = (v?.op === 'lte' ? '≤' : '≥');
    if (Number.isFinite(pct)) out['Price change'] = `${op} ${pct}`;
    if (Number.isFinite(days)) out['Over last (days)'] = String(days);
    return out;
  }
};
