import { hash, compare } from 'bcryptjs';
import { db, json, error, owner } from '@/lib/server';
import {
  user,
  cookie,
  digest,
  authCookie,
  sameOrigin,
  limited,
} from '@/lib/auth';
export async function GET(request: Request) {
  try {
    return json({ user: await user(request) });
  } catch {
    return error('账号服务暂时不可用', 503);
  }
}
export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) return error('请求来源不匹配', 403);
    const raw = await request.text();
    if (raw.length > 4096) return error('请求过大', 413);
    const body = JSON.parse(raw);
    if (!['register', 'login', 'logout'].includes(body.action))
      return error('操作无效');
    if (body.action === 'logout') {
      const token = cookie(request, 'atom_auth');
      if (token)
        await db()
          .prepare('DELETE FROM sessions WHERE token = ?')
          .bind(await digest(token))
          .run();
      const response = json({ user: null });
      response.headers.set('Set-Cookie', authCookie(request, '', 0));
      return response;
    }
    if (typeof body.email !== 'string' || typeof body.password !== 'string')
      return error('请填写邮箱和密码');
    const email = body.email.trim().toLowerCase(),
      password = body.password;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
      return error('请输入有效邮箱');
    if (password.length < 12 || new TextEncoder().encode(password).length > 72)
      return error('密码至少 12 个字符，且不超过 72 字节');
    const emailKey = 'email:' + (await digest(email));
    const ip = request.headers.get('cf-connecting-ip');
    if (
      (await limited(emailKey, 10)) ||
      (ip && (await limited('ip:' + (await digest(ip)), 50)))
    )
      return error('尝试次数过多，请 15 分钟后再试。', 429);
    let account = await db()
      .prepare('SELECT id,email,name,password FROM users WHERE email = ?')
      .bind(email)
      .first<{ id: string; email: string; name: string; password: string }>();
    if (body.action === 'register') {
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (name.length < 1 || name.length > 40)
        return error('昵称需要 1–40 个字符');
      if (account) return error('无法注册，请尝试登录或使用其他邮箱。', 409);
      account = {
        id: crypto.randomUUID(),
        email,
        name,
        password: await hash(password, 12),
      };
      const result = await db()
        .prepare(
          'INSERT INTO users (id,email,name,password,created) VALUES (?,?,?,?,?) ON CONFLICT(email) DO NOTHING',
        )
        .bind(account.id, email, name, account.password, Date.now())
        .run();
      if (!result.meta.changes)
        return error('无法注册，请尝试登录或使用其他邮箱。', 409);
    } else if (!account || !(await compare(password, account.password))) {
      return error('邮箱或密码不正确', 401);
    }
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (x) =>
      x.toString(16).padStart(2, '0'),
    ).join('');
    const statements = [
      db()
        .prepare('INSERT INTO sessions (token,user,expires) VALUES (?,?,?)')
        .bind(await digest(token), account.id, Date.now() + 604800000),
    ];
    // Claim only the visitor workspace represented by this browser's existing secret cookie.
    const guest = owner(request);
    if (guest)
      statements.push(
        db()
          .prepare('UPDATE projects SET owner = ? WHERE owner = ?')
          .bind(account.id, guest),
      );
    const old = cookie(request, 'atom_auth');
    if (old)
      statements.push(
        db()
          .prepare('DELETE FROM sessions WHERE token = ?')
          .bind(await digest(old)),
      );
    await db().batch(statements);
    const response = json({
      user: { id: account.id, email: account.email, name: account.name },
    });
    response.headers.append('Set-Cookie', authCookie(request, token));
    response.headers.append(
      'Set-Cookie',
      'atom_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0',
    );
    return response;
  } catch {
    return error('无法完成账号操作，请稍后重试。', 500);
  }
}
