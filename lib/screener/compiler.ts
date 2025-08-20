export * from '../compiler';
if (id === 'pv.priceChangePctN.gte' && typeof params.pct === 'number') {
  plan.historical.push({ kind: 'priceChangePctNDays', days: params.days, pct: params.pct, op: 'gte' });
  return;
}
if (id === 'pv.priceChangePctN.lte' && typeof params.pct === 'number') {
  plan.historical.push({ kind: 'priceChangePctNDays', days: params.days, pct: params.pct, op: 'lte' });
  return;
}
