import { motion } from 'framer-motion';
import { Zap, Shield, History, BarChart3, Lightbulb, Image, Video } from 'lucide-react';
import { FeatureCard } from './FeatureCard';
import { PreviewInsight, PreviewPlanner, PreviewImageGen, PreviewVideoGen, PreviewTikTok } from './FeaturePreviews';
import { AppPlazaShowcaseSection } from './AppPlazaShowcaseSection';

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];
const fadeUp = (i: number) => ({
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5, ease } },
});

const BRAND_FLOW = [
  {
    label: '市场洞察',
    targetId: 'market-insights',
    desc: '整合宏观趋势、竞品动态与人群画像，快速生成深度洞察报告',
    icon: <BarChart3 className="size-5" />,
    preview: <PreviewInsight />,
  },
  {
    label: '策划方案',
    targetId: 'planning-solutions',
    desc: '基于洞察数据自动生成营销策划方案，涵盖策略、排期与预算',
    icon: <Lightbulb className="size-5" />,
    preview: <PreviewPlanner />,
  },
  {
    label: '图片生成',
    targetId: 'text-to-image',
    desc: '通过文字描述批量生成电商场景图、封面图与风格化素材',
    icon: <Image className="size-5" />,
    preview: <PreviewImageGen />,
  },
  {
    label: '视频生成',
    targetId: 'text-to-video',
    desc: '从脚本到分镜到成片，AI 辅助完成视频全流程制作',
    icon: <Video className="size-5" />,
    preview: <PreviewVideoGen />,
  },
];

interface HeroSectionProps {
  onNavigate: (itemId: string) => void;
}

export function HeroSection({ onNavigate }: HeroSectionProps) {
  return (
    <>
      <section className="pt-20 lg:pt-28 flex flex-col">
        <div className="w-full">
          <motion.div variants={fadeUp(0)} initial="hidden" animate="visible">
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl tracking-tight leading-[1.1] text-[#3d3d3d] font-normal">
              Oran Gen Toolbox
            </h1>
            <p className="font-display text-lg sm:text-xl md:text-2xl font-light text-foreground/60 mt-3 max-w-2xl tracking-tight">
              把洞察→策略→素材生产做成可复用工作流
            </p>
          </motion.div>

          <motion.p
            variants={fadeUp(1)}
            initial="hidden"
            animate="visible"
            className="text-sm sm:text-base font-light text-muted-foreground mt-6 max-w-2xl leading-relaxed"
          >
            用 5 个核心工具完成 TikTok 增长闭环：先看市场，再定策略，最后批量生产内容。
          </motion.p>

          <motion.div
            variants={fadeUp(2)}
            initial="hidden"
            animate="visible"
            className="flex flex-col sm:flex-row gap-4 sm:gap-8 mt-8"
          >
            {[
              { icon: <Zap className="w-4 h-4 text-accent" />, text: '更快：输入关键要素，一键生成可用输出' },
              { icon: <Shield className="w-4 h-4 text-accent" />, text: '更稳：模板化结构，团队统一口径' },
              { icon: <History className="w-4 h-4 text-accent" />, text: '可追踪：历史记录与结果复盘' },
            ].map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-foreground/70 font-light">
                {p.icon}
                <span>{p.text}</span>
              </div>
            ))}
          </motion.div>

          <motion.div variants={fadeUp(3)} initial="hidden" animate="visible" className="mt-12">
            <h2 className="text-lg font-normal text-foreground/60 mb-5">品牌营销全链路</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {BRAND_FLOW.map((step, i) => (
                <FeatureCard
                  key={i}
                  title={step.label}
                  description={step.desc}
                  preview={step.preview}
                  onClick={() => onNavigate(step.targetId)}
                />
              ))}
            </div>
          </motion.div>

          <motion.div variants={fadeUp(4)} initial="hidden" animate="visible" className="mt-10">
            <h2 className="text-lg font-normal text-foreground/60 mb-5">AI营销Skills</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FeatureCard
                title="TikTok解决方案"
                description="从选题到脚本到素材清单，生成完整可执行的 TikTok 增长方案"
                preview={<PreviewTikTok />}
                onClick={() => onNavigate('tiktok-solution')}
              />
            </div>
          </motion.div>
        </div>
      </section>

      <AppPlazaShowcaseSection onNavigate={onNavigate} />
    </>
  );
}
