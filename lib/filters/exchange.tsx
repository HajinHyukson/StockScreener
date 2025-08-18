'use client';
import { FilterModule } from '@/lib/filterTypes';

export const exchangeFilter: FilterModule = {
  id: 'base.exchange',
  label: 'Exchange',
  group: 'always',

  Component: ({ value, onChange }) => (
    <div>
      <div style={{ fontSize: 12, color: '#64748b' }}>Exchange</div>
      <select
        value={value?.value ?? 'NASDAQ'}
        onChange={(e) => onChange({ value: e.target.value })}
        style={{ width: '100%' }}
      >
        <option>NASDAQ</option>
        <option>NYSE</option>
        <option>AMEX</option>
      </select>
    </div>
  ),

  toAST: (v) => v?.value ? [{ type: 'condition', id: 'base.exchange', params: { value: v.value } }] : [],
  fromAST: (ast) =>
    ast.type === 'condition' && ast.id === 'base.exchange' && typeof ast.params?.value === 'string'
      ? { value: ast.params.value }
      : undefined,
   summarize: (v): Record<string, string> => {
    const out: Record<string, string> = {};
    if (v && typeof v.value === 'string' && v.value.trim() !== '') {
      out['Exchange'] = v.value;
    }
    return out;
  }
};
