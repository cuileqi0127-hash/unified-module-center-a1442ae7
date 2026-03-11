import {
  ArrowLeft,
  Target,
  Users,
  Megaphone,
  Calendar,
  TrendingUp,
  Zap,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Download,
  Database,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useMemory } from '@/contexts/MemoryContext';
import type { CampaignPayload } from './CampaignPlannerComposer';
import {
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const channelAllocationData = [
  { name: '抖音短视频', value: 35, color: 'hsl(var(--accent))' },
  { name: '小红书种草', value: 25, color: 'hsl(var(--foreground) / 0.7)' },
  { name: 'KOL合作', value: 20, color: 'hsl(var(--foreground) / 0.4)' },
  { name: '信息流广告', value: 15, color: 'hsl(var(--foreground) / 0.2)' },
  { name: '其他', value: 5, color: 'hsl(var(--muted-foreground) / 0.3)' },
];

const kpiRadarData = [
  { subject: '曝光量', target: 90, benchmark: 60 },
  { subject: '互动率', target: 85, benchmark: 55 },
  { subject: '转化率', target: 75, benchmark: 50 },
  { subject: '品牌认知', target: 80, benchmark: 45 },
  { subject: 'ROI', target: 70, benchmark: 65 },
];

const weeklyPlanData = [
  { week: 'W1', content: 45, kol: 10, ads: 20 },
  { week: 'W2', content: 50, kol: 25, ads: 30 },
  { week: 'W3', content: 60, kol: 40, ads: 45 },
  { week: 'W4', content: 55, kol: 35, ads: 50 },
  { week: 'W5', content: 70, kol: 50, ads: 60 },
  { week: 'W6', content: 80, kol: 60, ads: 55 },
  { week: 'W7', content: 90, kol: 45, ads: 70 },
  { week: 'W8', content: 85, kol: 55, ads: 65 },
];

interface CampaignPlannerReportProps {
  payload: CampaignPayload;
  onBack: () => void;
}

export function CampaignPlannerReport({ payload, onBack }: CampaignPlannerReportProps) {
  const { addEntry, setDrawerOpen } = useMemory();

  const handleCopyToMemory = () => {
    const md = `# ${payload.brandName} · ${payload.goal}策划方案

> 生成时间：${new Date().toLocaleDateString('zh-CN')}

## 策略摘要

针对 **${payload.brandName}** 的 **${payload.goal}** 目标，聚焦 ${payload.audience.join('、')} 人群，以"${payload.sellingPoints.join('、')}"为核心卖点，制定为期8周的全域营销方案。

| 指标 | 数值 |
|------|------|
| 执行周期 | **8周** |
| 核心阶段 | **3个** |
| 覆盖渠道 | **${payload.channels.length + 2}个** |

## 目标人群画像

${payload.audience.map((a, i) => `- **${a}**：${i === 0 ? '核心目标人群，消费意愿强，易被种草内容触达' : i === 1 ? '高潜力人群，关注功效与口碑，转化周期较短' : '扩展人群，通过内容培育逐步渗透'}`).join('\n')}

## 卖点传播策略

${payload.sellingPoints.map((sp, i) => `### ${sp}（优先级：${i === 0 ? '最高' : i === 1 ? '高' : '中'}）\n${i === 0 ? '作为主打卖点，贯穿所有内容创意，强化用户记忆' : i === 1 ? '在对比测评、使用教程类内容中重点呈现' : '作为辅助卖点在长文案、详情页中补充说明'}`).join('\n\n')}

## 渠道预算分配

| 渠道 | 占比 |
|------|------|
| 抖音短视频 | 35% |
| 小红书种草 | 25% |
| KOL合作 | 20% |
| 信息流广告 | 15% |
| 其他 | 5% |

## 分阶段执行计划

### 预热期（第1-2周）
- 🎬 抖音：发布3-5条种草短视频，建立话题标签
- 📝 小红书：铺设20篇素人笔记，覆盖核心卖点
- 🤝 KOL：锁定3位垂类达人，寄品体验
- **KPI**：曝光量 500万+，话题阅读量 100万+

### 爆发期（第3-5周）
- 🎬 抖音：达人合作视频集中发布，配合信息流投放
- 📝 小红书：腰部达人种草+品牌号联动
- 🎙 直播：品牌自播+达人专场各1场
- 📢 广告：千川/DOU+精准投放高互动内容
- **KPI**：互动量 50万+，GMV 突破 20万

### 长尾期（第6-8周）
- 📣 内容：用户UGC征集活动，二次传播
- 👥 私域：粉丝群运营，复购激励
- 📊 数据：全链路ROI复盘，优化后续策略
- **KPI**：复购率 15%+，品牌搜索指数提升 30%

## 风险评估与应对

| 风险项 | 等级 | 应对措施 |
|--------|------|----------|
| 内容同质化风险 | 🟡 中 | 建立差异化内容矩阵，每批次测试3种创意方向 |
| 达人翻车风险 | 🔴 高 | 签订合规条款，预审内容，准备危机公关预案 |
| 预算超支风险 | 🟢 低 | 设置阶段性预算上限，每周review花费效率 |
| 竞品截流风险 | 🟡 中 | 持续监控竞品动态，预留10%预算做防御性投放 |
`;

    addEntry({
      title: `${payload.brandName} · ${payload.goal}策划方案`,
      content: md,
      category: 'strategy',
      tags: ['策划方案', payload.goal, payload.brandName],
    });
    setDrawerOpen(true);
  };

  const phases = [
    {
      name: '预热期（第1-2周）',
      tasks: [
        { channel: '抖音', action: '发布3-5条种草短视频，建立话题标签', status: 'ready' },
        { channel: '小红书', action: '铺设20篇素人笔记，覆盖核心卖点', status: 'ready' },
        { channel: 'KOL', action: '锁定3位垂类达人，寄品体验', status: 'ready' },
      ],
      kpi: '曝光量 500万+，话题阅读量 100万+',
    },
    {
      name: '爆发期（第3-5周）',
      tasks: [
        { channel: '抖音', action: '达人合作视频集中发布，配合信息流投放', status: 'ready' },
        { channel: '小红书', action: '腰部达人种草+品牌号联动', status: 'ready' },
        { channel: '直播', action: '品牌自播+达人专场各1场', status: 'ready' },
        { channel: '广告', action: '千川/DOU+精准投放高互动内容', status: 'ready' },
      ],
      kpi: '互动量 50万+，GMV 突破 20万',
    },
    {
      name: '长尾期（第6-8周）',
      tasks: [
        { channel: '内容', action: '用户UGC征集活动，二次传播', status: 'ready' },
        { channel: '私域', action: '粉丝群运营，复购激励', status: 'ready' },
        { channel: '数据', action: '全链路ROI复盘，优化后续策略', status: 'ready' },
      ],
      kpi: '复购率 15%+，品牌搜索指数提升 30%',
    },
  ];

  const risks = [
    {
      item: '内容同质化风险',
      level: 'medium',
      mitigation: '建立差异化内容矩阵，每批次测试3种创意方向',
    },
    {
      item: '达人翻车风险',
      level: 'high',
      mitigation: '签订合规条款，预审内容，准备危机公关预案',
    },
    {
      item: '预算超支风险',
      level: 'low',
      mitigation: '设置阶段性预算上限，每周review花费效率',
    },
    {
      item: '竞品截流风险',
      level: 'medium',
      mitigation: '持续监控竞品动态，预留10%预算做防御性投放',
    },
  ];

  return (
    <div className="min-h-full bg-muted/30">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border/20">
        <div className="px-6 py-4 max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-lg font-medium text-foreground">
                {payload.brandName} · {payload.goal}策划方案
              </h1>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {payload.audience.map((a) => (
                  <span
                    key={a}
                    className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-full"
                  >
                    {a}
                  </span>
                ))}
                {payload.budget && (
                  <span className="text-[10px] bg-muted/40 text-muted-foreground px-1.5 py-0.5 rounded-full">
                    {payload.budget}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={handleCopyToMemory}
            >
              <Database className="w-3.5 h-3.5" />
              复制到记忆库
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => {
                const printArea = document.getElementById('campaign-planner-report');
                if (!printArea) return;
                const win = window.open('', '_blank');
                if (!win) return;
                win.document.write(
                  `<!DOCTYPE html><html><head><title>${payload.brandName} · ${payload.goal}策划方案</title><style>body{font-family:system-ui,-apple-system,sans-serif;padding:40px;color:#333}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}h1,h2,h3{margin-top:24px}.print-card{border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:16px}@media print{body{padding:20px}}</style></head><body>${printArea.innerHTML}</body></html>`
                );
                win.document.close();
                setTimeout(() => {
                  win.print();
                }, 500);
              }}
            >
              <Download className="w-3.5 h-3.5" />
              导出 PDF
            </Button>
          </div>
        </div>
      </div>

      <div
        id="campaign-planner-report"
        className="px-6 py-6 max-w-7xl mx-auto space-y-6 animate-fade-in"
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="w-4 h-4 text-accent" />
                策略摘要
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-foreground/80 leading-relaxed">
                针对 <span className="font-medium text-foreground">{payload.brandName}</span> 的
                <span className="font-medium text-accent"> {payload.goal}</span> 目标，聚焦{' '}
                {payload.audience.join('、')} 人群，以 &quot;{payload.sellingPoints.join('、')}&quot;
                为核心卖点，制定为期8周的全域营销方案。
              </p>
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border/20">
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">8</div>
                  <div className="text-[10px] text-muted-foreground">执行周期(周)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent">3</div>
                  <div className="text-[10px] text-muted-foreground">核心阶段</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">
                    {payload.channels.length + 2}
                  </div>
                  <div className="text-[10px] text-muted-foreground">覆盖渠道</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="w-4 h-4 text-accent" />
                核心 KPI 目标
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={kpiRadarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar
                    name="目标值"
                    dataKey="target"
                    stroke="hsl(var(--accent))"
                    fill="hsl(var(--accent))"
                    fillOpacity={0.25}
                  />
                  <Radar
                    name="行业基准"
                    dataKey="benchmark"
                    stroke="hsl(var(--muted-foreground))"
                    fill="hsl(var(--muted-foreground))"
                    fillOpacity={0.1}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="w-4 h-4 text-accent" />
                目标人群画像
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {payload.audience.map((tag, i) => (
                <div key={tag} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-xs font-medium text-accent">
                    P{i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{tag}</p>
                    <p className="text-xs text-muted-foreground">
                      {i === 0
                        ? '核心目标人群，消费意愿强，易被种草内容触达'
                        : i === 1
                          ? '高潜力人群，关注功效与口碑，转化周期较短'
                          : '扩展人群，通过内容培育逐步渗透'}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {i === 0 ? '核心' : i === 1 ? '高潜' : '扩展'}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Megaphone className="w-4 h-4 text-accent" />
                卖点传播策略
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {payload.sellingPoints.map((sp, i) => (
                <div key={sp} className="rounded-xl border border-border/20 bg-muted/20 p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-foreground">{sp}</span>
                    <span className="text-[10px] text-accent font-medium">
                      优先级 {i === 0 ? '最高' : i === 1 ? '高' : '中'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {i === 0
                      ? '作为主打卖点，贯穿所有内容创意，强化用户记忆'
                      : i === 1
                        ? '在对比测评、使用教程类内容中重点呈现'
                        : '作为辅助卖点在长文案、详情页中补充说明'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-[10px] bg-muted/40 px-1.5 py-0.5 rounded-full text-muted-foreground">
                      短视频
                    </span>
                    <span className="text-[10px] bg-muted/40 px-1.5 py-0.5 rounded-full text-muted-foreground">
                      图文笔记
                    </span>
                    {i === 0 && (
                      <span className="text-[10px] bg-accent/10 px-1.5 py-0.5 rounded-full text-accent">
                        直播话术
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="w-4 h-4 text-accent" />
                渠道预算分配
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={channelAllocationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }: { name: string; value: number }) => `${name} ${value}%`}
                  >
                    {channelAllocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="w-4 h-4 text-accent" />
                周度执行力度
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weeklyPlanData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar
                    dataKey="content"
                    name="内容产出"
                    fill="hsl(var(--accent))"
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    dataKey="kol"
                    name="KOL合作"
                    fill="hsl(var(--foreground) / 0.4)"
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    dataKey="ads"
                    name="广告投放"
                    fill="hsl(var(--foreground) / 0.15)"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-4 h-4 text-accent" />
              分阶段执行计划
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {phases.map((phase, pi) => (
              <div key={pi} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-foreground">{phase.name}</h3>
                  <span className="text-[10px] text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full">
                    KPI: {phase.kpi}
                  </span>
                </div>
                <div className="space-y-2">
                  {phase.tasks.map((task, ti) => (
                    <div
                      key={ti}
                      className="flex items-start gap-3 rounded-lg border border-border/20 bg-muted/10 p-3"
                    >
                      <CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] h-5">
                            {task.channel}
                          </Badge>
                          <span className="text-xs text-foreground/80">{task.action}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {pi < phases.length - 1 && (
                  <div className="flex justify-center py-1">
                    <ChevronRight className="w-4 h-4 text-muted-foreground/30 rotate-90" />
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="w-4 h-4 text-accent" />
              风险评估与应对
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {risks.map((risk, i) => (
                <div key={i} className="rounded-xl border border-border/20 bg-muted/10 p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-foreground">{risk.item}</span>
                    <Badge
                      variant={risk.level === 'high' ? 'destructive' : 'secondary'}
                      className="text-[10px]"
                    >
                      {risk.level === 'high'
                        ? '高风险'
                        : risk.level === 'medium'
                          ? '中风险'
                          : '低风险'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-accent">应对：</span>
                    {risk.mitigation}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="h-8" />
      </div>
    </div>
  );
}
