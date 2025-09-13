'use client';
import { useScreener } from '@/screener/ui/ScreenerProvider';


export default function SaveRulePanel() {
  const { state, actions } = useScreener();
  return (
    <div style={{ marginTop: 16, padding: 12, border: '1px solid #e2e8f0', borderRadius: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Save current filters as a Rule</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={state.ruleName}
          onChange={(e) => state.setRuleName(e.target.value)}
          placeholder="Rule name…"
          style={{ flex: '1 1 320px', padding: 8, border: '1px solid #cbd5e1', borderRadius: 8 }}
        />
        <button onClick={actions.saveRule} disabled={state.saving}>
          {state.saving ? 'Saving…' : 'Save Rule'}
        </button>
      </div>
    </div>
  );
}
