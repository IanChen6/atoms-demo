export function clarificationFor(prompt: string, hasExistingApp: boolean) {
  if (hasExistingApp) return null;

  const compact = prompt.replace(/\s/g, '');
  const genericOnly =
    /^(帮我|请)?(做|创建|生成|开发)(一个|个)?(简单|极简|好看|现代)?(的)?(应用|app|网站|网页|页面|游戏)(就好|即可|吧)?[。！!]?$/i.test(
      compact,
    );

  if (compact.length >= 8 && !genericOnly) return null;

  return [
    '在开始构建前，我还需要一个关键信息：这个应用最核心的操作是什么？',
    '例如：“待办应用，可以添加、完成和删除任务”，或“贪吃蛇游戏，方向键控制并记录最高分”。',
    '补充一句即可，我会沿用当前项目继续构建。',
  ].join('\n');
}

export type StudioIntent = 'chat' | 'build';

export function studioIntent(
  prompt: string,
  hasExistingApp: boolean,
  hasSelection = false,
): StudioIntent {
  if (hasSelection) return 'build';
  const text = prompt.trim();
  const conversationalQuestion =
    /^(什么|为什么|为何|怎么|如何|能否解释|介绍一下|聊聊|你觉得|请问|有没有建议)/.test(
      text,
    ) || /[？?]$/.test(text);
  if (conversationalQuestion) return 'chat';
  const explicitBuild =
    /(?:做|创建|生成|开发|构建|搭建|实现|制作|设计)(?:一个|个|一下|款)?[^。！？!?]{0,24}(?:应用|app|网站|网页|页面|小程序|游戏|工具|系统|组件|表单|看板|仪表盘)/i.test(
      text,
    ) ||
    /(?:帮我|请)(?:做|写|改|调整|增加|添加|删除|优化|修复|重构|换成|改成)/i.test(
      text,
    ) ||
    /(?:应用|app|网站|网页|页面|小程序|游戏|工具|系统|表单|看板|待办|计时器|记事本)[^。！？!?]{0,28}(?:支持|包含|具有|实现|可以|能够)/i.test(
      text,
    );
  const appChange =
    hasExistingApp &&
    /(?:修改|调整|增加|添加|删除|优化|修复|重构|改成|换成|颜色|主题|布局|按钮|文案|交互|功能|页面|样式|响应式)/i.test(
      text,
    );
  return explicitBuild || appChange ? 'build' : 'chat';
}

export function cleanProviderValue(value: string) {
  const trimmed = value.trim();
  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
  )
    return trimmed.slice(1, -1).trim();
  return trimmed;
}

export function providerOptions(baseUrl: string, maxOutputTokens: number) {
  let host = '';
  try {
    host = new URL(cleanProviderValue(baseUrl)).hostname;
  } catch {
    return { max_tokens: maxOutputTokens };
  }
  if (host === 'api.openai.com') {
    return {
      max_completion_tokens: maxOutputTokens,
      reasoning_effort: 'none',
    };
  }
  if (host.endsWith('aliyuncs.com')) {
    return { max_tokens: maxOutputTokens, enable_thinking: false };
  }
  return { max_tokens: maxOutputTokens };
}

export function providerLabel(baseUrl: string) {
  let host = '';
  try {
    host = new URL(cleanProviderValue(baseUrl)).hostname;
  } catch {
    return '模型服务';
  }
  if (host.endsWith('aliyuncs.com')) return '阿里云百炼';
  if (host === 'api.openai.com') return 'OpenAI';
  return '模型服务';
}

export function executionPlan(prompt: string) {
  const brief = prompt.replace(/\s+/g, ' ').trim().slice(0, 32);
  const interaction = /贪吃蛇|游戏|game|计分|关卡/i.test(prompt)
    ? '设计游戏循环、操作反馈、计分与结束状态'
    : /待办|任务|todo|清单/i.test(prompt)
      ? '设计任务数据、添加完成删除与持久化交互'
      : /笔记|记事|note|搜索/i.test(prompt)
        ? '设计内容录入、搜索筛选与持久化交互'
        : /计时|番茄|timer|专注/i.test(prompt)
          ? '设计计时状态、开始暂停重置与完成反馈'
          : /主题|颜色|布局|样式|视觉/i.test(prompt)
            ? '保留已有功能，规划视觉调整与响应式细节'
            : '拆分页面结构、核心状态与主要操作路径';
  return [
    `确认目标与范围：${brief}`,
    interaction,
    '生成单文件应用并接入数据持久化',
    '校验可运行性、交互完整性并保存版本',
  ];
}
