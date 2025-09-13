'use client';
import { useScreener } from '@/screener/ui/ScreenerProvider';


export default function RulesList() {
  const { state, actions } = useScreener();
  return (
    <div style={{ marginTop: 16, padding: 12, border: '1px solid #e2e8f0', borderRadius: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontWeight: 600 }}>My Rules</div>
        <button onClick={actions.loadRules} disabled={state.loadingRules}>
          {state.loadingRules ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      {state.rulesError && <div style={{ color: '#b91c1c', marginTop: 8 }}>Error: {state.rulesError}</div>}
      <div style={{ marginTop: 8, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
            <th style={{ padding: 8 }}>Name</th><th style={{ padding: 8 }}>Updated</th><th style={{ padding: 8 }}>Actions</th>
          </tr></thead>
          <tbody>
            {state.rules.map((r) => (
              <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: 8 }}>
                  <a href="#" onClick={(e) => { e.preventDefault(); actions.applyRuleAndRun(r); }} style={{ color: '#2563eb', textDecoration: 'none' }}>
                    {r.name}
                  </a>
                </td>
                <td style={{ padding: 8, color: '#64748b' }}>{new Date(r.updatedAt).toLocaleString()}</td>
                <td style={{ padding: 8, display: 'flex', gap: 8 }}>
                  <button onClick={() => actions.openViewModal(r)}>View</button>
                  <button onClick={() => actions.deleteRule(r.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {state.rules.length === 0 && !state.loadingRules && (
              <tr><td colSpan={3} style={{ padding: 8, color: '#64748b' }}>No saved rules yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
