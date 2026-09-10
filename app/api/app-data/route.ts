import { user } from '@/lib/auth';
import { db, error, json } from '@/lib/server';

const MAX_DATA_BYTES = 50000;

async function ownedProject(request: Request, project: string) {
  const account = await user(request);
  if (!account) return { failure: error('请先登录', 401) };
  const owned = await db()
    .prepare('SELECT id FROM projects WHERE id = ? AND owner = ?')
    .bind(project, account.id)
    .first();
  if (!owned) return { failure: error('项目不存在', 404) };
  return { account };
}

export async function GET(request: Request) {
  try {
    const project = new URL(request.url).searchParams.get('project') || '';
    if (!project) return error('请选择项目');
    const access = await ownedProject(request, project);
    if (access.failure) return access.failure;
    const row = await db()
      .prepare('SELECT data,updated FROM app_data WHERE project = ?')
      .bind(project)
      .first<{ data: string; updated: number }>();
    return json({
      data: row ? JSON.parse(row.data) : {},
      updated: row?.updated || null,
    });
  } catch {
    return error('无法读取应用数据，请稍后重试。', 503);
  }
}

export async function POST(request: Request) {
  try {
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin)
      return error('请求来源不匹配', 403);
    if (Number(request.headers.get('content-length') || 0) > 100000)
      return error('应用数据过大', 413);
    const body = (await request.json()) as {
      project?: unknown;
      data?: unknown;
    };
    if (typeof body.project !== 'string') return error('请选择项目');
    if (!body.data || typeof body.data !== 'object' || Array.isArray(body.data))
      return error('应用数据格式无效');
    const serialized = JSON.stringify(body.data);
    if (new TextEncoder().encode(serialized).length > MAX_DATA_BYTES)
      return error('应用数据超过 50 KB 上限', 413);
    const values = Object.values(body.data as Record<string, unknown>);
    if (values.some((value) => typeof value !== 'string'))
      return error('应用数据格式无效');
    const access = await ownedProject(request, body.project);
    if (access.failure) return access.failure;
    const updated = Date.now();
    await db()
      .prepare(
        'INSERT INTO app_data (project,data,updated) VALUES (?,?,?) ON CONFLICT(project) DO UPDATE SET data = excluded.data, updated = excluded.updated',
      )
      .bind(body.project, serialized, updated)
      .run();
    return json({ saved: true, updated });
  } catch {
    return error('无法保存应用数据，请稍后重试。', 503);
  }
}
