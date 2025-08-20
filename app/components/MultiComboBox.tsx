'use client';
import { useMemo, useState } from 'react';
import type { ComboOption } from './ComboBox';


export default function MultiComboBox({
  options,
  values,
  onChange,
  placeholder = 'Select...',
  width = '100%',
}: {
  options: ComboOption[];
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  width?: string | number;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');


  const label = useMemo(() => {
    if (!values?.length) return '';
    const labels = values.map(v => options.find(o => o.value === v)?.label).filter(Boolean) as string[];
    return labels.join(', ');
  }, [values, options]);


  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(o => o.label.toLowerCase().includes(q));
  }, [options, query]);


  const toggle = (v: string) => {
    const set = new Set(values || []);
    if (set.has(v)) set.delete(v); else set.add(v);
    onChange(Array.from(set));
  };


  return (
    <div style={{ position: 'relative', width }}>
      <div
        style={{
          display: 'flex', gap: 6, alignItems: 'center',
          border: '1px solid #cbd5e1', borderRadius: 6, padding: '6px 8px', background: '#fff'
        }}
        onClick={() => setOpen(true)}
      >
        <input
          value={open ? query : label}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent' }}
        />
        <span style={{ fontSize: 12, color: '#64748b' }}>▾</span>
      </div>


      {open && (
        <div
          style={{
            position: 'absolute', zIndex: 20, top: 'calc(100% + 4px)', left: 0, right: 0,
            maxHeight: 240, overflowY: 'auto', border: '1px solid #e2e8f0', background: '#fff', borderRadius: 6
          }}
        >
          {filtered.length === 0 ? (
            <div style={{ padding: 8, color: '#94a3b8', fontSize: 14 }}>No matches</div>
          ) : filtered.map((o) => {
              const checked = values?.includes(o.value);
              return (
                <label
                  key={o.value}
                  onMouseDown={(e) => e.preventDefault()}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px', cursor: 'pointer', background: checked ? '#f1f5f9' : undefined
                  }}
                  onClick={() => toggle(o.value)}
                >
                  <input type="checkbox" readOnly checked={checked} />
                  <span>{o.label}</span>
                </label>
              );
            })}
        </div>
      )}


      {open && (
        <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
      )}
    </div>
  );
}
