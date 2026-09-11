import { db, json, error } from '@/lib/server';
import { user, sameOrigin } from '@/lib/auth';
export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) return error('请求来源不匹配', 403);
    const account = await user(request);
    if (!account) return error('请先登录', 401);
    const raw = await request.text();
    if (raw.length > 1024) return error('请求过大', 413);
    const body = JSON.parse(raw);
    if (typeof body.version !== 'string') return error('请选择版本');
    const source = await db()
      .prepare(
        'SELECT v.html,v.mode,p.title,p.description,p.instructions FROM versions v JOIN projects p ON p.id=v.project WHERE v.id = ? AND p.owner = ?',
      )
      .bind(body.version, account.id)
      .first<{
        html: string;
        mode: string;
        title: string;
        description: string;
        instructions: string;
      }>();
    if (!source) return error('版本不存在', 404);
    const project = crypto.randomUUID(),
      version = crypto.randomUUID(),
      now = Date.now();
    await db().batch([
      db()
        .prepare(
          'INSERT INTO projects (id,owner,title,created,description,instructions) VALUES (?,?,?,?,?,?)',
        )
        .bind(
          project,
          account.id,
          source.title.slice(0, 30) + ' · 分支',
          now,
          source.description,
          source.instructions,
        ),
      db()
        .prepare(
          'INSERT INTO versions (id,project,prompt,html,summary,mode,created) VALUES (?,?,?,?,?,?,?)',
        )
        .bind(
          version,
          project,
          '从历史版本创建分支',
          source.html,
          '已创建独立项目，可以尝试新方向；原项目保持不变。',
          source.mode,
          now,
        ),
    ]);
    return json({ project, version });
  } catch {
    return error('创建分支失败，请重试。', 500);
  }
}
