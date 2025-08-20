export type Column = { key: string; label: string; align?: 'left'|'right' };
export function getDefaultColumns(): Column[] {
  return [
    { key: 'symbol', label: 'Symbol' },
    { key: 'companyName', label: 'Company' },
    { key: 'sector', label: 'Sector' },
    { key: 'priceDaily', label: 'Price (Daily %)', align: 'right' }
  ];
}
export function getFilterColumns(fundIds: string[], techIds: string[], hasNDays: boolean): Column[] {
  const cols: Column[] = [];
  if (fundIds.includes('base.marketCap')) cols.push({ key: 'marketCap', label: 'Market Cap', align: 'right' });
  if (fundIds.includes('fa.per'))        cols.push({ key: 'per', label: 'PER', align: 'right' });
  if (techIds.includes('ti.rsi'))        cols.push({ key: 'rsi', label: 'RSI', align: 'right' });
  if (hasNDays)                           cols.push({ key: 'nDays', label: 'Price Δ', align: 'right' });
  cols.push({ key: 'explain', label: 'Explain' });
  return cols;
}
