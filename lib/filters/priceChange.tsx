'use client';
import { FilterModule } from '@/lib/filterTypes';
import type { RuleAST } from '@/lib/types';

export const priceChangeFilter: FilterModule = {
  id: 'pv.priceChangePctN',
  label: 'Price Change',
  group: 'always',

  Component: ({ value, onChange }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      <div>
        <div style={{ fontSize: 12, color: '#64748b' }}>Price Change ≥ (%)</div>
        <input
          value={value?.pct ?? ''}
          onChange={(e) => onChange({ ...value, pct: e.target.value })}
          inputMode="decimal"
          style={{ width: '100%' }}
        />
      </div>
      <div>
        <div style={{ fontSize: 12, color: '#64748b' }}>Over Last (days)</div>
        <input
          value={value?.days ?? ''}
          onChange={(e) => onChange({ ...value, days: e.target.value })}
          inputMode="numeric"
          style={{ width: '100%' }}
        />
      </div>
    </div>
  ),

  toAST: (v) => {
  const days = Number(v?.days);
  const pct = Number(v?.pct);
  const op = v?.op ?? 'gte'; // default to greater-than

  if (!Number.isFinite(days) || !Number.isFinite(pct)) return [];

  return [{
    type: 'condition',
    id: `pv.priceChangePctN.${op}`,   // e.g. "pv.priceChangePctN.gte" or "pv.priceChangePctN.lte"
    params: { days, pct }
  }];
},

  fromAST: (ast: RuleAST) =>
    ast.type === 'condition' && ast.id === 'pv.priceChangePctN'
      ? { pct: String(ast.params?.pct ?? ''), days: String(ast.params?.days ?? '') }
      : undefined,

  summarize: (v): Record<string, string> => {
    const out: Record<string, string> = {};
    const pct = Number(v?.pct);
    const days = Number(v?.days);
    if (Number.isFinite(pct)) out['Price change ≥ (%)'] = String(pct);
    if (Number.isFinite(days)) out['Over last (days)'] = String(days);
    return out;
  }
};


