'use client';
import { useScreener } from '@/screener/ui/ScreenerProvider';


export default function PaginationBar() {
  const { state, view, actions } = useScreener();
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
      <button onClick={() => state.setPage((p: number) => Math.max(1, p - 1))} disabled={state.page <= 1}>Prev</button>
      <div style={{ fontSize: 12, color: '#64748b' }}>Page {state.page} / {view.totalPages}</div>
      <button onClick={() => state.setPage((p: number) => p + 1)} disabled={state.page >= view.totalPages}>Next</button>
      <span style={{ flex: '1 0 12px' }} />
      <button onClick={actions.loadMore} disabled={state.loading || !state.hasMore} style={{ padding: '8px 14px' }}>
        {state.hasMore ? (state.loading ? 'Loading…' : 'More (next 50)') : 'No more'}
      </button>
    </div>
  );
}
