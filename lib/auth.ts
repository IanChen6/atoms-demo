import { db } from './server';
export function cookie(request: Request, name: string) {
  return request.headers
    .get('cookie')
    ?.split(';')
    .map((x) => x.trim())
    .find((x) => x.startsWith(name + '='))
    ?.slice(name.length + 1);
}
export async function digest(value: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)),
    ),
    (x) => x.toString(16).padStart(2, '0'),
  ).join('');
}
export async function user(request: Request) {
  const token = cookie(request, 'atom_auth');
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  return db()
    .prepare(
      'SELECT users.id,users.email,users.name FROM sessions JOIN users ON users.id = sessions.user WHERE sessions.token = ? AND sessions.expires > ?',
    )
    .bind(await digest(token), Date.now())
    .first<{ id: string; email: string; name: string }>();
}
export function authCookie(request: Request, value: string, age = 604800) {
  return `atom_auth=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`;
}
export function sameOrigin(request: Request) {
  return request.headers.get('origin') === new URL(request.url).origin;
}
export async function limited(key: string, max: number) {
  const now = Date.now();
  const row = await db()
    .prepare(
      'INSERT INTO auth_attempts (key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires < ? THEN 1 ELSE count+1 END, expires=CASE WHEN expires < ? THEN excluded.expires ELSE expires END RETURNING count',
    )
    .bind(key, now + 900000, now, now)
    .first<{ count: number }>();
  return !row || row.count > max;
}
