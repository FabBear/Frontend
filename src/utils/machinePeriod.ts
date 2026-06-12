import type { MachinePeriodPreset, MachinePeriodRange } from '@/types/machine';

export const DEFAULT_MACHINE_PERIOD_PRESET: MachinePeriodPreset = '24H';

const PERIOD_PRESET_HOURS: Partial<Record<MachinePeriodPreset, number>> = {
  '6H': 6,
  '24H': 24,
  '7D': 24 * 7,
  '30D': 24 * 30,
};

export function isPresetPeriod(value: MachinePeriodPreset): value is Exclude<MachinePeriodPreset, 'CUSTOM'> {
  return value !== 'CUSTOM';
}

export function toDateTimeLocalValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function parseDateTimeLocal(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getMachinePeriodEndDate(anchorMeasuredAt?: string): Date {
  const measuredAt = new Date(anchorMeasuredAt || '');
  return Number.isNaN(measuredAt.getTime()) ? new Date() : measuredAt;
}

export function createMachinePeriodRange(
  anchorMeasuredAt: string | undefined,
  preset: MachinePeriodPreset = DEFAULT_MACHINE_PERIOD_PRESET
): MachinePeriodRange {
  const effectivePreset = isPresetPeriod(preset) ? preset : DEFAULT_MACHINE_PERIOD_PRESET;
  const to = getMachinePeriodEndDate(anchorMeasuredAt);
  const hours = PERIOD_PRESET_HOURS[effectivePreset] ?? PERIOD_PRESET_HOURS[DEFAULT_MACHINE_PERIOD_PRESET]!;
  const from = new Date(to.getTime() - hours * 60 * 60 * 1000);

  return {
    preset: effectivePreset,
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

export function createCustomMachinePeriodRange(from: Date, to: Date): MachinePeriodRange {
  return {
    preset: 'CUSTOM',
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

export function formatMachinePeriodLabel(value: string): string {
  const date = parseDateTimeLocal(value);
  if (!date) return '-';
  return date.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
