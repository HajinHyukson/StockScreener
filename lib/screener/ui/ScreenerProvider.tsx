'use client';
import React, { createContext, useContext, useEffect } from 'react';
import { allFilters } from '@/filters';
import { useScreenerState } from '@/screener/hooks/useScreenerState';
import { useCombos } from '@/screener/hooks/useCombos';
import { useScreenerActions } from '@/screener/hooks/useScreenerActions';
import { useResultsView } from '@/screener/hooks/useResultsView';


type ScreenerCtx = ReturnType<typeof buildCtx>;
const Ctx = createContext<ScreenerCtx | null>(null);


function buildCtx() {
  const state = useScreenerState<any>();
  const combos = useCombos(state.fundamentalSel, state.technicalSel);
  const actions = useScreenerActions(state, { pruneInactive: combos.pruneInactive });
  const view = useResultsView(state);
  return { state, actions, view, allFilters, ...combos };
}


export function ScreenerProvider({ children }: { children: React.ReactNode }) {
  const ctx = buildCtx();
  // Load rules on mount; feels right here so every section sees them
  useEffect(() => { ctx.actions.loadRules(); /* eslint-disable-next-line */ }, []);
  return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>;
}


export function useScreener() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useScreener must be used within <ScreenerProvider>');
  return v;
}
