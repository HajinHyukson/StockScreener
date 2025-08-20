'use client';
import { useState } from 'react';
import type { RuleAST } from '@/types';


export type SavedRule = {
  id: string;
  name: string;
  ast: RuleAST;
  createdAt: string;
  updatedAt: string;
};


export function useScreenerState<Row = any>() {
  // Filter values (bucketed by filter id)
  const [filterValues, setFilterValues] = useState<Record<string, any>>({
    'base.exchange': { value: 'NASDAQ' },
  });


  // Fundamental / Technical multi-select combos
  const [fundamentalSel, setFundamentalSel] = useState<string[]>([]);
  const [technicalSel, setTechnicalSel] = useState<string[]>([]);


  // Data & server paging
  const [serverLimit, setServerLimit] = useState(50);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);


  // Sorting & client pagination
  const [sortKey, setSortKey] =
    useState<'symbol' | 'companyName' | 'price' | 'marketCap' | 'sector' | 'priceChangePct'>('marketCap');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 25;


  // Rules & modals
  const [ruleName, setRuleName] = useState('');
  const [saving, setSaving] = useState(false);
  const [rules, setRules] = useState<SavedRule[]>([]);
  const [loadingRules, setLoadingRules] = useState(false);
  const [rulesError, setRulesError] = useState<string | null>(null);


  const [viewOpen, setViewOpen] = useState(false);
  const [viewData, setViewData] = useState<{ name: string; fields: Record<string, string> } | null>(null);
  const [explainOpen, setExplainOpen] = useState(false);
  const [explainRow, setExplainRow] = useState<Row | null>(null);


  const [helpOpen, setHelpOpen] = useState(false);
  const [asOf, setAsOf] = useState<string | null>(null);


  return {
    // filter values
    filterValues, setFilterValues,


    // combos
    fundamentalSel, setFundamentalSel,
    technicalSel, setTechnicalSel,


    // data/paging
    serverLimit, setServerLimit,
    rows, setRows,
    loading, setLoading,
    err, setErr,
    hasMore, setHasMore,


    // sorting/paging
    sortKey, setSortKey,
    sortDir, setSortDir,
    page, setPage,
    pageSize,


    // rules
    ruleName, setRuleName,
    saving, setSaving,
    rules, setRules,
    loadingRules, setLoadingRules,
    rulesError, setRulesError,


    // modals & helpers
    viewOpen, setViewOpen,
    viewData, setViewData,
    explainOpen, setExplainOpen,
    explainRow, setExplainRow,


    helpOpen, setHelpOpen,
    asOf, setAsOf,
  };
}


