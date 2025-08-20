'use client';
import { useMemo, useState } from 'react';


export type ComboOption = { value: string; label: string };


export default function ComboBox({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  width = '100%',
}: {
  options: ComboOption[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  width?: string | number;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');


  const activeLabel = useMemo(
    () => options.find(o => o.value === value)?.label ?? '',
    [options, value]
  );


  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(o => o.label.toLowerCase().includes(q));
  }, [options, query]);


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
          value={open ? query : activeLabel}
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
            maxHeight: 220, overflowY: 'auto', border: '1px solid #e2e8f0', background: '#fff', borderRadius: 6
          }}
        >
          {filtered.length === 0 ? (
            <div style={{ padding: 8, color: '#94a3b8', fontSize: 14 }}>No matches</div>
          ) : filtered.map((o) => (
            <div
              key={o.value || 'none'}
              onMouseDown={(e) => { e.preventDefault(); onChange(o.value); setQuery(''); setOpen(false); }}
              style={{ padding: '8px 10px', cursor: 'pointer', background: o.value === value ? '#f1f5f9' : undefined }}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}


      {open && (
        <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
      )}
    </div>
  );
}
