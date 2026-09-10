export const defaultLimits = {
  perMinute: 5,
  perDay: 30,
  globalPerDay: 100,
  concurrent: 1,
  maxInputBytes: 24000,
  maxOutputTokens: 6000,
};
// One atomic INSERT ... SELECT checks and reserves all allowances. Separate
// read-then-write checks would let concurrent Workers exceed the global cap.
export const reservationSQL = `INSERT INTO ai_calls (id,user,created,lease,status)
 SELECT ?,?,?,?,'pending'
 WHERE (SELECT COUNT(*) FROM ai_calls WHERE user=? AND created>?) < ?
 AND (SELECT COUNT(*) FROM ai_calls WHERE user=? AND created>=?) < ?
 AND (SELECT COUNT(*) FROM ai_calls WHERE created>=?) < ?
 AND NOT EXISTS (SELECT 1 FROM ai_calls WHERE user=? AND status='pending' AND lease>?)`;
export function dayStart(now: number) {
  const offset = 8 * 3600000;
  return Math.floor((now + offset) / 86400000) * 86400000 - offset;
}
export function reservationArgs(
  id: string,
  account: string,
  now: number,
  limits = defaultLimits,
) {
  return [
    id,
    account,
    now,
    now + 120000,
    account,
    now - 60000,
    limits.perMinute,
    account,
    dayStart(now),
    limits.perDay,
    dayStart(now),
    limits.globalPerDay,
    account,
    now,
  ];
}
