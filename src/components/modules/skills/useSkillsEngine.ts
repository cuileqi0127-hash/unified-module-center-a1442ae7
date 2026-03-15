import { useState, useCallback, useRef } from 'react';
import type { AgentInfo } from './AgentCard';

export type TaskStatus = 'queued' | 'running' | 'done' | 'skipped' | 'error';

export interface TaskLog {
  time: string;
  message: string;
}

export interface SkillTask {
  id: string;
  title: string;
  status: TaskStatus;
  progress: number;
  startAt?: string;
  endAt?: string;
  logs: TaskLog[];
  children: SkillTask[];
  input?: string;
  output?: string;
  moduleChain?: string[];
  expert?: {
    name: string;
    avatar: string;
    role: string;
  };
}

export interface CandidateVideo {
  id: string;
  cover: string;
  title: string;
  duration: string;
  tags: string[];
  views: string;
  likes: string;
  comments?: string;
  shares?: string;
  salesCount?: number;
  growthRate?: string;
  analysis?: string;
  strategy?: string;
  sellingPointHitRate?: number;
  tiktokUrl?: string;
}

export interface SessionSetup {
  image: string | null;
  imageName: string | null;
  memoryEnabled: boolean;
  selectedMemoryIds: string[];
  sellingPoints: string;
  category: string;
}

export type UIMode = 'single' | 'split';

export type StreamMessageType =
  | 'text'
  | 'setup-summary'
  | 'checklist'
  | 'agent-cluster'
  | 'agent-status'
  | 'create-agent'
  | 'read-checklist'
  | 'read-memory'
  | 'video-candidates'
  | 'prompt-editor'
  | 'result-preview'
  | 'video-gen-status'
  | 'selection-confirm'
  | 'final-result';

export interface StreamMessage {
  id: string;
  type: StreamMessageType;
  content: string;
  isStreaming?: boolean;
  /** For agent-cluster messages */
  agents?: AgentInfo[];
  /** For create-agent messages – inline agent names with avatars */
  agentNames?: { name: string; avatar: string }[];
  /** For read-memory messages – memory entry id */
  memoryId?: string;
}

export interface SkillsState {
  sessionId: string;
  setupCompleted: boolean;
  setup: SessionSetup;
  uiMode: UIMode;
  activeTaskId: string | null;
  tasks: SkillTask[];
  messages: StreamMessage[];
  candidateVideos: CandidateVideo[];
  selectedVideo: CandidateVideo | null;
  generatedPrompt: string;
  resultVideo: { url: string; cover: string } | null;
  isProcessing: boolean;
  /** Agents state */
  agents: AgentInfo[];
  /** Active right panel view */
  activeRightView: 'none' | 'checklist' | 'agents' | 'read-memory';
  /** Which agent tab is active in the agents panel */
  activeAgentTab?: '01' | '02' | '03' | '04';
  /** Checklist items */
  checklistItems: string[];
  checklistDone: boolean[];
}

const CATEGORIES = ['美妆个护', '3C数码', '服饰鞋包', '家居日用', '食品饮料', '母婴用品', '其它'];

const mockVideos = (): CandidateVideo[] => [
  { id: `v-${Date.now()}-1`, cover: '', title: 'These come in handy daily! @MINISO #translationearbuds', duration: '0:43', tags: ['美妆', '种草'], views: '28.0M', likes: '1.1M', comments: '12.3K', shares: '8.5K', salesCount: 268, growthRate: '0.0%', analysis: '视频解析', strategy: '开场直击跑步场景痛点，展现佩戴稳固与运动舒适。', sellingPointHitRate: 0, tiktokUrl: 'https://www.tiktok.com/@miniso' },
  { id: `v-${Date.now()}-2`, cover: '', title: '沉浸式开箱ASMR｜超治愈解压', duration: '0:45', tags: ['开箱', 'ASMR'], views: '15.2M', likes: '890K', comments: '6.7K', shares: '4.2K', salesCount: 1520, growthRate: '12.3%', analysis: '视频解析', strategy: '利用ASMR声效配合近景展示产品细节，引发感官共鸣。', sellingPointHitRate: 35, tiktokUrl: 'https://www.tiktok.com/' },
  { id: `v-${Date.now()}-3`, cover: '', title: '日常妆容教程｜通勤必备5分钟出门', duration: '1:02', tags: ['教程', '日常'], views: '42.1M', likes: '2.3M', comments: '18.9K', shares: '15.1K', salesCount: 3890, growthRate: '8.7%', analysis: '视频解析', strategy: '以通勤场景切入，展示快速上妆流程，突出便携性。', sellingPointHitRate: 72, tiktokUrl: 'https://www.tiktok.com/' },
  { id: `v-${Date.now()}-4`, cover: '', title: '产品对比测评TOP3｜真实体验分享', duration: '0:58', tags: ['测评', '对比'], views: '8.9M', likes: '520K', comments: '9.1K', shares: '3.8K', salesCount: 756, growthRate: '5.2%', analysis: '视频解析', strategy: '横向对比同类产品，通过数据和实测突出性价比优势。', sellingPointHitRate: 45, tiktokUrl: 'https://www.tiktok.com/' },
  { id: `v-${Date.now()}-5`, cover: '', title: '一分钟get氛围感穿搭｜秋冬必入', duration: '0:28', tags: ['穿搭', '氛围'], views: '31.2M', likes: '1.8M', comments: '14.2K', shares: '11.3K', salesCount: 2340, growthRate: '15.6%', analysis: '视频解析', strategy: '快节奏换装展示多套搭配，突出单品百搭特性。', sellingPointHitRate: 58, tiktokUrl: 'https://www.tiktok.com/' },
];

function now() {
  return new Date().toLocaleTimeString('zh-CN', { hour12: false });
}

const initialAgents: AgentInfo[] = [
  { id: 'agent-01', number: '01', name: 'TikTok爆款专家', role: 'TK爆款视频匹配', avatar: 'search', statusText: '等待启动', progress: 0, status: 'idle' },
  { id: 'agent-02', number: '02', name: '记忆库专家', role: '记忆库特征向量构建', avatar: 'memory', statusText: '等待启动', progress: 0, status: 'idle' },
  { id: 'agent-03', number: '03', name: 'Prompt专家', role: 'TikTok爆款视频Prompt设计', avatar: 'strategist', statusText: '等待启动', progress: 0, status: 'idle' },
  { id: 'agent-04', number: '04', name: '视频专家', role: '视频生成与合成', avatar: 'video', statusText: '等待启动', progress: 0, status: 'idle' },
];

export function useSkillsEngine() {
  const [state, setState] = useState<SkillsState>({
    sessionId: `session-${Date.now()}`,
    setupCompleted: false,
    setup: { image: null, imageName: null, memoryEnabled: true, selectedMemoryIds: [], sellingPoints: '', category: '' },
    uiMode: 'single',
    activeTaskId: null,
    tasks: [],
    messages: [],
    candidateVideos: [],
    selectedVideo: null,
    generatedPrompt: '',
    resultVideo: null,
    isProcessing: false,
    agents: [...initialAgents],
    activeRightView: 'none',
    checklistItems: [],
    checklistDone: [],
  });

  const streamTimers = useRef<number[]>([]);

  const clearTimers = () => {
    streamTimers.current.forEach(clearTimeout);
    streamTimers.current = [];
  };

  // Helpers
  const addMessage = useCallback((msg: Omit<StreamMessage, 'id'>) => {
    const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setState(prev => ({ ...prev, messages: [...prev.messages, { ...msg, id }] }));
    return id;
  }, []);

  const streamText = useCallback((text: string, onDone?: () => void) => {
    const msgId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, { id: msgId, type: 'text', content: '', isStreaming: true }],
    }));
    const chars = text.split('');
    let i = 0;
    const tick = () => {
      if (i < chars.length) {
        const batch = chars.slice(i, i + 3).join('');
        i += 3;
        setState(prev => ({
          ...prev,
          messages: prev.messages.map(m => m.id === msgId ? { ...m, content: m.content + batch } : m),
        }));
        const timer = window.setTimeout(tick, 30 + Math.random() * 20);
        streamTimers.current.push(timer);
      } else {
        setState(prev => ({
          ...prev,
          messages: prev.messages.map(m => m.id === msgId ? { ...m, isStreaming: false } : m),
        }));
        onDone?.();
      }
    };
    tick();
    return msgId;
  }, []);

  const updateAgent = useCallback((agentId: string, updates: Partial<AgentInfo>) => {
    setState(prev => ({
      ...prev,
      agents: prev.agents.map(a => a.id === agentId ? { ...a, ...updates } : a),
    }));
  }, []);

  const updateTask = useCallback((taskId: string, updates: Partial<SkillTask>) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t),
    }));
  }, []);

  const addTaskLog = useCallback((taskId: string, message: string) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t =>
        t.id === taskId ? { ...t, logs: [...t.logs, { time: now(), message }] } : t
      ),
    }));
  }, []);

  const updateChild = useCallback((parentId: string, childId: string, updates: Partial<SkillTask>) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === parentId ? {
        ...t,
        children: t.children.map(c => c.id === childId ? { ...c, ...updates } : c),
      } : t),
    }));
  }, []);

  // Delay helpers
  const randDelay = () => new Promise<void>(r => { const t = window.setTimeout(r, 1500 + Math.random() * 2000); streamTimers.current.push(t); });
  const subDelay = () => new Promise<void>(r => { const t = window.setTimeout(r, 1000 + Math.random() * 1000); streamTimers.current.push(t); });
  const backendDelay = () => new Promise<void>(r => { const t = window.setTimeout(r, 3000 + Math.random() * 3000); streamTimers.current.push(t); });
  const pause = (ms = 600) => new Promise<void>(r => { const t = window.setTimeout(r, ms); streamTimers.current.push(t); });

  // Update agent in cluster messages (to keep them in sync for rendering)
  const updateAgentInMessages = useCallback((agentId: string, updates: Partial<AgentInfo>) => {
    setState(prev => ({
      ...prev,
      messages: prev.messages.map(m => {
        if (m.type === 'agent-cluster' && m.agents) {
          return {
            ...m,
            agents: m.agents.map(a => a.id === agentId ? { ...a, ...updates } : a),
          };
        }
        return m;
      }),
    }));
  }, []);

  // ─── Phase 0: Complete setup ───
  const completeSetup = useCallback((setup: SessionSetup) => {
    const checklistItems = [
      '匹配对标品类和卖点的爆款视频列表',
      '构建记忆库特征向量',
      '设计专属TikTok爆款视频Prompt',
      '生成专属爆款视频',
    ];

    // Create tasks
    const tasks: SkillTask[] = [
      {
        id: 'task-crawl', title: '抓取同品类 TK 爆款视频',
        status: 'queued', progress: 0, logs: [], children: [
          { id: 'task-crawl-spider', title: '启动 TikTok 爬虫', status: 'queued', progress: 0, logs: [], children: [], expert: { name: '爬虫专家', avatar: 'crawler', role: '数据爬取专家' } },
          { id: 'task-crawl-analyze', title: '分析卖点匹配度', status: 'queued', progress: 0, logs: [], children: [], expert: { name: '数据专家', avatar: 'analyst', role: '数据分析专家' } },
          { id: 'task-crawl-rank', title: '排序生成 Top 20', status: 'queued', progress: 0, logs: [], children: [], expert: { name: '策略专家', avatar: 'strategist', role: '策略专家' } },
          { id: 'task-crawl-cover', title: '提取视频封面', status: 'queued', progress: 0, logs: [], children: [], expert: { name: '视频专家', avatar: 'video', role: '视频制作专家' } },
        ],
        moduleChain: ['TikTokCrawler', 'ContentAnalyzer', 'RankingEngine', 'ThumbnailGen'],
        input: `品类: ${setup.category}, 卖点: ${setup.sellingPoints.slice(0, 50)}`,
        expert: { name: '爬虫', avatar: 'crawler', role: '' },
      },
      {
        id: 'task-memory', title: '构建记忆库特征向量',
        status: setup.memoryEnabled ? 'queued' : 'skipped',
        progress: 0, logs: [], children: [
          { id: 'task-memory-connect', title: '连接记忆库', status: 'queued', progress: 0, logs: [], children: [], expert: { name: '记忆专家', avatar: 'memory', role: '记忆管理专家' } },
          { id: 'task-memory-retrieve', title: '检索相关记忆', status: 'queued', progress: 0, logs: [], children: [], expert: { name: '检索专家', avatar: 'search', role: '信息检索专家' } },
          { id: 'task-memory-context', title: '构建上下文向量', status: 'queued', progress: 0, logs: [], children: [], expert: { name: '数据专家', avatar: 'analyst', role: '数据分析专家' } },
        ],
        expert: { name: '记忆库', avatar: 'memory', role: '' },
      },
      {
        id: 'task-reverse-prompt', title: '设计专属Prompt',
        status: 'queued', progress: 0, logs: [], children: [
          { id: 'rp-frame', title: '视频帧分析', status: 'queued', progress: 0, logs: [], children: [], expert: { name: '视频专家', avatar: 'video', role: '视频制作专家' } },
          { id: 'rp-style', title: '风格特征提取', status: 'queued', progress: 0, logs: [], children: [], expert: { name: '设计专家', avatar: 'designer', role: '创意制作专家' } },
          { id: 'rp-prompt', title: '提示词生成', status: 'queued', progress: 0, logs: [], children: [], expert: { name: '策略专家', avatar: 'strategist', role: '策略专家' } },
        ],
        expert: { name: '提示词', avatar: 'strategist', role: '' },
      },
      {
        id: 'task-generate-video', title: '生成爆款视频',
        status: 'queued', progress: 0, logs: [], children: [
          { id: 'sub-scene', title: '渲染场景', status: 'queued', progress: 0, logs: [], children: [], expert: { name: '设计专家', avatar: 'designer', role: '创意制作专家' } },
          { id: 'sub-audio', title: '音频合成', status: 'queued', progress: 0, logs: [], children: [], expert: { name: '音频专家', avatar: 'audio', role: '音频制作专家' } },
          { id: 'sub-compose', title: '视频合成', status: 'queued', progress: 0, logs: [], children: [], expert: { name: '视频专家', avatar: 'video', role: '视频制作专家' } },
        ],
        expert: { name: '视频', avatar: 'video', role: '' },
      },
    ];

    setState(prev => ({
      ...prev,
      setup,
      setupCompleted: true,
      isProcessing: true,
      tasks,
      checklistItems,
      checklistDone: [false, false, false, false],
    }));

    // Add setup summary
    addMessage({ type: 'setup-summary', content: JSON.stringify(setup) });

    (async () => {
      // Intro text
      streamText('现在让我为你编写专属TikTok解决方案。', async () => {
        await pause(600);

        // Show checklist
        addMessage({ type: 'checklist', content: '' });
        await pause(800);

        // ─── Phase 1: Agent 01 - 爆款专家 ───
        addMessage({ type: 'create-agent', content: '创建TikTok爆款专家代理', agentNames: [{ name: 'TikTok爆款专家', avatar: 'search' }] });
        await pause(400);

        const agent01: AgentInfo = {
          id: 'agent-01', number: '01', name: 'TikTok爆款专家', role: 'TK爆款视频匹配',
          avatar: 'search', status: 'running',
          statusText: `正在为你匹配对标「${setup.category}」品类和「${setup.sellingPoints.slice(0, 20)}」卖点的爆款视频列表`,
          progress: 10,
        };

        setState(prev => ({
          ...prev,
          agents: prev.agents.map(a => a.id === 'agent-01' ? agent01 : a),
          activeRightView: 'agents',
          activeAgentTab: '01',
        }));

        addMessage({ type: 'agent-cluster', content: '', agents: [agent01] });
        await pause(400);

        // Run crawl task
        updateTask('task-crawl', { status: 'running', startAt: now() });
        addTaskLog('task-crawl', 'TikTok爆款专家启动 TikTok 爬虫...');

        // Sub 1: Spider
        updateChild('task-crawl', 'task-crawl-spider', { status: 'running', title: '爬虫专家正在启动 TikTok 爬虫' });
        updateAgentInMessages('agent-01', { progress: 25, statusText: '正在抓取TikTok视频数据...' });
        updateAgent('agent-01', { progress: 25, statusText: '正在抓取TikTok视频数据...' });
        await backendDelay();
        updateChild('task-crawl', 'task-crawl-spider', { status: 'done', progress: 100, title: '爬虫专家完成启动 TikTok 爬虫' });
        const crawlCount = Math.floor(Math.random() * 251) + 50;
        addTaskLog('task-crawl', `爬虫专家完成抓取 → 共获取 ${crawlCount} 条视频数据`);

        // Sub 2: Analyze
        updateChild('task-crawl', 'task-crawl-analyze', { status: 'running', title: '数据专家正在分析卖点匹配度' });
        addTaskLog('task-crawl', '数据专家正在分析卖点匹配度...');
        updateAgentInMessages('agent-01', { progress: 50, statusText: '正在分析卖点匹配度...' });
        updateAgent('agent-01', { progress: 50, statusText: '正在分析卖点匹配度...' });
        await backendDelay();
        updateChild('task-crawl', 'task-crawl-analyze', { status: 'done', progress: 100, title: '数据专家完成分析卖点匹配度' });
        const matchRate = (Math.random() * 50 + 50).toFixed(1);
        const highMatchCount = Math.floor(Math.random() * 21) + 10;
        addTaskLog('task-crawl', `数据专家完成分析 → 平均匹配度 ${matchRate}%，高匹配 ${highMatchCount} 条`);

        // Sub 3: Rank
        updateChild('task-crawl', 'task-crawl-rank', { status: 'running', title: '策略专家正在排序生成 Top 20' });
        updateAgentInMessages('agent-01', { progress: 75, statusText: '正在生成 Top 20 排名...' });
        updateAgent('agent-01', { progress: 75, statusText: '正在生成 Top 20 排名...' });
        await randDelay();
        updateChild('task-crawl', 'task-crawl-rank', { status: 'done', progress: 100, title: '策略专家完成排序生成 Top 20' });
        addTaskLog('task-crawl', '策略专家完成排序 → Top 6候选已生成');

        // Sub 4: Cover
        updateChild('task-crawl', 'task-crawl-cover', { status: 'running', title: '视频专家正在提取视频封面' });
        updateAgentInMessages('agent-01', { progress: 90, statusText: '正在提取视频封面...' });
        updateAgent('agent-01', { progress: 90, statusText: '正在提取视频封面...' });
        await subDelay();
        updateChild('task-crawl', 'task-crawl-cover', { status: 'done', progress: 100, title: '视频专家完成提取视频封面' });
        addTaskLog('task-crawl', '视频专家完成封面提取 → 26张高清封面已缓存');

        updateTask('task-crawl', { status: 'done', progress: 100, endAt: now(), output: '抓取 142 条，Top 20 已排序' });
        updateAgentInMessages('agent-01', { progress: 100, status: 'done', statusText: '已完成爆款视频匹配，请选择对标视频' });
        updateAgent('agent-01', { progress: 100, status: 'done', statusText: '已完成爆款视频匹配，请选择对标视频' });

        // Update checklist
        setState(prev => ({
          ...prev,
          checklistDone: [true, ...prev.checklistDone.slice(1)],
        }));

        // Show video candidates
        const videos = mockVideos();
        setState(prev => ({
          ...prev,
          candidateVideos: videos,
          isProcessing: false,
          activeRightView: 'agents',
          activeAgentTab: '01',
        }));

        addMessage({ type: 'video-gen-status', content: '请从右侧面板选择一条对标视频进行复刻 →' });
      });
    })();
  }, [streamText, addMessage, updateTask, addTaskLog, updateChild, updateAgent, updateAgentInMessages]);

  // ─── Select video → Phase 2: Agent 02 + 03 parallel ───
  const selectVideo = useCallback((video: CandidateVideo) => {
    setState(prev => ({
      ...prev,
      selectedVideo: video,
      isProcessing: true,
    }));

    addMessage({ type: 'selection-confirm', content: `已选择「${video.title}」作为对标视频，现在为你生成专属爆款视频Prompt。` });

    (async () => {
      await pause(600);
      addMessage({ type: 'read-checklist', content: '读取待办清单' });
      await pause(400);

      // Show memory files if enabled
      if (state.setup.memoryEnabled && state.setup.selectedMemoryIds.length > 0) {
        for (const memId of state.setup.selectedMemoryIds) {
          addMessage({ type: 'read-memory', content: '', memoryId: memId });
          await pause(300);
        }
        await pause(200);
      }

      addMessage({ type: 'create-agent', content: '创建记忆库信息和Prompt设计专家代理', agentNames: [{ name: '记忆库专家', avatar: 'memory' }, { name: 'Prompt专家', avatar: 'strategist' }] });
      await pause(400);

      // Agent 02 + 03 cluster
      const agent02: AgentInfo = {
        id: 'agent-02', number: '02', name: '记忆库专家', role: '记忆库特征向量构建',
        avatar: 'memory', status: 'running',
        statusText: '正在为你构建记忆库特征向量',
        progress: 10,
      };
      const agent03: AgentInfo = {
        id: 'agent-03', number: '03', name: 'Prompt专家', role: 'Prompt设计',
        avatar: 'strategist', status: 'running',
        statusText: '正在为你设计专属TikTok爆款视频Prompt',
        progress: 10,
      };

      setState(prev => ({
        ...prev,
        agents: prev.agents.map(a => {
          if (a.id === 'agent-02') return agent02;
          if (a.id === 'agent-03') return agent03;
          return a;
        }),
        activeRightView: 'agents',
        activeAgentTab: '02',
      }));

      addMessage({ type: 'agent-cluster', content: '', agents: [agent02, agent03] });

      // Run Agent 02 (memory) and Agent 03 (prompt) in parallel
      const runAgent02 = async () => {
        const setup = state.setup;
        if (!setup.memoryEnabled) {
          updateTask('task-memory', { status: 'skipped', endAt: now() });
          updateAgentInMessages('agent-02', { status: 'skipped' as any, progress: 0, statusText: '未选择记忆库，已跳过' });
          updateAgent('agent-02', { status: 'skipped' as any, progress: 0, statusText: '未选择记忆库，已跳过' });
          return;
        }

        updateTask('task-memory', { status: 'running', startAt: now() });
        addTaskLog('task-memory', '记忆专家正在连接记忆库...');

        updateChild('task-memory', 'task-memory-connect', { status: 'running', title: '记忆专家正在连接记忆库' });
        updateAgentInMessages('agent-02', { progress: 20, statusText: '正在连接记忆库...' });
        updateAgent('agent-02', { progress: 20, statusText: '正在连接记忆库...' });
        await subDelay();
        updateChild('task-memory', 'task-memory-connect', { status: 'done', progress: 100, title: '记忆专家完成连接记忆库' });
        addTaskLog('task-memory', '记忆专家完成连接记忆库 → 已建立安全连接');

        updateChild('task-memory', 'task-memory-retrieve', { status: 'running', title: '检索专家正在检索相关记忆' });
        updateAgentInMessages('agent-02', { progress: 50, statusText: '正在检索相关记忆...' });
        updateAgent('agent-02', { progress: 50, statusText: '正在检索相关记忆...' });
        await subDelay();
        const memoryCount = setup.selectedMemoryIds.length || 4;
        updateChild('task-memory', 'task-memory-retrieve', { status: 'done', progress: 100, title: '检索专家完成检索相关记忆' });
        addTaskLog('task-memory', `检索专家完成检索 → 命中 ${memoryCount} 条相关记忆`);

        updateChild('task-memory', 'task-memory-context', { status: 'running', title: '数据专家正在构建上下文向量' });
        updateAgentInMessages('agent-02', { progress: 80, statusText: '正在构建特征向量...' });
        updateAgent('agent-02', { progress: 80, statusText: '正在构建特征向量...' });
        await subDelay();
        updateChild('task-memory', 'task-memory-context', { status: 'done', progress: 100, title: '数据专家完成构建上下文向量' });
        const vectorDim = Math.floor(Math.random() * 50) + 1;
        addTaskLog('task-memory', `数据专家完成构建上下文向量 → 生成 ${vectorDim} 维特征向量`);

        updateTask('task-memory', { status: 'done', progress: 100, endAt: now(), output: `已检索 ${memoryCount} 条记忆，构建上下文完成` });
        updateAgentInMessages('agent-02', { status: 'done', progress: 100, statusText: `已完成，检索到 ${memoryCount} 条记忆` });
        updateAgent('agent-02', { status: 'done', progress: 100, statusText: `已完成，检索到 ${memoryCount} 条记忆` });

        setState(prev => ({
          ...prev,
          checklistDone: [prev.checklistDone[0], true, ...prev.checklistDone.slice(2)],
        }));
      };

      const runAgent03 = async () => {
        updateTask('task-reverse-prompt', { status: 'running', startAt: now(), input: `视频: ${video.title}` });
        addTaskLog('task-reverse-prompt', '开始分析视频内容...');

        updateChild('task-reverse-prompt', 'rp-frame', { status: 'running', title: '视频专家正在分析视频帧' });
        updateAgentInMessages('agent-03', { progress: 20, statusText: '正在分析视频帧...' });
        updateAgent('agent-03', { progress: 20, statusText: '正在分析视频帧...' });
        await randDelay();
        updateChild('task-reverse-prompt', 'rp-frame', { status: 'done', progress: 100, title: '视频专家完成视频帧分析' });
        const keyFrames = Math.floor(Math.random() * 41) + 20;
        addTaskLog('task-reverse-prompt', `视频专家完成视频帧分析 → 提取 ${keyFrames} 个关键帧`);

        updateChild('task-reverse-prompt', 'rp-style', { status: 'running', title: '设计专家正在提取风格特征' });
        updateAgentInMessages('agent-03', { progress: 50, statusText: '正在提取风格特征...' });
        updateAgent('agent-03', { progress: 50, statusText: '正在提取风格特征...' });
        await randDelay();
        updateChild('task-reverse-prompt', 'rp-style', { status: 'done', progress: 100, title: '设计专家完成风格特征提取' });
        addTaskLog('task-reverse-prompt', '设计专家完成风格特征提取');

        updateChild('task-reverse-prompt', 'rp-prompt', { status: 'running', title: '策略专家正在生成提示词' });
        updateAgentInMessages('agent-03', { progress: 80, statusText: '正在生成Prompt...' });
        updateAgent('agent-03', { progress: 80, statusText: '正在生成Prompt...' });
        await backendDelay();
        updateChild('task-reverse-prompt', 'rp-prompt', { status: 'done', progress: 100, title: '策略专家完成提示词生成' });
        addTaskLog('task-reverse-prompt', '策略专家完成提示词生成 → 包含镜头、节奏、结构等 6 个维度');

        updateTask('task-reverse-prompt', { status: 'done', progress: 100, endAt: now(), output: '提示词生成完成' });
        updateAgentInMessages('agent-03', { status: 'done', progress: 100, statusText: '已完成Prompt设计' });
        updateAgent('agent-03', { status: 'done', progress: 100, statusText: '已完成Prompt设计' });

        setState(prev => ({
          ...prev,
          checklistDone: [prev.checklistDone[0], prev.checklistDone[1], true, ...prev.checklistDone.slice(3)],
        }));
      };

      await Promise.all([runAgent02(), runAgent03()]);

      const mockPrompt = `【爆款复刻 Prompt】\n\n镜头风格：近景特写 + 俯拍切换，暖色调滤镜\n节奏：快节奏剪辑，BGM 节拍同步\n内容结构：\n1. 开场 - 产品白底展示，旋转 360°（0-3s）\n2. 使用场景 - 手部特写展示质感（3-8s）\n3. 效果对比 - 使用前后对比（8-15s）\n4. 口播种草 - 真人出镜，口述卖点（15-25s）\n5. 结尾 CTA - 点击链接，限时优惠（25-30s）\n\n关键词：${state.setup.sellingPoints.slice(0, 30)}\n品类：${state.setup.category}\n参考来源：${video.title}`;

      setState(prev => ({
        ...prev,
        generatedPrompt: mockPrompt,
        isProcessing: false,
      }));

      addMessage({ type: 'video-gen-status', content: '✅ Prompt已生成，请在右侧面板查看和编辑，确认后生成视频 →' });
    })();
  }, [state.setup, addMessage, updateTask, addTaskLog, updateChild, updateAgent, updateAgentInMessages]);

  // ─── Confirm prompt → Phase 3: Agent 04 ───
  const confirmGenerate = useCallback(() => {
    setState(prev => ({ ...prev, isProcessing: true }));

    (async () => {
      addMessage({ type: 'read-checklist', content: '读取待办清单' });
      await pause(400);
      addMessage({ type: 'create-agent', content: '创建视频生成专家代理', agentNames: [{ name: '视频专家', avatar: 'video' }] });
      await pause(400);

      const agent04: AgentInfo = {
        id: 'agent-04', number: '04', name: '视频专家', role: '视频生成与合成',
        avatar: 'video', status: 'running',
        statusText: '正在为你生成专属爆款视频',
        progress: 10,
      };

      setState(prev => ({
        ...prev,
        agents: prev.agents.map(a => a.id === 'agent-04' ? agent04 : a),
        activeRightView: 'agents',
        activeAgentTab: '04',
      }));

      addMessage({ type: 'agent-cluster', content: '', agents: [agent04] });

      // Run video generation
      const genTaskId = 'task-generate-video';
      updateTask(genTaskId, { status: 'running', startAt: now() });
      addTaskLog(genTaskId, '开始渲染视频...');

      // Scene
      updateChild(genTaskId, 'sub-scene', { status: 'running', title: '设计专家正在渲染场景' });
      updateAgentInMessages('agent-04', { progress: 20, statusText: '正在渲染场景...' });
      updateAgent('agent-04', { progress: 20, statusText: '正在渲染场景...' });
      await backendDelay();
      addTaskLog(genTaskId, '设计专家渲染场景');
      await pause(800);
      updateChild(genTaskId, 'sub-scene', { status: 'done', progress: 100, title: '设计专家完成渲染场景' });
      addTaskLog(genTaskId, '设计专家完成场景渲染');

      // Audio
      updateChild(genTaskId, 'sub-audio', { status: 'running', title: '音频专家正在合成音频' });
      updateAgentInMessages('agent-04', { progress: 55, statusText: '正在合成音频...' });
      updateAgent('agent-04', { progress: 55, statusText: '正在合成音频...' });
      addTaskLog(genTaskId, '音频专家正在合成音频...');
      await randDelay();
      updateChild(genTaskId, 'sub-audio', { status: 'done', progress: 100, title: '音频专家完成合成音频' });
      addTaskLog(genTaskId, '音频专家完成音频合成 → BGM 节拍同步，时长 30s');

      // Compose
      updateChild(genTaskId, 'sub-compose', { status: 'running', title: '视频专家正在合成视频' });
      updateAgentInMessages('agent-04', { progress: 80, statusText: '正在合成最终视频...' });
      updateAgent('agent-04', { progress: 80, statusText: '正在合成最终视频...' });
      addTaskLog(genTaskId, '视频专家正在合成视频...');
      await backendDelay();
      updateChild(genTaskId, 'sub-compose', { status: 'done', progress: 100, title: '视频专家完成合成视频' });
      addTaskLog(genTaskId, '视频专家完成视频合成 → 1080p，30s');
      addTaskLog(genTaskId, '质量检测通过');

      updateTask(genTaskId, { status: 'done', progress: 100, endAt: now(), output: '视频生成完成，时长 30s' });
      updateAgentInMessages('agent-04', { status: 'done', progress: 100, statusText: '视频生成完成！' });
      updateAgent('agent-04', { status: 'done', progress: 100, statusText: '视频生成完成！' });

      setState(prev => ({
        ...prev,
        checklistDone: [true, true, true, true],
        resultVideo: { url: '', cover: '' },
        isProcessing: false,
      }));

      addMessage({ type: 'video-gen-status', content: '🎉 所有任务已完成！复刻视频已生成，请在右侧面板查看和下载。' });
    })();
  }, [addMessage, updateTask, addTaskLog, updateChild, updateAgent, updateAgentInMessages]);

  // Update prompt
  const updatePrompt = useCallback((prompt: string) => {
    setState(prev => ({ ...prev, generatedPrompt: prompt }));
  }, []);

  // Refresh candidates
  const refreshCandidates = useCallback(() => {
    setState(prev => ({ ...prev, isProcessing: true }));
    const newVideos = mockVideos();
    const timer = window.setTimeout(() => {
      setState(prev => ({
        ...prev,
        candidateVideos: newVideos,
        isProcessing: false,
      }));
      streamText('🔄 已更新候选视频列表，请重新选择。');
    }, 1500);
    streamTimers.current.push(timer);
  }, [streamText]);

  // Back to video select
  const backToVideoSelect = useCallback(() => {
    clearTimers();
    setState(prev => ({
      ...prev,
      generatedPrompt: '',
      resultVideo: null,
      selectedVideo: null,
      isProcessing: false,
      activeRightView: 'agents',
      activeAgentTab: '01',
      // Reset agents 02-04
      agents: prev.agents.map(a => {
        if (['agent-02', 'agent-03', 'agent-04'].includes(a.id)) {
          return { ...a, status: 'idle' as const, progress: 0, statusText: '等待启动' };
        }
        return a;
      }),
      // Remove phase 2/3 messages
      messages: prev.messages.filter(m =>
        !(m.type === 'selection-confirm') &&
        !(m.type === 'read-checklist') &&
        !(m.type === 'read-memory') &&
        !(m.type === 'create-agent' && m.content.includes('记忆库')) &&
        !(m.type === 'create-agent' && m.content.includes('视频生成')) &&
        !(m.type === 'agent-cluster' && m.agents?.some(a => ['agent-02', 'agent-03', 'agent-04'].includes(a.id))) &&
        !(m.type === 'video-gen-status' && (m.content.includes('Prompt') || m.content.includes('🎉')))
      ),
      tasks: prev.tasks.map(t => {
        if (['task-memory', 'task-reverse-prompt', 'task-generate-video'].includes(t.id)) {
          return { ...t, status: 'queued' as TaskStatus, progress: 0, startAt: undefined, endAt: undefined, output: undefined, logs: [], children: t.children.map(c => ({ ...c, status: 'queued' as TaskStatus, progress: 0 })) };
        }
        return t;
      }),
      checklistDone: [true, false, false, false],
    }));
  }, []);

  // Regenerate
  const regenerate = useCallback(() => {
    clearTimers();
    setState(prev => ({
      ...prev,
      resultVideo: null,
      isProcessing: false,
      activeRightView: 'agents',
      activeAgentTab: '04',
      agents: prev.agents.map(a => a.id === 'agent-04' ? { ...a, status: 'idle' as const, progress: 0, statusText: '等待启动' } : a),
      messages: prev.messages.filter(m =>
        !(m.type === 'agent-cluster' && m.agents?.some(a => a.id === 'agent-04')) &&
        !(m.type === 'create-agent' && m.content.includes('视频生成')) &&
        !(m.type === 'read-checklist' && prev.messages.indexOf(m) > prev.messages.length - 5) &&
        !(m.type === 'video-gen-status' && m.content.includes('🎉'))
      ),
      tasks: prev.tasks.map(t => t.id === 'task-generate-video' ? {
        ...t, status: 'queued' as TaskStatus, progress: 0, startAt: undefined, endAt: undefined, output: undefined, logs: [],
        children: t.children.map(c => ({ ...c, status: 'queued' as TaskStatus, progress: 0 })),
      } : t),
      checklistDone: [true, true, true, false],
    }));
    const timer = window.setTimeout(() => confirmGenerate(), 300);
    streamTimers.current.push(timer);
  }, [confirmGenerate]);

  const setActiveTaskId = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, activeTaskId: id }));
  }, []);

  const setActiveRightView = useCallback((view: SkillsState['activeRightView'], agentTab?: SkillsState['activeAgentTab']) => {
    setState(prev => ({ ...prev, activeRightView: view, ...(agentTab ? { activeAgentTab: agentTab } : {}) }));
  }, []);

  const handleUserInput = useCallback((text: string) => {
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, { id: `msg-user-${Date.now()}`, type: 'text', content: `👤 ${text}` }],
    }));
    const lower = text.toLowerCase();
    if (lower.includes('换一批') || lower.includes('refresh')) {
      refreshCandidates();
    } else {
      streamText(`收到指令「${text}」，正在处理中...`, () => {
        const timer = window.setTimeout(() => {
          streamText('✅ 已完成处理。还有其他需要调整的吗？');
        }, 1500);
        streamTimers.current.push(timer);
      });
    }
  }, [refreshCandidates, streamText]);

  const resetSession = useCallback(() => {
    clearTimers();
    setState({
      sessionId: `session-${Date.now()}`,
      setupCompleted: false,
      setup: { image: null, imageName: null, memoryEnabled: true, selectedMemoryIds: [], sellingPoints: '', category: '' },
      uiMode: 'single',
      activeTaskId: null,
      tasks: [],
      messages: [],
      candidateVideos: [],
      selectedVideo: null,
      generatedPrompt: '',
      resultVideo: null,
      isProcessing: false,
      agents: [...initialAgents],
      activeRightView: 'none',
      checklistItems: [],
      checklistDone: [],
    });
  }, []);

  const restoreState = useCallback((snapshot: SkillsState) => {
    clearTimers();
    setState({ ...snapshot, isProcessing: false });
  }, []);

  return {
    state,
    CATEGORIES,
    completeSetup,
    refreshCandidates,
    selectVideo,
    updatePrompt,
    confirmGenerate,
    regenerate,
    backToVideoSelect,
    setActiveTaskId,
    setActiveRightView,
    handleUserInput,
    resetSession,
    restoreState,
  };
}
