'use client';
import { useScreener } from '@/screener/ui/ScreenerProvider';
import MultiComboBox from '@/components/MultiComboBox';


export default function Combos() {
  const { fundamentalOptions, technicalOptions, state } = useScreener();
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
      <div>
        <div style={{ fontSize: 12, color: '#64748b' }}>Fundamental</div>
        <MultiComboBox
          options={fundamentalOptions}
          values={state.fundamentalSel}
          onChange={(vals) => state.setFundamentalSel(vals)}
        />
      </div>
      <div>
        <div style={{ fontSize: 12, color: '#64748b' }}>Technical</div>
        <MultiComboBox
          options={technicalOptions}
          values={state.technicalSel}
          onChange={(vals) => state.setTechnicalSel(vals)}
        />
      </div>
    </div>
  );
}
