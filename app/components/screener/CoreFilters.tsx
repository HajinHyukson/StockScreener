'use client';
import { useScreener } from '@/screener/ui/ScreenerProvider';


export default function CoreFilters() {
  const { allFilters, state } = useScreener();
  const Xchg = allFilters.find(f => f.id === 'base.exchange')!.Component;
  const Sect = allFilters.find(f => f.id === 'base.sector')!.Component;
  const Pchg = allFilters.find(f => f.id === 'pv.priceChangePctN')!.Component;


  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10, marginBottom: 10 }}>
      <div>
        <Xchg
          value={state.filterValues['base.exchange']}
          onChange={(v: any) => state.setFilterValues((s: any) => ({ ...s, 'base.exchange': v }))}
        />
      </div>
      <div>
        <Sect
          value={state.filterValues['base.sector']}
          onChange={(v: any) => state.setFilterValues((s: any) => ({ ...s, 'base.sector': v }))}
        />
      </div>
      <div style={{ gridColumn: 'span 2' }}>
        <Pchg
          value={state.filterValues['pv.priceChangePctN']}
          onChange={(v: any) => state.setFilterValues((s: any) => ({ ...s, 'pv.priceChangePctN': v }))}
        />
      </div>
    </div>
  );
}


