'use client';
import { FilterModule } from '@/lib/filterTypes';

function marketCapOptions(): { label: string; value: string }[] {
  const opts: { label: string; value: string }[] = [{ label: 'Any', value: '' }];
  // Minimum option: $500M
  opts.push({ label: '$500M', value: String(500_000_000) });
  // Then $500B steps up to $5T
  for (let v = 500_000_000_000; v <= 5_000_000_000_000; v += 500_000_000_000) {
    const trillions = v / 1_000_000_000_000;
    const billions = v / 1_000_000_000;
    const label = v >= 1_000_000_000_000 ? `$${trillions}T` : `$${billions}B`;
    opts.push({ label, value: String(v) });
  }
  return opts;
}

export const marketCapFilter: FilterModule = {
  id: 'base.marketCap',
  label: 'Market Cap',
  group: 'fundamental',

  Component: ({ value, onChange }) => {
    const opts = marketCapOptions();
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Market Cap — Minimum</div>
          <select
            value={value?.min ?? ''}
            onChange={(e) => onChange({ ...value, min: e.target.value })}
            style={{ width: '100%' }}
          >
            {opts.map((o) => (
              <option key={`min-${o.value || 'any'}`} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Market Cap — Maximum</div>
          <select
            value={value?.max ?? ''}
            onChange={(e) => onChange({ ...value, max: e.target.value })}
            style={{ width: '100%' }}
          >
            {opts.map((o) => (
              <option key={`max-${o.value || 'any'}`} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  },

  toAST: (v) => {
    const out = [];
    if (v?.min) {
      const n = Number(v.min);
      if (Number.isFinite(n)) out.push({ type: 'condition', id: 'base.marketCapMin', params: { value: n } });
    }
    if (v?.max) {
      const n = Number(v.max);
      if (Number.isFinite(n)) out.push({ type: 'condition', id: 'base.marketCapMax', params: { value: n } });
    }
    return out;
  },

  fromAST: (ast) => {
    if (ast.type !== 'condition') return undefined;
    if (ast.id === 'base.marketCapMin') return { min: String(ast.params?.value ?? '') };
    if (ast.id === 'base.marketCapMax') return { max: String(ast.params?.value ?? '') };
    return undefined;
  },

  summarize: (v): Record<string, string> => {
    const s: Record<string, string> = {};
    if (v && v.min) s['Market Cap Min (USD)'] = String(v.min);
    if (v && v.max) s['Market Cap Max (USD)'] = String(v.max);
    return s;
  }
};
