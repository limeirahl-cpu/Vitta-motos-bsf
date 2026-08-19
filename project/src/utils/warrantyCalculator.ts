import { Motorcycle, RevisionStatus, WarrantyRevision, WarrantyRuleConfig } from '../types';
import { addMonths } from './formatters';

export const DEFAULT_WARRANTY_RULES: WarrantyRuleConfig = {
  skipFirst1000Km: false,
  firstRevisionKm: 1000,
  subsequentIntervalKm: 3000,
  intervalMonths: 6,
  alertDaysTolerance: 30,
  alertKmTolerance: 500,
};

/**
 * Calculates what the target KM for a revision number is.
 * If skipFirst1000Km is set, or if firstRevisionKm is customized (e.g. 3000, 4000):
 * 1 -> firstRevisionKm (e.g. 3000)
 * 2 -> firstRevisionKm + subsequentIntervalKm (e.g. 3000 + 3000 = 6000)
 * 3 -> firstRevisionKm + 2 * subsequentIntervalKm (e.g. 3000 + 6000 = 9000)
 * n -> firstRevisionKm + (n - 1) * subsequentIntervalKm
 */
export function calculateTargetKm(
  revisionNumber: number,
  rules: WarrantyRuleConfig = DEFAULT_WARRANTY_RULES
): number {
  const initialKm = rules.firstRevisionKm || 1000;
  const interval = rules.subsequentIntervalKm || 3000;
  if (revisionNumber <= 1) {
    return initialKm;
  }
  return initialKm + (revisionNumber - 1) * interval;
}

/**
 * Calculates target date for next revision given last base date
 */
export function calculateTargetDate(
  baseDate: string,
  rules: WarrantyRuleConfig = DEFAULT_WARRANTY_RULES
): string {
  return addMonths(baseDate, rules.intervalMonths);
}

/**
 * Evaluates the status of a pending revision based on current KM, target KM, target date and today's date.
 */
export function evaluateRevisionStatus(
  targetKm: number,
  maxDate: string,
  currentKm: number,
  todayStr?: string,
  rules: WarrantyRuleConfig = DEFAULT_WARRANTY_RULES
): RevisionStatus {
  const today = todayStr || new Date().toISOString().split('T')[0];
  
  const todayTime = new Date(today).getTime();
  const maxDateTime = new Date(maxDate).getTime();
  const daysDiff = Math.round((maxDateTime - todayTime) / (1000 * 60 * 60 * 24));
  const kmDiff = targetKm - currentKm;

  // If already reached KM or past max date
  if (kmDiff <= 0 || daysDiff < 0) {
    return 'ATRASADA';
  }

  // If very close (within 7 days or 150 km)
  if (daysDiff <= 7 || kmDiff <= 150) {
    return 'VENCENDO';
  }

  // If within alert tolerance (e.g. 30 days or 500 km)
  if (daysDiff <= rules.alertDaysTolerance || kmDiff <= rules.alertKmTolerance) {
    return 'PROXIMA';
  }

  return 'DISTANTE';
}

/**
 * Given a motorcycle and its completed revisions list, computes what the next scheduled revision is.
 */
export function computeNextScheduledRevision(
  motorcycle: Motorcycle,
  existingRevisions: WarrantyRevision[],
  rules: WarrantyRuleConfig = DEFAULT_WARRANTY_RULES
): {
  revisionNumber: number;
  targetKm: number;
  maxDate: string;
  status: RevisionStatus;
} {
  const completedRevs = existingRevisions
    .filter((r) => r.motorcycleId === motorcycle.id && r.completed)
    .sort((a, b) => a.revisionNumber - b.revisionNumber);

  const nextRevisionNumber = completedRevs.length + 1;
  const targetKm = calculateTargetKm(nextRevisionNumber, rules);

  let baseDate = motorcycle.warrantyStartDate || motorcycle.saleDate;
  if (completedRevs.length > 0) {
    const lastRev = completedRevs[completedRevs.length - 1];
    baseDate = lastRev.completedDate || baseDate;
  }

  const maxDate = calculateTargetDate(baseDate, rules);
  const status = evaluateRevisionStatus(targetKm, maxDate, motorcycle.currentKm, undefined, rules);

  return {
    revisionNumber: nextRevisionNumber,
    targetKm,
    maxDate,
    status,
  };
}
