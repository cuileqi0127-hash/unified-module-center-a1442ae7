import { useState, useCallback, useRef } from 'react';
import type { AgentInfo } from './AgentCard';
import {
  confirmTikTokSolutionPrompt,
  createTikTokSolutionTask,
  estimateTikTokSolutionCredits,
  getTikTokSolutionTaskDetail,
  selectTikTokSolutionCandidateVideo,
  type TikTokSolutionTaskDetail,
  type TikTokSolutionTaskListItem,
} from '@/services/tiktokSolutionApi';

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
  /** 卡片内预览（如 OSS mp4），有则 TrendingVideoCard 用 video 元素 */
  previewVideoUrl?: string;
}

/** 任务详情接口 `agents` 字段：左侧聊天区展示 */
export interface TikTokBackendAgentMessage {
  id: string;
  type: string;
  content: string;
  timestamp?: string;
  tool?: string;
}

export interface TikTokBackendAgent {
  key: string;
  name: string;
  status: string;
  messages: TikTokBackendAgentMessage[];
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
  | 'final-result'
  | 'tk-backend-agents';

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
  /** GET /tasks/{id} 的 agents 同步到左侧聊天 */
  backendAgents?: TikTokBackendAgent[];
  backendEventSeq?: number;
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
  /** backend task id */
  backendTaskId?: string | number | null;
}

const CATEGORIES = ['美妆个护', '3C数码', '服饰鞋包', '家居日用', '食品饮料', '母婴用品', '其它'];

function toLines(text: string): string[] {
  return text
    .split(/[\n,，]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function looksLikeVideoUrl(u: string | undefined | null): boolean {
  if (!u) return false;
  return /\.(mp4|webm|mov)(\?|$)/i.test(u);
}

function formatMetricNumber(n: unknown): string {
  if (typeof n === 'number' && Number.isFinite(n)) {
    const loc = typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US';
    if (Math.abs(n) >= 10000) {
      return new Intl.NumberFormat(loc, { notation: 'compact', maximumFractionDigits: 1 }).format(n);
    }
    return new Intl.NumberFormat(loc, { maximumFractionDigits: 0 }).format(n);
  }
  if (typeof n === 'string' && n.trim()) return n;
  return '-';
}

function parseHashtagTags(raw: unknown): string[] {
  if (typeof raw !== 'string' || !raw.trim()) return [];
  return raw
    .split(/[\s#]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function normalizeBackendAgentsFromDetail(detail: TikTokSolutionTaskDetail): TikTokBackendAgent[] {
  const raw = detail.agents;
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return raw.map((a, i) => {
    const rec = a as Record<string, unknown>;
    const msgsRaw = rec.messages;
    const messages: TikTokBackendAgentMessage[] = Array.isArray(msgsRaw)
      ? (msgsRaw as Record<string, unknown>[]).map((m, j) => {
          const mr = m;
          return {
            id: String(mr.id ?? `${rec.key ?? i}-${j}`),
            type: String(mr.type ?? 'text'),
            content: String(mr.content ?? ''),
            timestamp: mr.timestamp != null ? String(mr.timestamp) : undefined,
            tool: mr.tool != null ? String(mr.tool) : undefined,
          };
        })
      : [];
    return {
      key: String(rec.key ?? i),
      name: String(rec.name ?? rec.key ?? 'Agent'),
      status: String(rec.status ?? ''),
      messages,
    };
  });
}

function mapDetailCandidateVideos(detail: TikTokSolutionTaskDetail): CandidateVideo[] {
  return (detail.candidateVideos ?? []).map((v) => {
    const title = (v.title as string | undefined) ?? `#${v.rankNo}`;
    const views = formatMetricNumber(v.views);
    const likes = formatMetricNumber(v.likes);
    const duration =
      typeof v.duration === 'number'
        ? `${Math.floor(v.duration / 60)}:${String(Math.round(v.duration % 60)).padStart(2, '0')}`
        : (v.duration as string | undefined) ?? '-';
    const strategy = (v.strategy as string | undefined) ?? '';
    const ar = v.analysis_result as { overall_match_percent?: number; video_description?: string } | undefined;
    const analysisFromDesc = typeof ar?.video_description === 'string' ? ar.video_description : '';
    const analysis =
      analysisFromDesc ||
      (v.analysis_result ? JSON.stringify(v.analysis_result, null, 2) : (v.analysis as string | undefined)) ||
      '';
    const overall = typeof ar?.overall_match_percent === 'number' ? ar.overall_match_percent : undefined;
    const spm = typeof v.sellingPointMatch === 'number' ? v.sellingPointMatch : undefined;
    const hitRate = overall != null && overall > 0 ? overall : spm;
    const mediaUrl = v.url;
    const previewVideoUrl = looksLikeVideoUrl(mediaUrl) ? mediaUrl : undefined;
    const salesRaw = v.sales;
    const salesCount = typeof salesRaw === 'number' && Number.isFinite(salesRaw) ? salesRaw : undefined;
    const convRaw = v.conversionRate;
    const growthRate =
      typeof convRaw === 'number' && Number.isFinite(convRaw)
        ? `${(convRaw * 100).toFixed(convRaw < 0.01 && convRaw > 0 ? 2 : 0)}%`
        : undefined;
    const tagStr = (v.hashtags as string | undefined) ?? '';
    const tags = parseHashtagTags(tagStr);
    const id = (v.id as string | undefined) || v.candidateKey;
    return {
      id,
      cover: mediaUrl,
      previewVideoUrl,
      title,
      duration,
      tags,
      views,
      likes,
      analysis,
      strategy,
      sellingPointHitRate: hitRate,
      tiktokUrl: v.sourceVideoUrl,
      salesCount,
      growthRate,
    };
  });
}

function now() {
  return new Date().toLocaleTimeString('zh-CN', { hour12: false });
}

const initialAgents: AgentInfo[] = [
  { id: 'agent-01', number: '01', name: 'TikTok爆款专家', role: 'TK爆款视频匹配', avatar: 'search', statusText: '等待启动', progress: 0, status: 'idle' },
  { id: 'agent-02', number: '02', name: '记忆库专家', role: '记忆库特征向量构建', avatar: 'memory', statusText: '等待启动', progress: 0, status: 'idle' },
  { id: 'agent-03', number: '03', name: 'Prompt专家', role: 'TikTok爆款视频Prompt设计', avatar: 'strategist', statusText: '等待启动', progress: 0, status: 'idle' },
  { id: 'agent-04', number: '04', name: '视频专家', role: '视频生成与合成', avatar: 'video', statusText: '等待启动', progress: 0, status: 'idle' },
];

function buildSkillsTasks(setup: SessionSetup): SkillTask[] {
  return [
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
}

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
    backendTaskId: null,
  });

  const streamTimers = useRef<number[]>([]);
  const pollingTimer = useRef<number | null>(null);
  const pollingTaskId = useRef<string | number | null>(null);

  const clearTimers = () => {
    streamTimers.current.forEach(clearTimeout);
    streamTimers.current = [];
  };

  const stopPolling = useCallback(() => {
    if (pollingTimer.current) {
      window.clearTimeout(pollingTimer.current);
      pollingTimer.current = null;
    }
    pollingTaskId.current = null;
  }, []);

  const applyDetailToState = useCallback((detail: TikTokSolutionTaskDetail) => {
    const candidates = mapDetailCandidateVideos(detail);
    setState((prev) => {
      let selectedVideo = prev.selectedVideo;
      if (detail.selectedVideoUrl) {
        const found = candidates.find(
          (c) =>
            c.cover === detail.selectedVideoUrl ||
            c.tiktokUrl === detail.selectedVideoUrl ||
            c.previewVideoUrl === detail.selectedVideoUrl
        );
        selectedVideo =
          found ??
          ({
            id: 'selected-video',
            cover: detail.selectedVideoUrl,
            title: '已选对标视频',
            duration: '-',
            tags: [],
            views: '-',
            likes: '-',
            analysis: '',
            strategy: '',
          } as CandidateVideo);
      } else if (detail.status === 'awaiting_selection') {
        selectedVideo = null;
      }

      const generatedPrompt =
        detail.status === 'completed'
          ? (detail.confirmedPrompt ?? detail.pendingPrompt ?? prev.generatedPrompt)
          : (detail.pendingPrompt ?? prev.generatedPrompt);

      const agents = prev.agents.map((a) => {
        if (detail.status === 'awaiting_selection') {
          if (a.id === 'agent-01') return { ...a, status: 'done' as const, progress: 100, statusText: '已完成爆款视频匹配，请选择对标视频' };
          return a.id === 'agent-02' || a.id === 'agent-03' || a.id === 'agent-04'
            ? { ...a, status: 'idle' as const, progress: 0, statusText: '等待启动' }
            : a;
        }
        if (detail.status === 'awaiting_confirmation') {
          if (a.id === 'agent-03') return { ...a, status: 'running' as const, progress: 80, statusText: '已生成待确认 Prompt，请确认或编辑' };
          return a;
        }
        if (detail.status === 'completed') {
          if (a.id === 'agent-04') return { ...a, status: 'done' as const, progress: 100, statusText: '视频已生成完成' };
          return a.status === 'idle' ? a : { ...a, status: 'done' as const, progress: 100, statusText: a.statusText };
        }
        if (detail.status === 'failed' || detail.status === 'closed_timeout') {
          return { ...a, status: 'error' as const, progress: a.progress, statusText: detail.errorMessage || '任务失败或超时' };
        }
        if (a.status === 'idle') return { ...a, status: 'running' as const, progress: 30, statusText: '处理中...' };
        return a;
      });

      const backendAgents = normalizeBackendAgentsFromDetail(detail);
      const messages =
        backendAgents.length > 0
          ? (() => {
              const rest = prev.messages.filter((m) => m.id !== 'feed-backend-agents');
              const feedMsg: StreamMessage = {
                id: 'feed-backend-agents',
                type: 'tk-backend-agents',
                content: '',
                backendAgents,
                backendEventSeq: detail.latestEventSeq,
              };
              return [...rest, feedMsg];
            })()
          : prev.messages;

      return {
        ...prev,
        backendTaskId: detail.taskId,
        candidateVideos: candidates,
        selectedVideo,
        generatedPrompt,
        resultVideo: detail.videoUrl ? { url: detail.videoUrl, cover: detail.videoUrl } : prev.resultVideo,
        isProcessing: detail.status === 'processing' || detail.status === 'queued',
        agents,
        messages,
      };
    });
  }, []);

  const pollDetail = useCallback(async (taskId: string | number) => {
    pollingTaskId.current = taskId;
    const tick = async () => {
      if (pollingTaskId.current !== taskId) return;
      try {
        const res = await getTikTokSolutionTaskDetail(taskId);
        const detail = res.data;
        applyDetailToState(detail);

        if (detail.status === 'processing' || detail.status === 'queued') {
          pollingTimer.current = window.setTimeout(tick, 3000);
          return;
        }
        // break statuses: awaiting_selection / awaiting_confirmation / completed / failed / closed_timeout
        if (detail.status === 'awaiting_selection') {
          setState((prev) => ({ ...prev, activeRightView: 'agents', activeAgentTab: '01', isProcessing: false }));
        } else if (detail.status === 'awaiting_confirmation') {
          setState((prev) => ({ ...prev, activeRightView: 'agents', activeAgentTab: '03', isProcessing: false }));
        } else if (detail.status === 'completed') {
          setState((prev) => ({ ...prev, activeRightView: 'agents', activeAgentTab: '04', isProcessing: false, checklistDone: [true, true, true, true] }));
        } else {
          setState((prev) => ({ ...prev, isProcessing: false }));
        }
        stopPolling();
      } catch {
        // retry next tick
        pollingTimer.current = window.setTimeout(tick, 4000);
      }
    };
    await tick();
  }, [applyDetailToState, stopPolling]);

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

  // ─── Phase 0: Complete setup (real backend) ───
  const completeSetup = useCallback((setup: SessionSetup) => {
    stopPolling();
    const checklistItems = [
      '匹配对标品类和卖点的爆款视频列表',
      '构建记忆库特征向量',
      '设计专属TikTok爆款视频Prompt',
      '生成专属爆款视频',
    ];

    const tasks = buildSkillsTasks(setup);

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
      // 预估 + 提交任务
      const sellingPointsArr = toLines(setup.sellingPoints);
      if (!setup.image || sellingPointsArr.length === 0) {
        setState((prev) => ({ ...prev, isProcessing: false }));
        return;
      }
      const memoryEntryIds = (setup.selectedMemoryIds ?? [])
        .map((x) => Number(x))
        .filter((n) => Number.isFinite(n));
      const lang = navigator.language?.toLowerCase().startsWith('zh') ? 'zh' : 'en';

      try {
        addMessage({ type: 'checklist', content: '' });
        addMessage({ type: 'text', content: '🔍 正在预估积分…' });
        const estimate = await estimateTikTokSolutionCredits({
          sellingPoints: sellingPointsArr,
          productImageUrls: [setup.image],
          searchKeyword: setup.category,
          candidateCount: 10,
          aspectRatio: '9:16',
          duration: 15,
          lang,
          ...(memoryEntryIds.length ? { memoryEntryIds } : {}),
        });
        addMessage({ type: 'text', content: `✅ 预计消耗：${estimate.data.estimatedCredits} 积分` });

        addMessage({ type: 'text', content: '🎯 正在提交任务并启动 Agent…' });
        const created = await createTikTokSolutionTask({
          sellingPoints: sellingPointsArr,
          productImageUrls: [setup.image],
          searchKeyword: setup.category,
          candidateCount: 10,
          aspectRatio: '9:16',
          duration: 15,
          lang,
          ...(memoryEntryIds.length ? { memoryEntryIds } : {}),
        });

        const taskId = created.data?.taskId;
        if (!taskId) throw new Error('taskId missing');
        setState((prev) => ({ ...prev, backendTaskId: taskId, activeRightView: 'agents', activeAgentTab: '01' }));
        await pollDetail(taskId);
      } catch (e) {
        const msg = e instanceof Error ? e.message : '请求失败';
        addMessage({ type: 'text', content: `❌ ${msg}` });
        setState((prev) => ({ ...prev, isProcessing: false }));
      }
    })();
  }, [addMessage, pollDetail, stopPolling]);

  // ─── Select video (real backend) ───
  const selectVideo = useCallback((video: CandidateVideo) => {
    if (!state.backendTaskId) return;
    stopPolling();
    setState(prev => ({
      ...prev,
      selectedVideo: video,
      isProcessing: true,
    }));

    addMessage({ type: 'selection-confirm', content: `已选择「${video.title}」作为对标视频，正在提交选择…` });
    (async () => {
      try {
        await selectTikTokSolutionCandidateVideo(state.backendTaskId as any, { url: video.cover });
        await pollDetail(state.backendTaskId as any);
      } catch (e) {
        const msg = e instanceof Error ? e.message : '选择失败';
        addMessage({ type: 'text', content: `❌ ${msg}` });
        setState((prev) => ({ ...prev, isProcessing: false }));
      }
    })();
  }, [addMessage, pollDetail, state.backendTaskId, stopPolling]);

  // ─── Confirm prompt (real backend) ───
  const confirmGenerate = useCallback(() => {
    if (!state.backendTaskId) return;
    const prompt = state.generatedPrompt.trim();
    if (!prompt) return;
    stopPolling();
    setState((prev) => ({ ...prev, isProcessing: true }));
    (async () => {
      try {
        await confirmTikTokSolutionPrompt(state.backendTaskId as any, { prompt });
        await pollDetail(state.backendTaskId as any);
      } catch (e) {
        const msg = e instanceof Error ? e.message : '确认失败';
        addMessage({ type: 'text', content: `❌ ${msg}` });
        setState((prev) => ({ ...prev, isProcessing: false }));
      }
    })();
  }, [addMessage, pollDetail, state.backendTaskId, state.generatedPrompt, stopPolling]);

  // Update prompt
  const updatePrompt = useCallback((prompt: string) => {
    setState(prev => ({ ...prev, generatedPrompt: prompt }));
  }, []);

  // Refresh candidates: backend does not expose refresh in v1; just re-poll detail to refresh signed URLs
  const refreshCandidates = useCallback(() => {
    if (!state.backendTaskId) return;
    setState((prev) => ({ ...prev, isProcessing: true }));
    stopPolling();
    void pollDetail(state.backendTaskId);
  }, [pollDetail, state.backendTaskId, stopPolling]);

  // Back to video select
  const backToVideoSelect = useCallback(() => {
    clearTimers();
    stopPolling();
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
    // backend v1: regenerate by creating a new task with same setup
    const setup = state.setup;
    if (!setup.image) return;
    stopPolling();
    setState((prev) => ({ ...prev, resultVideo: null, isProcessing: true }));
    (async () => {
      try {
        const sellingPointsArr = toLines(setup.sellingPoints);
        const memoryEntryIds = (setup.selectedMemoryIds ?? []).map((x) => Number(x)).filter((n) => Number.isFinite(n));
        const lang = navigator.language?.toLowerCase().startsWith('zh') ? 'zh' : 'en';
        const created = await createTikTokSolutionTask({
          sellingPoints: sellingPointsArr,
          productImageUrls: [setup.image],
          searchKeyword: setup.category,
          candidateCount: 10,
          aspectRatio: '9:16',
          duration: 15,
          lang,
          ...(memoryEntryIds.length ? { memoryEntryIds } : {}),
        });
        const taskId = created.data?.taskId;
        if (!taskId) throw new Error('taskId missing');
        setState((prev) => ({ ...prev, backendTaskId: taskId, selectedVideo: null, candidateVideos: [], generatedPrompt: '' }));
        await pollDetail(taskId);
      } catch (e) {
        setState((prev) => ({ ...prev, isProcessing: false }));
        addMessage({ type: 'text', content: `❌ ${(e instanceof Error ? e.message : '重试失败')}` });
      }
    })();
  }, [addMessage, pollDetail, state.setup, stopPolling]);

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
    stopPolling();
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
      backendTaskId: null,
    });
  }, []);

  const restoreState = useCallback((snapshot: SkillsState) => {
    clearTimers();
    setState({ ...snapshot, isProcessing: false });
  }, []);

  const resumeServerTask = useCallback(
    (item: TikTokSolutionTaskListItem) => {
      stopPolling();
      clearTimers();
      const setup: SessionSetup = {
        image: null,
        imageName: null,
        memoryEnabled: false,
        selectedMemoryIds: [],
        sellingPoints: (item.sellingPoints ?? []).join('\n'),
        category: item.category ?? '',
      };
      const checklistItems = [
        '匹配对标品类和卖点的爆款视频列表',
        '构建记忆库特征向量',
        '设计专属TikTok爆款视频Prompt',
        '生成专属爆款视频',
      ];
      const tasks = buildSkillsTasks(setup);
      setState({
        sessionId: `session-${Date.now()}`,
        setupCompleted: true,
        setup,
        uiMode: 'single',
        activeTaskId: String(item.taskId),
        tasks,
        messages: [{ id: `msg-${Date.now()}`, type: 'text', content: `已载入任务 #${item.taskId}` }],
        candidateVideos: [],
        selectedVideo: null,
        generatedPrompt: '',
        resultVideo: null,
        isProcessing: true,
        agents: [...initialAgents],
        activeRightView: 'agents',
        activeAgentTab: '01',
        checklistItems,
        checklistDone: [false, false, false, false],
        backendTaskId: item.taskId,
      });
      void pollDetail(item.taskId);
    },
    [pollDetail, stopPolling]
  );

  return {
    state,
    CATEGORIES,
    completeSetup,
    resumeServerTask,
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
