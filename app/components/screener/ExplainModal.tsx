'use client';
import { useScreener } from '@/screener/ui/ScreenerProvider';


export default function ExplainModal() {
  const { state } = useScreener();
  if (!state.explainOpen || !state.explainRow) return null;
  return (
    <div role="dialog" aria-modal="true"
         style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
         onClick={() => state.setExplainOpen(false)}>
      <div style={{ background: 'white', borderRadius: 12, width: '100%', maxWidth: 520 }}
           onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: 16, borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 700 }}>Why did {state.explainRow.symbol} match?</div>
          <button onClick={() => state.setExplainOpen(false)} style={{ padding: '6px 10px' }}>Close</button>
        </div>
        <div style={{ padding: 16 }}>
          {Array.isArray(state.explainRow.explain) ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: 8 }}>Condition</th><th style={{ padding: 8 }}>Value</th><th style={{ padding: 8 }}>Pass?</th>
              </tr></thead>
              <tbody>
                {state.explainRow.explain.map((e, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: 8 }}>{e.id}</td>
                    <td style={{ padding: 8 }}>{e.value ?? '—'}</td>
                    <td style={{ padding: 8, color: e.pass ? '#16a34a' : '#b91c1c' }}>{e.pass ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div style={{ color: '#64748b' }}>No explain data.</div>}
        </div>
        <div style={{ padding: 16, borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={() => state.setExplainOpen(false)} style={{ padding: '8px 14px' }}>OK</button>
        </div>
      </div>
    </div>
  );
}
