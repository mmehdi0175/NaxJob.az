export function formatSalary(
  min: number | null,
  max: number | null,
  visible: boolean,
  currency: string = 'AZN'
): string {
  if (!visible) return ' razıqlaşma yolu ilə';
  if (min === null && max === null) return ' razıqlaşma yolu ilə';
  if (min !== null && max !== null) {
    return `${formatNumber(min)} - ${formatNumber(max)} ${currency}`;
  }
  if (min !== null) return `${formatNumber(min)} ${currency} -dan`;
  return `${formatNumber(max!)} ${currency} -ə qədər`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString('az-AZ');
}

const AZ_MONTHS = [
  'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avqust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr',
];

export function formatDate(date: string | null): string {
  if (!date) return '-';
  const d = new Date(date);
  return `${d.getDate()} ${AZ_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateShort(date: string | null): string {
  if (!date) return '-';
  const d = new Date(date);
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
}

export function formatDateTime(date: string | null): string {
  if (!date) return '-';
  const d = new Date(date);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${formatDate(date)}, ${h}:${m}`;
}

export function timeAgo(date: string | null): string {
  if (!date) return '-';
  const now = new Date();
  const past = new Date(date);
  const diff = now.getTime() - past.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 30) return formatDate(date);
  if (days > 0) return `${days} gün əvvəl`;
  if (hours > 0) return `${hours} saat əvvəl`;
  if (minutes > 0) return `${minutes} dəqiqə əvvəl`;
  return 'az əvvəl';
}

export function daysUntilExpiry(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - new Date().getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
