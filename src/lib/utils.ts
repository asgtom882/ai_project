export const SUBJECT_COLORS = [
  { name: 'blue', bg: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', ring: 'ring-blue-500', gradient: 'from-blue-500 to-blue-600' },
  { name: 'emerald', bg: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', ring: 'ring-emerald-500', gradient: 'from-emerald-500 to-emerald-600' },
  { name: 'amber', bg: 'bg-amber-500', light: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', ring: 'ring-amber-500', gradient: 'from-amber-500 to-amber-600' },
  { name: 'rose', bg: 'bg-rose-500', light: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200', ring: 'ring-rose-500', gradient: 'from-rose-500 to-rose-600' },
  { name: 'violet', bg: 'bg-violet-500', light: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200', ring: 'ring-violet-500', gradient: 'from-violet-500 to-violet-600' },
  { name: 'cyan', bg: 'bg-cyan-500', light: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200', ring: 'ring-cyan-500', gradient: 'from-cyan-500 to-cyan-600' },
  { name: 'orange', bg: 'bg-orange-500', light: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', ring: 'ring-orange-500', gradient: 'from-orange-500 to-orange-600' },
  { name: 'teal', bg: 'bg-teal-500', light: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200', ring: 'ring-teal-500', gradient: 'from-teal-500 to-teal-600' },
];

export function getColor(name: string) {
  return SUBJECT_COLORS.find((c) => c.name === name) ?? SUBJECT_COLORS[0];
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function formatHours(hours: number): string {
  if (hours < 0.1) return '0h';
  return `${Math.round(hours * 10) / 10}h`;
}

export function formatDate(date: string | null): string {
  if (!date) return 'No date set';
  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatRelativeDate(date: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date + 'T00:00:00');
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 0 && diff < 7) return `In ${diff} days`;
  if (diff < 0) return `${Math.abs(diff)} days ago`;
  return target.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
