'use client';
import { useScreener } from '@/screener/ui/ScreenerProvider';
import { formatKST } from '@/utils/format';


export default function Header() {
  const { view, state } = useScreener();
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginRight: 8 }}>Stock Screener</h1>
      <div style={{ marginLeft: 'auto', textAlign: 'right', color: '#64748b' }}>
        <div>{view.today}</div>
        <div style={{ fontSize: 12 }}>Data as of: {formatKST(state.asOf ?? undefined)} (KST)</div>
      </div>
    </div>
  );
}






