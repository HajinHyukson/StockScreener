'use client';
import { FilterModule } from '@/lib/filterTypes';
import type { RuleAST } from '@/lib/types';


export const perFilter: FilterModule = {
  id: 'fa.per',               // UI state bucket lives here
  label: 'PER (P/E)',
  group: 'fundamental',


  Component: ({ value, onChange }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      <div>
        <div style={{ fontSize: 12, color: '#64748b' }}>Condition</div>
        <select
          value={value?.op ?? 'lte'}
          onChange={(e) => onChange({ ...value, op: e.target.value })}
          style={{ width: '100%' }}
        >
          <option value="lte">PER ≤</option>
          <option value="gte">PER ≥</option>
        </select>
      </div>
      <div>
        <div style={{ fontSize: 12, color: '#64748b' }}>Threshold</div>
        <input
          value={value?.value ?? ''}
          onChange={(e) => onChange({ ...value, value: e.target.value })}
          inputMode="decimal"
          style={{ width: '100%' }}
        />
      </div>
    </div>
  ),


  // Emit base screener params so the compiler can map 1:1 to FMP
  toAST: (v): RuleAST[] => {
    const thr = Number(v?.value);
    const op = v?.op ?? 'lte';
    if (!Number.isFinite(thr)) return [];
    if (op === 'gte') {
      return [{ type: 'condition', id: 'base.peMoreThan', params: { value: thr } }];
    } else {
      return [{ type: 'condition', id: 'base.peLowerThan', params: { value: thr } }];
    }
  },


  // Rehydrate UI from AST nodes
  fromAST: (ast: RuleAST) => {
    if (ast.type !== 'condition') return undefined;
    if (ast.id === 'base.peMoreThan') return { op: 'gte', value: String(ast.params?.value ?? '') };
    if (ast.id === 'base.peLowerThan') return { op: 'lte', value: String(ast.params?.value ?? '') };
    return undefined;
  },


  summarize: (v): Record<string, string> => {
    const out: Record<string, string> = {};
    const thr = Number(v?.value);
    if (!Number.isFinite(thr)) return out;
    out['PER condition'] = (v?.op ?? 'lte') === 'lte' ? '≤' : '≥';
    out['PER threshold'] = String(thr);
    return out;
  }
};
