export type AgentRole = 'analyst' | 'designer' | 'engineer' | 'reviewer';

export type AgentActivity = {
  role: AgentRole;
  name: string;
  title: string;
  detail: string;
  status: 'pending' | 'active' | 'done' | 'error';
  changes?: string[];
};

function compact(value: string, limit = 72) {
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length > limit ? `${clean.slice(0, limit)}…` : clean;
}

function productDecision(prompt: string) {
  if (/贪吃蛇|游戏|game|计分|关卡/i.test(prompt))
    return '以可操作的游戏区域为核心，补齐键盘/触控、计分、暂停和结束反馈。';
  if (/待办|任务|todo|清单/i.test(prompt))
    return '围绕快速新增、完成切换、删除和进度反馈组织单页任务流。';
  if (/笔记|记事|note|搜索/i.test(prompt))
    return '围绕即时记录、搜索筛选和内容回看组织信息结构。';
  if (/计时|番茄|timer|专注/i.test(prompt))
    return '突出倒计时状态与开始、暂停、重置，确保完成反馈清晰。';
  if (/主题|颜色|布局|样式|视觉/i.test(prompt))
    return '保留已有交互与数据，只调整视觉层级、布局和响应式细节。';
  return '先实现一条完整主流程，再补齐必要状态与移动端体验。';
}

export function collaborationTrace(
  prompt: string,
  hasPrevious: boolean,
  completed = 0,
  outcome: 'pending' | 'success' | 'error' | 'clarification' = 'pending',
): AgentActivity[] {
  const target = compact(prompt || '恢复已保存的历史版本');
  const activities: AgentActivity[] = [
    {
      role: 'analyst',
      name: '需求分析师',
      title: hasPrevious ? '确认本轮变更边界' : '确认产品目标与范围',
      detail: hasPrevious
        ? `基于现有应用处理本轮要求：${target}`
        : `将需求收敛为一个可直接体验的核心产品：${target}`,
      status: 'pending',
    },
    {
      role: 'designer',
      name: '产品设计师',
      title: '确定核心交互方案',
      detail: productDecision(prompt),
      status: 'pending',
    },
    {
      role: 'engineer',
      name: '应用工程师',
      title: hasPrevious ? '实现并合并本轮修改' : '生成可运行应用',
      detail: hasPrevious
        ? '读取当前版本，在保留已有功能和数据的基础上修改应用。'
        : '生成独立运行的 HTML、样式和交互逻辑，并接入数据持久化。',
      status: 'pending',
      changes: hasPrevious
        ? ['保留现有功能', '应用本轮变更', '更新预览源码']
        : ['创建页面结构', '实现核心交互', '接入持久化存储'],
    },
    {
      role: 'reviewer',
      name: '质量审查员',
      title: '校验结果并保存版本',
      detail: '检查文档完整性、沙箱兼容性、核心交互和持久化约束。',
      status: 'pending',
      changes: ['验证可运行性', '保存不可变版本', '刷新右侧预览'],
    },
  ];

  return activities.map((activity, index) => ({
    ...activity,
    status:
      outcome === 'error' && index === Math.min(completed, activities.length - 1)
        ? 'error'
        : outcome === 'clarification' && index === 0
          ? 'active'
          : outcome === 'success' || index < completed
            ? 'done'
            : index === completed
              ? 'active'
              : 'pending',
  }));
}

export function engineeringBrief(prompt: string, hasPrevious: boolean) {
  const trace = collaborationTrace(prompt, hasPrevious);
  return [
    `需求分析：${trace[0].detail}`,
    `产品方案：${trace[1].detail}`,
    `工程任务：${trace[2].detail}`,
    '质量门槛：输出必须是完整可运行 HTML，核心交互可用，数据可以持久保存。',
  ].join('\n');
}
