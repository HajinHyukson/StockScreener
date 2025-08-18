'use client';
import { FilterModule } from '@/lib/filterTypes';
import type { RuleAST } from '@/lib/types';

export const rsiFilter: FilterModule = {
  id: 'ti.rsi',
  label: 'RSI',
  group: 'technical',

  Component: ({ value, onChange }) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
      <div>
        <div style={{ fontSize: 12, color: '#64748b' }}>Timeframe</div>
        <select
          value={value?.timeframe ?? 'daily'}
          onChange={(e) => onChange({ ...value, timeframe: e.target.value })}
          style={{ width: '100%' }}
        >
          <option value="daily">Daily</option>
          <option value="1min">1 min</option>
          <option value="5min">5 min</option>
          <option value="15min">15 min</option>
          <option value="30min">30 min</option>
          <option value="1hour">1 hour</option>
        </select>
      </div>
      <div>
        <div style={{ fontSize: 12, color: '#64748b' }}>Period</div>
        <input
          value={value?.period ?? '14'}
          onChange={(e) => onChange({ ...value, period: e.target.value })}
          inputMode="numeric"
          style={{ width: '100%' }}
        />
      </div>
      <div>
        <div style={{ fontSize: 12, color: '#64748b' }}>Condition</div>
        <select
          value={value?.op ?? 'lte'}
          onChange={(e) => onChange({ ...value, op: e.target.value })}
          style={{ width: '100%' }}
        >
          <option value="lte">RSI ≤</option>
          <option value="gte">RSI ≥</option>
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

  toAST: (v): RuleAST[] => {
    const th = Number(v?.value);
    const period = Number(v?.period ?? 14);
    const tf = v?.timeframe ?? 'daily';
    const op = v?.op ?? 'lte';
    if (Number.isFinite(th) && Number.isFinite(period)) {
      return [{ type: 'condition', id: 'ti.rsi', params: { timeframe: tf, period, op, value: th } }];
    }
    return [];
  },

  fromAST: (ast: RuleAST) =>
    ast.type === 'condition' && ast.id === 'ti.rsi'
      ? {
          timeframe: ast.params?.timeframe ?? 'daily',
          period: String(ast.params?.period ?? '14'),
          op: ast.params?.op ?? 'lte',
          value: String(ast.params?.value ?? '')
        }
      : undefined,

  summarize: (v): Record<string, string> => {
    const out: Record<string, string> = {};
    const thr = Number(v?.value);
    if (!Number.isFinite(thr)) return out;
    out['RSI timeframe'] = String(v?.timeframe ?? 'daily');
    out['RSI period'] = String(v?.period ?? '14');
    out['RSI condition'] = (v?.op ?? 'lte') === 'lte' ? '≤' : '≥';
    out['RSI threshold'] = String(thr);
    return out;
  }
};
