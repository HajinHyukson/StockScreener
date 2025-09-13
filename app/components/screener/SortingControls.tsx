'use client';
import { useScreener } from '@/screener/ui/ScreenerProvider';


export default function SortingControls() {
  const { state } = useScreener();
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginBottom: 10 }}>
      <div>
        <div style={{ fontSize: 12, color: '#64748b' }}>Sort By</div>
        <select value={state.sortKey} onChange={(e) => state.setSortKey(e.target.value as any)} style={{ width: '100%' }}>
          <option value="marketCap">Market Cap</option>
          <option value="price">Price</option>
          <option value="priceChangePct">Price Change (%)</option>
          <option value="symbol">Symbol</option>
          <option value="companyName">Company Name</option>
          <option value="sector">Sector</option>
        </select>
      </div>
      <div>
        <div style={{ fontSize: 12, color: '#64748b' }}>Sort Direction</div>
        <select value={state.sortDir} onChange={(e) => state.setSortDir(e.target.value as any)} style={{ width: '100%' }}>
          {state.sortKey === 'marketCap' || state.sortKey === 'price' || state.sortKey === 'priceChangePct'
            ? (<><option value="asc">Low → High</option><option value="desc">High → Low</option></>)
            : (<><option value="asc">A → Z</option><option value="desc">Z → A</option></>)}
        </select>
      </div>
    </div>
  );
}
