'use client';
import { ScreenerProvider } from '@/screener/ui/ScreenerProvider';


import Header from '@/components/screener/Header';
import Intro from '@/components/screener/Intro';
import CoreFilters from '@/components/screener/CoreFilters';
import SortingControls from '@/components/screener/SortingControls';
import Combos from '@/components/screener/Combos';
import SelectedPanels from '@/components/screener/SelectedPanels';
import ActionsBar from '@/components/screener/ActionsBar';
import SaveRulePanel from '@/components/screener/SaveRulePanel';
import RulesList from '@/components/screener/RulesList';
import ErrorBanner from '@/components/screener/ErrorBanner';
import ResultsTable from '@/components/screener/ResultsTable';
import PaginationBar from '@/components/screener/PaginationBar';
import ViewRuleModal from '@/components/screener/ViewRuleModal';
import ExplainModal from '@/components/screener/ExplainModal';


export default function Page() {
  return (
    <ScreenerProvider>
      <main style={{ maxWidth: 1150, margin: '40px auto', padding: 16 }}>
        <Header />
        <Intro />
        <CoreFilters />
        <SortingControls />
        <Combos />
        <SelectedPanels />
        <ActionsBar />
        <SaveRulePanel />
        <RulesList />
        <ErrorBanner />
        <ResultsTable />
        <PaginationBar />
        <ViewRuleModal />
        <ExplainModal />
      </main>
    </ScreenerProvider>
  );
}
