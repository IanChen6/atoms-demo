import { user } from '@/lib/auth';
import { db, error, json } from '@/lib/server';

type PublishBody = {
  action?: unknown;
  project?: unknown;
  version?: unknown;
};

export async function POST(request: Request) {
  try {
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin)
      return error('请求来源不匹配', 403);
    const account = await user(request);
    if (!account) return error('请先登录', 401);
    const body = (await request.json()) as PublishBody;
    if (typeof body.project !== 'string') return error('请选择项目');
    const project = await db()
      .prepare(
        'SELECT id,published_version,review_status,review_version FROM projects WHERE id = ? AND owner = ?',
      )
      .bind(body.project, account.id)
      .first<{
        id: string;
        published_version: string | null;
        review_status: string;
        review_version: string | null;
      }>();
    if (!project) return error('项目不存在', 404);

    if (body.action === 'unpublish') {
      if (!project.published_version) return error('项目尚未发布', 409);
      await db()
        .prepare(
          'UPDATE projects SET published_version = NULL, published_at = NULL WHERE id = ?',
        )
        .bind(body.project)
        .run();
      return json({ published: false });
    }

    if (body.action !== 'publish' || typeof body.version !== 'string')
      return error('请选择要发布的版本');
    if (project.published_version) return error('项目已经发布', 409);
    if (
      project.review_status !== 'submitted' ||
      project.review_version !== body.version
    )
      return error('请先提交当前版本的 Atoms 验证请求', 409);
    const version = await db()
      .prepare('SELECT id FROM versions WHERE id = ? AND project = ?')
      .bind(body.version, body.project)
      .first();
    if (!version) return error('版本不存在', 404);
    const publishedAt = Date.now();
    await db()
      .prepare(
        'UPDATE projects SET published_version = ?, published_at = ? WHERE id = ?',
      )
      .bind(body.version, publishedAt, body.project)
      .run();
    return json({
      published: true,
      version: body.version,
      publishedAt,
    });
  } catch {
    return error('无法更新发布状态，请稍后重试。', 503);
  }
}
