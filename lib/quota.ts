import { db, bindings } from './server';
import {
  defaultLimits,
  reservationSQL,
  reservationArgs,
  dayStart,
} from './quota-policy';
function configured(key: string, fallback: number, max: number) {
  const raw = (bindings as unknown as Record<string, unknown>)[key];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > max)
    throw new Error('Invalid quota configuration');
  return n;
}
export function limits() {
  return {
    ...defaultLimits,
    perMinute: configured('AI_USER_PER_MINUTE', 5, 100),
    perDay: configured('AI_USER_PER_DAY', 30, 10000),
    globalPerDay: configured('AI_GLOBAL_PER_DAY', 100, 100000),
  };
}
export async function usage(account: string) {
  const now = Date.now(),
    config = limits();
  const row = await db()
    .prepare(
      'SELECT COUNT(*) AS used FROM ai_calls WHERE user=? AND created>=?',
    )
    .bind(account, dayStart(now))
    .first<{ used: number }>();
  return {
    used: row?.used || 0,
    limits: config,
    resetsAt: dayStart(now) + 86400000,
  };
}
export async function reserve(account: string) {
  const now = Date.now(),
    id = crypto.randomUUID();
  const result = await db()
    .prepare(reservationSQL)
    .bind(...reservationArgs(id, account, now, limits()))
    .run();
  return result.meta.changes ? id : null;
}
export async function finish(id: string) {
  await db()
    .prepare("UPDATE ai_calls SET status='finished' WHERE id=?")
    .bind(id)
    .run();
}
