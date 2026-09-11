import { user, sameOrigin } from '@/lib/auth';
import { extractHtmlDocument } from '@/lib/demo';
import { db, error, json } from '@/lib/server';

type ProjectBody = {
  action?: unknown;
  project?: unknown;
  version?: unknown;
  title?: unknown;
  description?: unknown;
  instructions?: unknown;
  html?: unknown;
};

function cleanText(value: unknown, max: number) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text && text.length <= max ? text : null;
}

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) return error('请求来源不匹配', 403);
    const account = await user(request);
    if (!account) return error('请先登录', 401);
    const raw = await request.text();
    if (raw.length > 200000) return error('请求过大', 413);
    const body = JSON.parse(raw) as ProjectBody;
    if (typeof body.project !== 'string') return error('请选择项目');
    const project = await db()
      .prepare(
        'SELECT id,published_version FROM projects WHERE id = ? AND owner = ?',
      )
      .bind(body.project, account.id)
      .first<{ id: string; published_version: string | null }>();
    if (!project) return error('项目不存在', 404);

    if (body.action === 'metadata') {
      if (project.published_version)
        return error('已发布应用需先取消发布才能修改', 409);
      const title = cleanText(body.title, 80);
      const description = cleanText(body.description, 600);
      const instructions = cleanText(body.instructions, 1200);
      if (!title || !description || !instructions)
        return error('请完整填写应用名称、应用介绍和使用说明');
      await db()
        .prepare(
          "UPDATE projects SET title = ?, description = ?, instructions = ?, review_status = 'draft', review_version = NULL, review_requested_at = NULL WHERE id = ?",
        )
        .bind(title, description, instructions, body.project)
        .run();
      return json({ saved: true, reviewStatus: 'draft' });
    }

    if (body.action === 'code') {
      if (project.published_version)
        return error('已发布应用需先取消发布才能修改', 409);
      if (typeof body.html !== 'string') return error('请输入应用代码');
      const html = extractHtmlDocument(body.html);
      if (!html) return error('代码必须包含完整的 HTML 文档');
      if (html.length > 150000) return error('应用代码不能超过 150,000 字符');
      const version = crypto.randomUUID();
      const now = Date.now();
      await db().batch([
        db()
          .prepare(
            'INSERT INTO versions (id,project,prompt,html,summary,mode,created) VALUES (?,?,?,?,?,?,?)',
          )
          .bind(
            version,
            body.project,
            '用户手动修改应用代码',
            html,
            '用户已手动修改代码并保存为新版本。',
            'manual',
            now,
          ),
        db()
          .prepare(
            "UPDATE projects SET review_status = 'draft', review_version = NULL, review_requested_at = NULL WHERE id = ?",
          )
          .bind(body.project),
      ]);
      return json({ saved: true, version, reviewStatus: 'draft' });
    }

    if (body.action === 'review') {
      if (project.published_version)
        return error('当前应用已经发布，无需重复提交验证', 409);
      if (typeof body.version !== 'string') return error('请选择要验证的版本');
      const version = await db()
        .prepare('SELECT id FROM versions WHERE id = ? AND project = ?')
        .bind(body.version, body.project)
        .first();
      if (!version) return error('版本不存在', 404);
      const requestedAt = Date.now();
      await db()
        .prepare(
          "UPDATE projects SET review_status = 'submitted', review_version = ?, review_requested_at = ? WHERE id = ?",
        )
        .bind(body.version, requestedAt, body.project)
        .run();
      return json({ submitted: true, version: body.version, requestedAt });
    }

    return error('不支持的操作');
  } catch {
    return error('无法保存应用，请稍后重试。', 503);
  }
}
