'use client';
import { FilterModule } from '@/lib/filterTypes';

export const sectorFilter: FilterModule = {
  id: 'base.sector',
  label: 'Sector',
  group: 'always',

  Component: ({ value, onChange }) => (
    <div>
      <div style={{ fontSize: 12, color: '#64748b' }}>Sector</div>
      <select
        value={value?.value ?? ''}
        onChange={(e) => onChange({ value: e.target.value })}
        style={{ width: '100%' }}
      >
        <option value="">Any</option>
        <option>Technology</option><option>Financial Services</option><option>Healthcare</option>
        <option>Consumer Cyclical</option><option>Consumer Defensive</option><option>Industrials</option>
        <option>Energy</option><option>Basic Materials</option><option>Utilities</option>
        <option>Real Estate</option><option>Communication Services</option>
      </select>
    </div>
  ),

  toAST: (v) => v?.value ? [{ type: 'condition', id: 'base.sector', params: { value: v.value } }] : [],
  fromAST: (ast) =>
    ast.type === 'condition' && ast.id === 'base.sector' && typeof ast.params?.value === 'string'
      ? { value: ast.params.value }
      : undefined,
   summarize: (v): Record<string, string> => {
    const out: Record<string, string> = {};
    if (v && typeof v.value === 'string' && v.value.trim() !== '') {
      out['Sector'] = v.value;
    }
    return out;
  }

};
