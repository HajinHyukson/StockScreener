'use client';
import { useScreener } from '@/screener/ui/ScreenerProvider';


export default function SelectedPanels() {
  const { state, allFilters } = useScreener();


  return (
    <>
      {state.fundamentalSel.map(fid => {
        const f = allFilters.find(ff => ff.id === fid); if (!f) return null;
        const Mod = f.Component;
        return (
          <div key={fid} style={{ marginBottom: 10, border: '1px solid #e2e8f0', borderRadius: 10, padding: 10 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Fundamental — {f.label}</div>
            <Mod value={state.filterValues[fid]} onChange={(v: any) => state.setFilterValues((s: any) => ({ ...s, [fid]: v }))} />
          </div>
        );
      })}
      {state.technicalSel.map(tid => {
        const f = allFilters.find(ff => ff.id === tid); if (!f) return null;
        const Mod = f.Component;
        return (
          <div key={tid} style={{ marginBottom: 10, border: '1px solid #e2e8f0', borderRadius: 10, padding: 10 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Technical — {f.label}</div>
            <Mod value={state.filterValues[tid]} onChange={(v: any) => state.setFilterValues((s: any) => ({ ...s, [tid]: v }))} />
          </div>
        );
      })}
    </>
  );
}
