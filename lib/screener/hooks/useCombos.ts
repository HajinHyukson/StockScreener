'use client';
import { useMemo } from 'react';
import { allFilters } from '@/filters';


type ComboOption = { value: string; label: string };


export function useCombos(fundamentalSel: string[], technicalSel: string[]) {
  // Alphabetized options derived from the registry
  const fundamentalOptions: ComboOption[] = useMemo(
    () =>
      allFilters
        .filter((f) => f.group === 'fundamental')
        .map((f) => ({ value: f.id, label: f.label }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    []
  );


  const technicalOptions: ComboOption[] = useMemo(
    () =>
      allFilters
        .filter((f) => f.group === 'technical')
        .map((f) => ({ value: f.id, label: f.label }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    []
  );


  // Remove values for filters that are not currently selected in the combos
  function pruneInactive(values: Record<string, any>) {
    const activeFund = new Set(fundamentalSel);
    const activeTech = new Set(technicalSel);
    for (const f of allFilters) {
      if (f.group === 'fundamental' && !activeFund.has(f.id)) delete values[f.id];
      if (f.group === 'technical' && !activeTech.has(f.id)) delete values[f.id];
    }
    return values;
  }


  return { fundamentalOptions, technicalOptions, pruneInactive };
}
