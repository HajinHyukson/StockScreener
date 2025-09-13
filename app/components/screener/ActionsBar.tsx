'use client';
import { useScreener } from '@/screener/ui/ScreenerProvider';


export default function ActionsBar() {
  const { state, actions } = useScreener();
  return (
    <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
      <button onClick={actions.run} disabled={state.loading}>{state.loading ? 'Loading…' : 'Run'}</button>
      <button
        onClick={() => {
          state.setFilterValues({ 'base.exchange': { value: 'NASDAQ' }, 'base.sector': { value: '' } });
          state.setFundamentalSel([]);
          state.setTechnicalSel([]);
        }}
      >
        Reset
      </button>
    </div>
  );
}
