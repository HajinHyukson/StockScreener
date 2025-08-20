// lib/utils/format.ts
export function formatInt(n?: number) {
  if (typeof n !== 'number' || !isFinite(n)) return '—';
  return n.toLocaleString('en-US');
}
export function formatUsd(n?: number) {
  if (typeof n !== 'number' || !isFinite(n)) return '—';
  return `$${n.toLocaleString('en-US')}`;
}
export function formatPct(n?: number) {
  if (typeof n !== 'number' || !isFinite(n)) return '—';
  const sign = n > 0 ? '+' : n < 0 ? '' : '';
  return `${sign}${n.toFixed(2)}%`;
}
export function formatKST(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}
