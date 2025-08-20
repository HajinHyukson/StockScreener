'use client';
import { useState } from 'react';
import type { RuleAST, SavedRule as RuleDto } from '@/types';


export function useScreenerState<Row = any>() {
  const [filterValues, setFilterValues] = useState<Record<string, any>>({ 'base.exchange': { value: 'NASDAQ' } });
  const [fundamentalSel, setFundamentalSel] = useState<string[]>([]);
  const [technicalSel, setTechnicalSel] = useState<string[]>([]);
  const [serverLimit, setServerLimit] = useState(50);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [sortKey, setSortKey] = useState<'symbol'|'companyName'|'price'|'marketCap'|'sector'|'priceChangePct'>('marketCap');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 25;


  const [ruleName, setRuleName] = useState('');
  const [saving, setSaving] = useState(false);
  const [rules, setRules] = useState<RuleDto[]>([]);
  const [loadingRules, setLoadingRules] = useState(false);
  const [rulesError, setRulesError] = useState<string | null>(null);


  const [viewOpen, setViewOpen] = useState(false);
  const [viewData, setViewData] = useState<{ name: string; fields: Record<string, string> } | null>(null);
  const [explainOpen, setExplainOpen] = useState(false);
  const [explainRow, setExplainRow] = useState<Row | null>(null);


  const [helpOpen, setHelpOpen] = useState(false);
  const [asOf, setAsOf] = useState<string | null>(null);


  return {
    filterValues, setFilterValues,
    fundamentalSel, setFundamentalSel,
    technicalSel, setTechnicalSel,
    serverLimit, setServerLimit,
    rows, setRows, loading, setLoading, err, setErr, hasMore, setHasMore,
    sortKey, setSortKey, sortDir, setSortDir, page, setPage, pageSize,
    ruleName, setRuleName, saving, setSaving, rules, setRules, loadingRules, setLoadingRules, rulesError, setRulesError,
    viewOpen, setViewOpen, viewData, setViewData, explainOpen, setExplainOpen, explainRow, setExplainRow,
    helpOpen, setHelpOpen, asOf, setAsOf,
  };
}
