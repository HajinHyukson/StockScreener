'use client';
import { useScreener } from '@/screener/ui/ScreenerProvider';


export default function ViewRuleModal() {
  const { state } = useScreener();
  if (!state.viewOpen || !state.viewData) return null;
  return (
    <div role="dialog" aria-modal="true"
         style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
         onClick={() => state.setViewOpen(false)}>
      <div style={{ background: 'white', borderRadius: 12, width: '100%', maxWidth: 520 }}
           onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: 16, borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 700 }}>{state.viewData.name}</div>
          <button onClick={() => state.setViewOpen(false)} style={{ padding: '6px 10px' }}>Close</button>
        </div>
        <div style={{ padding: 16 }}>
          <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {Object.entries(state.viewData.fields).map(([k, v]) => (
              <div key={k} style={{ display: 'contents' }}>
                <dt style={{ color: '#64748b' }}>{k}</dt>
                <dd style={{ textAlign: 'right' }}>{v}</dd>
              </div>
            ))}
          </dl>
          {Object.keys(state.viewData.fields).length === 0 && <div style={{ color: '#64748b' }}>No parameters set for this rule.</div>}
        </div>
        <div style={{ padding: 16, borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={() => state.setViewOpen(false)} style={{ padding: '8px 14px' }}>OK</button>
        </div>
      </div>
    </div>
  );
}
