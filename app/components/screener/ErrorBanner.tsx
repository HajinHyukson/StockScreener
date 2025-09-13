'use client';
import { useScreener } from '@/screener/ui/ScreenerProvider';


export default function ErrorBanner() {
  const { state } = useScreener();
  if (!state.err) return null;
  return (
    <div style={{ marginTop: 10, color: '#b91c1c', background: '#fee2e2', padding: 8, borderRadius: 8 }}>
      Error: {state.err}
    </div>
  );
}
