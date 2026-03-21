import { Play, Heart, MessageSquare } from 'lucide-react';
import logoDark from '@/assets/logo_dark.svg';
import { imageSrc } from '@/lib/imageSrc';

export interface ShowcaseCardDetail {
  author?: string;
  businessType?: string;
  purpose?: string;
  audience?: string;
  techHighlight?: string;
  stats?: { views: string; likes: string; comments: string; shares: string };
  tags?: string[];
}

export interface ShowcaseCardData {
  title: string;
  desc: string;
  hoverText: string;
  image: string;
  miniTitle: string;
  targetId: string;
  category: string;
  detail?: ShowcaseCardDetail;
  reportUrl?: string;
}

export function ShowcaseCard({
  card,
  onClick,
  variant = 'default',
}: {
  card: ShowcaseCardData;
  onClick: () => void;
  variant?: 'default' | 'visual';
}) {
  if (variant === 'visual') {
    return (
      <div className="relative group cursor-pointer" onClick={onClick}>
        <div className="relative overflow-hidden rounded-[16px] aspect-[4/3] border border-border/20">
          <img
            src={card.image}
            alt={card.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-3">
            <p className="text-background text-xs font-medium leading-snug line-clamp-2 drop-shadow-sm">
              {card.title}
            </p>
          </div>
          {/* Hover overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-foreground/55 opacity-0 transition-opacity duration-300 group-hover:opacity-100 rounded-[16px]">
            <p className="text-background text-[11px] leading-[1.4] font-medium px-3 text-center">
              {card.hoverText}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative group cursor-pointer"
      onClick={onClick}
    >
      {/* Main card */}
      <div className="relative overflow-hidden bg-muted/40 dark:bg-muted/20 rounded-[16px] backdrop-blur-[5px] z-10 border border-border/20">
        {/* Floating mini report card */}
        <div className="absolute flex items-center justify-center right-[-10px] top-[2px] w-[90px] z-10 transition-transform duration-300 ease-out group-hover:translate-x-[-6px] group-hover:translate-y-[-4px]">
          <div className="flex-none rotate-[-6deg] transition-transform duration-300 ease-out group-hover:rotate-[-4deg]">
            <div className="bg-background overflow-hidden rounded-[4px] shadow-[0px_2px_16px_0px_rgba(35,35,35,0.18)] w-[80px] h-[104px] relative">
              {/* Window dots */}
              <div className="flex items-center gap-[2px] px-[5px] py-[3px]">
                <div className="w-[2.5px] h-[2.5px] rounded-full bg-destructive" />
                <div className="w-[2.5px] h-[2.5px] rounded-full bg-amber-400" />
                <div className="w-[2.5px] h-[2.5px] rounded-full bg-emerald-400" />
              </div>
              {/* Title area */}
              <div className="flex items-start gap-[3px] px-[5px] pt-[1px] pb-[3px]">
                <div className="flex flex-col gap-[3px] flex-1 min-w-0">
                  <p className="font-semibold leading-normal line-clamp-1 text-[5px] text-foreground">
                    {card.miniTitle}
                  </p>
                  <div className="flex items-center gap-[2px]">
                    <div className="w-[6px] h-[6px] rounded-full overflow-hidden bg-muted">
                      <img alt="OranAI" src={imageSrc(logoDark)} className="w-full h-full object-contain" />
                    </div>
                    <p className="font-medium leading-normal text-[4px] text-muted-foreground truncate">
                      OranAI
                    </p>
                  </div>
                  <div className="flex items-center gap-[2px]">
                    <div className="flex items-center gap-px">
                      <Play className="w-[3.5px] h-[3.5px] text-muted-foreground fill-muted-foreground" />
                      <p className="font-medium text-[3.5px] text-muted-foreground">1080w</p>
                    </div>
                    <div className="flex items-center gap-px">
                      <Heart className="w-[3.5px] h-[3.5px] text-muted-foreground" />
                      <p className="font-medium text-[3.5px] text-muted-foreground">28w</p>
                    </div>
                    <div className="flex items-center gap-px">
                      <MessageSquare className="w-[3.5px] h-[3.5px] text-muted-foreground" />
                      <p className="font-medium text-[3.5px] text-muted-foreground">12w</p>
                    </div>
                  </div>
                </div>
              </div>
              {/* Thumbnail */}
              <div className="relative h-[70px] rounded-[3px] mx-[5px] mb-[5px] overflow-hidden">
                <img
                  alt=""
                  className="absolute inset-0 max-w-none object-cover w-full h-full"
                  src={card.image}
                />
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-muted to-transparent" />
            </div>
          </div>
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[16px] bg-foreground/55 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <p className="text-background text-[11px] leading-[1.4] font-medium">
            {card.hoverText}
          </p>
        </div>

        {/* Bottom text area */}
        <div className="relative h-[152px]">
          <div className="absolute left-0 bottom-0 flex flex-col gap-[4px] items-start justify-end p-[14px] py-[12px] w-full">
            <div className="relative shrink-0 w-[65%] whitespace-pre-wrap mb-0 group-hover:opacity-0 transition-opacity duration-200">
              <p className="font-medium leading-[1.35] text-[13px] text-foreground">
                {card.title}
              </p>
              <p className="mt-[6px] font-normal leading-[1.35] text-[10px] text-muted-foreground line-clamp-2">
                {card.desc}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const SHOWCASE_CARDS: ShowcaseCardData[] = [
  // 市场洞察 (30)
  { title: '海飞丝市场洞察深度报告', desc: '整合宏观趋势、全球化市场、人群画像、和竞品分析', hoverText: '点击查看市场洞察报告案例', image: '/haifeisi.jpg', miniTitle: '海飞丝市场洞察深度报告', targetId: 'market-insights', category: 'market', reportUrl: 'https://haifeisianalysis.photog.art/' },
  { title: '护肤品赛道趋势分析', desc: '消费者偏好变化与新兴品牌竞争格局', hoverText: '点击查看市场洞察报告案例', image: '/placeholder.svg', miniTitle: '护肤品赛道趋势分析', targetId: 'market-insights', category: 'market' },
  { title: '饮料行业消费者画像', desc: '年轻消费群体购买行为与偏好深度洞察', hoverText: '点击查看市场洞察报告案例', image: '/placeholder.svg', miniTitle: '饮料行业消费者画像', targetId: 'market-insights', category: 'market' },
  { title: '母婴品类竞品监测', desc: '头部品牌营销策略与市场份额对比分析', hoverText: '点击查看市场洞察报告案例', image: '/placeholder.svg', miniTitle: '母婴品类竞品监测', targetId: 'market-insights', category: 'market' },
  { title: '3C数码品牌声量追踪', desc: '主流社交平台品牌提及量与情感分析', hoverText: '点击查看市场洞察报告案例', image: '/placeholder.svg', miniTitle: '3C数码品牌声量追踪', targetId: 'market-insights', category: 'market' },
  { title: '食品行业新品机会挖掘', desc: '基于消费趋势发现蓝海品类与创新方向', hoverText: '点击查看市场洞察报告案例', image: '/placeholder.svg', miniTitle: '食品行业新品机会挖掘', targetId: 'market-insights', category: 'market' },
  { title: '宠物经济市场全景分析', desc: '宠物消费升级趋势与细分赛道机会', hoverText: '点击查看市场洞察报告案例', image: '/placeholder.svg', miniTitle: '宠物经济市场全景分析', targetId: 'market-insights', category: 'market' },
  { title: '运动户外品牌对比研究', desc: '头部运动品牌定位策略与用户心智分析', hoverText: '点击查看市场洞察报告案例', image: '/placeholder.svg', miniTitle: '运动户外品牌对比研究', targetId: 'market-insights', category: 'market' },
  { title: '家居行业消费升级报告', desc: '智能家居渗透率与消费者决策因素分析', hoverText: '点击查看市场洞察报告案例', image: '/placeholder.svg', miniTitle: '家居行业消费升级报告', targetId: 'market-insights', category: 'market' },
  { title: '美妆个护出海洞察', desc: '东南亚与北美市场品牌机会与消费特征', hoverText: '点击查看市场洞察报告案例', image: '/placeholder.svg', miniTitle: '美妆个护出海洞察', targetId: 'market-insights', category: 'market' },
  { title: '新能源汽车用户研究', desc: '购车决策链路与品牌认知度深度调研', hoverText: '点击查看市场洞察报告案例', image: '/placeholder.svg', miniTitle: '新能源汽车用户研究', targetId: 'market-insights', category: 'market' },
  { title: '咖啡茶饮赛道监测', desc: '连锁品牌扩张策略与区域市场份额', hoverText: '点击查看市场洞察报告案例', image: '/placeholder.svg', miniTitle: '咖啡茶饮赛道监测', targetId: 'market-insights', category: 'market' },
  { title: '跨境电商平台对比', desc: 'Amazon/Shopee/Temu 等平台流量与转化分析', hoverText: '点击查看市场洞察报告案例', image: '/placeholder.svg', miniTitle: '跨境电商平台对比', targetId: 'market-insights', category: 'market' },
  { title: '健康食品消费趋势', desc: '低糖低脂功能性食品市场规模与增长预测', hoverText: '点击查看市场洞察报告案例', image: '/placeholder.svg', miniTitle: '健康食品消费趋势', targetId: 'market-insights', category: 'market' },
  { title: '奢侈品数字化营销分析', desc: '高端品牌线上触达策略与ROI对比', hoverText: '点击查看市场洞察报告案例', image: '/placeholder.svg', miniTitle: '奢侈品数字化营销分析', targetId: 'market-insights', category: 'market' },
  { title: '教育行业获客成本研究', desc: '在线教育平台用户增长模型与LTV分析', hoverText: '点击查看市场洞察报告案例', image: '/placeholder.svg', miniTitle: '教育行业获客成本研究', targetId: 'market-insights', category: 'market' },
  { title: '服装行业季节性趋势', desc: '快时尚与设计师品牌的季节性销售规律', hoverText: '点击查看市场洞察报告案例', image: '/placeholder.svg', miniTitle: '服装行业季节性趋势', targetId: 'market-insights', category: 'market' },
  { title: '医疗健康品牌信任度', desc: '消费者对健康品牌的信任建立与传播路径', hoverText: '点击查看市场洞察报告案例', image: '/placeholder.svg', miniTitle: '医疗健康品牌信任度', targetId: 'market-insights', category: 'market' },
  { title: '游戏行业用户付费分析', desc: '手游付费用户画像与ARPPU趋势研究', hoverText: '点击查看市场洞察报告案例', image: '/placeholder.svg', miniTitle: '游戏行业用户付费分析', targetId: 'market-insights', category: 'market' },
  { title: '社交电商模式研究', desc: '拼团/直播/社群等社交电商转化效率对比', hoverText: '点击查看市场洞察报告案例', image: '/placeholder.svg', miniTitle: '社交电商模式研究', targetId: 'market-insights', category: 'market' },
  { title: '零食品类创新报告', desc: '新锐零食品牌产品创新与渠道策略', hoverText: '点击查看市场洞察报告案例', image: '/placeholder.svg', miniTitle: '零食品类创新报告', targetId: 'market-insights', category: 'market' },
  { title: '汽车后市场服务洞察', desc: '车主养护消费习惯与服务平台竞争格局', hoverText: '点击查看市场洞察报告案例', image: '/placeholder.svg', miniTitle: '汽车后市场服务洞察', targetId: 'market-insights', category: 'market' },
  { title: '旅游行业复苏追踪', desc: '出境游与本地游消费恢复趋势分析', hoverText: '点击查看市场洞察报告案例', image: '/placeholder.svg', miniTitle: '旅游行业复苏追踪', targetId: 'market-insights', category: 'market' },
  { title: '智能穿戴设备市场', desc: '智能手表/耳机品牌竞争与技术趋势', hoverText: '点击查看市场洞察报告案例', image: '/placeholder.svg', miniTitle: '智能穿戴设备市场', targetId: 'market-insights', category: 'market' },
  { title: '酒类消费年轻化趋势', desc: '低度酒与精酿啤酒在年轻群体中的渗透', hoverText: '点击查看市场洞察报告案例', image: '/placeholder.svg', miniTitle: '酒类消费年轻化趋势', targetId: 'market-insights', category: 'market' },
  { title: '家电行业渠道变革', desc: '线上线下融合趋势与新零售模式分析', hoverText: '点击查看市场洞察报告案例', image: '/placeholder.svg', miniTitle: '家电行业渠道变革', targetId: 'market-insights', category: 'market' },
  { title: '母婴营养品市场分析', desc: '奶粉/辅食/营养补充剂品牌格局与增长点', hoverText: '点击查看市场洞察报告案例', image: '/placeholder.svg', miniTitle: '母婴营养品市场分析', targetId: 'market-insights', category: 'market' },
  { title: '二手经济消费洞察', desc: '闲置交易平台用户行为与品类偏好', hoverText: '点击查看市场洞察报告案例', image: '/placeholder.svg', miniTitle: '二手经济消费洞察', targetId: 'market-insights', category: 'market' },
  { title: '本地生活服务竞争', desc: '美团/抖音/小红书本地生活业务对比', hoverText: '点击查看市场洞察报告案例', image: '/placeholder.svg', miniTitle: '本地生活服务竞争', targetId: 'market-insights', category: 'market' },
  { title: '新材料行业应用前景', desc: '可降解材料与新型包装在消费品中的应用', hoverText: '点击查看市场洞察报告案例', image: '/placeholder.svg', miniTitle: '新材料行业应用前景', targetId: 'market-insights', category: 'market' },

  // 策划方案 (30)
  { title: 'TikTok 爆款方案实战', desc: '从选题到脚本到素材清单，完整可执行方案', hoverText: '点击查看策划方案案例', image: '/placeholder.svg', miniTitle: 'TikTok 爆款方案实战', targetId: 'planning-solutions', category: 'campaign' },
  { title: '双十一整合营销方案', desc: '全渠道联动的促销策略与执行排期', hoverText: '点击查看策划方案案例', image: '/placeholder.svg', miniTitle: '双十一整合营销方案', targetId: 'planning-solutions', category: 'campaign' },
  { title: '新品上市推广计划', desc: '从预热到引爆的完整上市营销节奏', hoverText: '点击查看策划方案案例', image: '/placeholder.svg', miniTitle: '新品上市推广计划', targetId: 'planning-solutions', category: 'campaign' },
  { title: 'KOL 合作投放方案', desc: '达人筛选、内容共创与效果追踪一体化', hoverText: '点击查看策划方案案例', image: '/placeholder.svg', miniTitle: 'KOL 合作投放方案', targetId: 'planning-solutions', category: 'campaign' },
  { title: '品牌联名策划方案', desc: '跨界联名从选品到落地的完整执行手册', hoverText: '点击查看策划方案案例', image: '/placeholder.svg', miniTitle: '品牌联名策划方案', targetId: 'planning-solutions', category: 'campaign' },
  { title: '私域流量运营方案', desc: '从引流到转化的私域全链路运营策略', hoverText: '点击查看策划方案案例', image: '/placeholder.svg', miniTitle: '私域流量运营方案', targetId: 'planning-solutions', category: 'campaign' },
  { title: '节日营销活动策划', desc: '春节/中秋/圣诞等节点的创意营销方案', hoverText: '点击查看策划方案案例', image: '/placeholder.svg', miniTitle: '节日营销活动策划', targetId: 'planning-solutions', category: 'campaign' },
  { title: '直播带货策划方案', desc: '直播间选品、话术、节奏与复盘全流程', hoverText: '点击查看策划方案案例', image: '/placeholder.svg', miniTitle: '直播带货策划方案', targetId: 'planning-solutions', category: 'campaign' },
  { title: '会员日促销方案', desc: '品牌会员专属活动策划与复购提升策略', hoverText: '点击查看策划方案案例', image: '/placeholder.svg', miniTitle: '会员日促销方案', targetId: 'planning-solutions', category: 'campaign' },
  { title: '618 大促作战方案', desc: '预售/爆发/返场三阶段完整营销节奏', hoverText: '点击查看策划方案案例', image: '/placeholder.svg', miniTitle: '618 大促作战方案', targetId: 'planning-solutions', category: 'campaign' },
  { title: '品牌周年庆策划', desc: '周年庆活动创意与全渠道传播方案', hoverText: '点击查看策划方案案例', image: '/placeholder.svg', miniTitle: '品牌周年庆策划', targetId: 'planning-solutions', category: 'campaign' },
  { title: '跨境营销本地化方案', desc: '针对不同市场的本地化营销策略与执行', hoverText: '点击查看策划方案案例', image: '/placeholder.svg', miniTitle: '跨境营销本地化方案', targetId: 'planning-solutions', category: 'campaign' },
  { title: '社群裂变增长方案', desc: '基于社群的用户裂变与增长黑客策略', hoverText: '点击查看策划方案案例', image: '/placeholder.svg', miniTitle: '社群裂变增长方案', targetId: 'planning-solutions', category: 'campaign' },
  { title: '短视频矩阵运营方案', desc: '多账号矩阵内容规划与流量分配策略', hoverText: '点击查看策划方案案例', image: '/placeholder.svg', miniTitle: '短视频矩阵运营方案', targetId: 'planning-solutions', category: 'campaign' },
  { title: '品牌公关危机预案', desc: '舆情监控与危机公关应对标准流程', hoverText: '点击查看策划方案案例', image: '/placeholder.svg', miniTitle: '品牌公关危机预案', targetId: 'planning-solutions', category: 'campaign' },
  { title: '线下快闪店策划', desc: '快闪店选址、设计、引流与转化全案', hoverText: '点击查看策划方案案例', image: '/placeholder.svg', miniTitle: '线下快闪店策划', targetId: 'planning-solutions', category: 'campaign' },
  { title: '用户增长A/B测试方案', desc: '落地页/广告素材多版本测试与优化', hoverText: '点击查看策划方案案例', image: '/placeholder.svg', miniTitle: '用户增长A/B测试方案', targetId: 'planning-solutions', category: 'campaign' },
  { title: '内容营销年度规划', desc: '12个月内容日历与主题规划方案', hoverText: '点击查看策划方案案例', image: '/placeholder.svg', miniTitle: '内容营销年度规划', targetId: 'planning-solutions', category: 'campaign' },
  { title: 'SEO/SEM 整合投放', desc: '搜索引擎优化与付费推广协同策略', hoverText: '点击查看策划方案案例', image: '/placeholder.svg', miniTitle: 'SEO/SEM 整合投放', targetId: 'planning-solutions', category: 'campaign' },
  { title: '小红书种草方案', desc: '笔记投放策略与达人合作矩阵规划', hoverText: '点击查看策划方案案例', image: '/placeholder.svg', miniTitle: '小红书种草方案', targetId: 'planning-solutions', category: 'campaign' },
  { title: 'B端客户获取方案', desc: '企业客户精准触达与转化漏斗优化', hoverText: '点击查看策划方案案例', image: '/placeholder.svg', miniTitle: 'B端客户获取方案', targetId: 'planning-solutions', category: 'campaign' },
  { title: '品牌升级传播方案', desc: '品牌焕新后的市场传播与认知重塑', hoverText: '点击查看策划方案案例', image: '/placeholder.svg', miniTitle: '品牌升级传播方案', targetId: 'planning-solutions', category: 'campaign' },
  { title: '电商大促复盘模板', desc: '活动数据分析与下次大促优化建议', hoverText: '点击查看策划方案案例', image: '/placeholder.svg', miniTitle: '电商大促复盘模板', targetId: 'planning-solutions', category: 'campaign' },
  { title: '信息流广告投放方案', desc: '抖音/快手/微信信息流广告策略与创意', hoverText: '点击查看策划方案案例', image: '/placeholder.svg', miniTitle: '信息流广告投放方案', targetId: 'planning-solutions', category: 'campaign' },
  { title: '品牌IP打造方案', desc: '品牌虚拟形象设计与IP运营全案', hoverText: '点击查看策划方案案例', image: '/placeholder.svg', miniTitle: '品牌IP打造方案', targetId: 'planning-solutions', category: 'campaign' },
  { title: '口碑营销策划方案', desc: '用户评价管理与口碑传播激励机制', hoverText: '点击查看策划方案案例', image: '/placeholder.svg', miniTitle: '口碑营销策划方案', targetId: 'planning-solutions', category: 'campaign' },
  { title: '海外社媒运营方案', desc: 'Instagram/YouTube/Twitter 多平台运营策略', hoverText: '点击查看策划方案案例', image: '/placeholder.svg', miniTitle: '海外社媒运营方案', targetId: 'planning-solutions', category: 'campaign' },
  { title: '新店开业引流方案', desc: '开业前预热到首月引流的完整方案', hoverText: '点击查看策划方案案例', image: '/placeholder.svg', miniTitle: '新店开业引流方案', targetId: 'planning-solutions', category: 'campaign' },
  { title: '产品体验官招募方案', desc: '种子用户招募与UGC内容生产机制', hoverText: '点击查看策划方案案例', image: '/placeholder.svg', miniTitle: '产品体验官招募方案', targetId: 'planning-solutions', category: 'campaign' },
  { title: '年终盘点营销方案', desc: '年度总结类内容营销与品牌回顾策划', hoverText: '点击查看策划方案案例', image: '/placeholder.svg', miniTitle: '年终盘点营销方案', targetId: 'planning-solutions', category: 'campaign' },

  // 图片生成 (30)
  { title: '电商场景图批量生成', desc: '一键生成多尺寸封面图、场景图与风格化素材', hoverText: '点击查看图片生成案例', image: '/placeholder.svg', miniTitle: '电商场景图批量生成', targetId: 'text-to-image', category: 'image', detail: { author: 'OranAI Studio', businessType: 'AI 电商素材', purpose: '批量生产高质量电商场景图', audience: '电商运营、设计师', techHighlight: 'Flux Pro; ControlNet; 风格迁移', stats: { views: '320,000', likes: '8,500', comments: '420', shares: '1,800' }, tags: ['电商', '场景图', 'AI设计'] } },
  { title: '社交媒体配图生成', desc: '适配各平台尺寸的品牌风格化配图', hoverText: '点击查看图片生成案例', image: '/placeholder.svg', miniTitle: '社交媒体配图生成', targetId: 'text-to-image', category: 'image' },
  { title: '产品主图风格迁移', desc: '参考竞品风格快速生成同系列产品图', hoverText: '点击查看图片生成案例', image: '/placeholder.svg', miniTitle: '产品主图风格迁移', targetId: 'text-to-image', category: 'image' },
  { title: '广告 Banner 智能设计', desc: '输入文案自动生成多版本广告横幅', hoverText: '点击查看图片生成案例', image: '/placeholder.svg', miniTitle: '广告 Banner 智能设计', targetId: 'text-to-image', category: 'image' },
  { title: '品牌视觉物料生成', desc: '名片、海报、宣传册等品牌物料批量生成', hoverText: '点击查看图片生成案例', image: '/placeholder.svg', miniTitle: '品牌视觉物料生成', targetId: 'text-to-image', category: 'image' },
  { title: '节日主题素材生成', desc: '春节/618/双11等节日风格素材自动生成', hoverText: '点击查看图片生成案例', image: '/placeholder.svg', miniTitle: '节日主题素材生成', targetId: 'text-to-image', category: 'image' },
  { title: 'AI 模特换装生成', desc: '同一产品搭配不同模特与场景的换装图', hoverText: '点击查看图片生成案例', image: '/placeholder.svg', miniTitle: 'AI 模特换装生成', targetId: 'text-to-image', category: 'image' },
  { title: '详情页图文排版', desc: '自动生成符合平台规范的详情页图文', hoverText: '点击查看图片生成案例', image: '/placeholder.svg', miniTitle: '详情页图文排版', targetId: 'text-to-image', category: 'image' },
  { title: '产品包装设计生成', desc: 'AI生成多风格产品包装视觉方案', hoverText: '点击查看图片生成案例', image: '/placeholder.svg', miniTitle: '产品包装设计生成', targetId: 'text-to-image', category: 'image' },
  { title: '品牌LOGO概念生成', desc: '输入品牌理念快速生成多版本LOGO方案', hoverText: '点击查看图片生成案例', image: '/placeholder.svg', miniTitle: '品牌LOGO概念生成', targetId: 'text-to-image', category: 'image' },
  { title: '直播间背景图设计', desc: '生成专业直播间虚拟背景与氛围图', hoverText: '点击查看图片生成案例', image: '/placeholder.svg', miniTitle: '直播间背景图设计', targetId: 'text-to-image', category: 'image' },
  { title: '食品摆盘场景图', desc: '美食产品的精美摆盘与场景化呈现', hoverText: '点击查看图片生成案例', image: '/placeholder.svg', miniTitle: '食品摆盘场景图', targetId: 'text-to-image', category: 'image' },
  { title: '家居空间效果图', desc: '家居产品在不同空间风格中的效果展示', hoverText: '点击查看图片生成案例', image: '/placeholder.svg', miniTitle: '家居空间效果图', targetId: 'text-to-image', category: 'image' },
  { title: '服装穿搭效果图', desc: '服饰产品多场景穿搭展示与风格搭配', hoverText: '点击查看图片生成案例', image: '/placeholder.svg', miniTitle: '服装穿搭效果图', targetId: 'text-to-image', category: 'image' },
  { title: '优惠券封面设计', desc: '自动生成多风格优惠券与活动封面', hoverText: '点击查看图片生成案例', image: '/placeholder.svg', miniTitle: '优惠券封面设计', targetId: 'text-to-image', category: 'image' },
  { title: '商品对比图生成', desc: '产品参数对比与优势可视化图片', hoverText: '点击查看图片生成案例', image: '/placeholder.svg', miniTitle: '商品对比图生成', targetId: 'text-to-image', category: 'image' },
  { title: '品牌色彩系统生成', desc: '基于品牌调性生成完整色彩方案与应用', hoverText: '点击查看图片生成案例', image: '/placeholder.svg', miniTitle: '品牌色彩系统生成', targetId: 'text-to-image', category: 'image' },
  { title: '手绘风格插画生成', desc: '品牌故事手绘插画与漫画风格素材', hoverText: '点击查看图片生成案例', image: '/placeholder.svg', miniTitle: '手绘风格插画生成', targetId: 'text-to-image', category: 'image' },
  { title: '3D产品渲染图', desc: '产品360°三维渲染与多角度展示', hoverText: '点击查看图片生成案例', image: '/placeholder.svg', miniTitle: '3D产品渲染图', targetId: 'text-to-image', category: 'image' },
  { title: '微信公众号封面', desc: '适配公众号头图尺寸的品牌风格封面', hoverText: '点击查看图片生成案例', image: '/placeholder.svg', miniTitle: '微信公众号封面', targetId: 'text-to-image', category: 'image' },
  { title: '户外广告视觉设计', desc: '地铁/公交/户外大屏广告画面生成', hoverText: '点击查看图片生成案例', image: '/placeholder.svg', miniTitle: '户外广告视觉设计', targetId: 'text-to-image', category: 'image' },
  { title: '电商促销标签设计', desc: '折扣标签、角标、价签等促销视觉元素', hoverText: '点击查看图片生成案例', image: '/placeholder.svg', miniTitle: '电商促销标签设计', targetId: 'text-to-image', category: 'image' },
  { title: '证书奖状模板生成', desc: '活动证书与荣誉奖状模板批量生成', hoverText: '点击查看图片生成案例', image: '/placeholder.svg', miniTitle: '证书奖状模板生成', targetId: 'text-to-image', category: 'image' },
  { title: '表情包素材生成', desc: '品牌IP表情包与趣味贴纸批量生成', hoverText: '点击查看图片生成案例', image: '/placeholder.svg', miniTitle: '表情包素材生成', targetId: 'text-to-image', category: 'image' },
  { title: '电子邀请函设计', desc: '活动/发布会电子邀请函视觉设计', hoverText: '点击查看图片生成案例', image: '/placeholder.svg', miniTitle: '电子邀请函设计', targetId: 'text-to-image', category: 'image' },
  { title: '数据可视化图表', desc: '营销数据报告中的图表与信息图生成', hoverText: '点击查看图片生成案例', image: '/placeholder.svg', miniTitle: '数据可视化图表', targetId: 'text-to-image', category: 'image' },
  { title: '产品使用说明图', desc: '产品安装与使用步骤的图解说明', hoverText: '点击查看图片生成案例', image: '/placeholder.svg', miniTitle: '产品使用说明图', targetId: 'text-to-image', category: 'image' },
  { title: '品牌周边设计', desc: '帆布袋/马克杯/手机壳等周边产品图', hoverText: '点击查看图片生成案例', image: '/placeholder.svg', miniTitle: '品牌周边设计', targetId: 'text-to-image', category: 'image' },
  { title: '季节性主题更换', desc: '店铺首页随季节自动更换主题视觉', hoverText: '点击查看图片生成案例', image: '/placeholder.svg', miniTitle: '季节性主题更换', targetId: 'text-to-image', category: 'image' },
  { title: 'KV主视觉设计', desc: '营销活动主视觉Key Visual快速生成', hoverText: '点击查看图片生成案例', image: '/placeholder.svg', miniTitle: 'KV主视觉设计', targetId: 'text-to-image', category: 'image' },

  // 视频复刻 (30)
  { title: 'Red Bull 极限运动混剪', desc: '高动态风格化饮料广告，播放量 67 万', hoverText: '点击复刻此爆款视频', image: '/placeholder.svg', miniTitle: 'Red Bull 极限运动混剪', targetId: 'replicate-video', category: 'video', detail: { author: 'Billy Boman', businessType: 'AI energy drink ad', purpose: '高动态风格化饮料广告吸引品牌', audience: 'Red Bull 消费者、极限运动爱好者、AI 创作者', techHighlight: '95% Flow by Google; 5% Seedance; AE 调色与转场', stats: { views: '670,000', likes: '15,000', comments: '760', shares: '2,700' }, tags: ['Red Bull', '极限运动', 'Flow'] } },
  { title: '护肤品成分可视化', desc: '透明质酸分子动画 + 产品展示，播放量 120 万', hoverText: '点击复刻此爆款视频', image: '/placeholder.svg', miniTitle: '护肤品成分可视化', targetId: 'replicate-video', category: 'video' },
  { title: '咖啡拉花慢镜头', desc: '极致美学慢动作咖啡制作过程，播放量 89 万', hoverText: '点击复刻此爆款视频', image: '/placeholder.svg', miniTitle: '咖啡拉花慢镜头', targetId: 'replicate-video', category: 'video' },
  { title: '运动鞋 360° 展示', desc: 'AI 生成运动鞋旋转展示 + 科技感特效，播放量 210 万', hoverText: '点击复刻此爆款视频', image: '/placeholder.svg', miniTitle: '运动鞋 360° 展示', targetId: 'replicate-video', category: 'video' },
  { title: '美妆变装挑战', desc: '素颜到精致妆容的变装视频，播放量 450 万', hoverText: '点击复刻此爆款视频', image: '/placeholder.svg', miniTitle: '美妆变装挑战', targetId: 'replicate-video', category: 'video' },
  { title: '零食开箱 ASMR', desc: '沉浸式零食开箱与试吃体验，播放量 95 万', hoverText: '点击复刻此爆款视频', image: '/placeholder.svg', miniTitle: '零食开箱 ASMR', targetId: 'replicate-video', category: 'video' },
  { title: '宠物日常 Vlog', desc: '萌宠搞笑日常合集，播放量 380 万', hoverText: '点击复刻此爆款视频', image: '/placeholder.svg', miniTitle: '宠物日常 Vlog', targetId: 'replicate-video', category: 'video' },
  { title: '家居好物分享', desc: '高颜值家居收纳神器展示，播放量 150 万', hoverText: '点击复刻此爆款视频', image: '/placeholder.svg', miniTitle: '家居好物分享', targetId: 'replicate-video', category: 'video' },
  { title: '健身教程 30 秒', desc: '快节奏居家健身动作教学，播放量 260 万', hoverText: '点击复刻此爆款视频', image: '/placeholder.svg', miniTitle: '健身教程 30 秒', targetId: 'replicate-video', category: 'video' },
  { title: '美食制作过程', desc: '从食材到成品的高速剪辑，播放量 310 万', hoverText: '点击复刻此爆款视频', image: '/placeholder.svg', miniTitle: '美食制作过程', targetId: 'replicate-video', category: 'video' },
  { title: '旅行目的地推荐', desc: '航拍 + 转场的旅行短视频，播放量 180 万', hoverText: '点击复刻此爆款视频', image: '/placeholder.svg', miniTitle: '旅行目的地推荐', targetId: 'replicate-video', category: 'video' },
  { title: '穿搭灵感合集', desc: '一周七套 OOTD 快速换装，播放量 220 万', hoverText: '点击复刻此爆款视频', image: '/placeholder.svg', miniTitle: '穿搭灵感合集', targetId: 'replicate-video', category: 'video' },
  { title: '新能源车体验', desc: '智能座舱功能展示与驾驶体验，播放量 95 万', hoverText: '点击复刻此爆款视频', image: '/placeholder.svg', miniTitle: '新能源车体验', targetId: 'replicate-video', category: 'video' },
  { title: '手工 DIY 教程', desc: '创意手工制作全过程，播放量 130 万', hoverText: '点击复刻此爆款视频', image: '/placeholder.svg', miniTitle: '手工 DIY 教程', targetId: 'replicate-video', category: 'video' },
  { title: '数码产品开箱', desc: '最新科技产品首发开箱测评，播放量 170 万', hoverText: '点击复刻此爆款视频', image: '/placeholder.svg', miniTitle: '数码产品开箱', targetId: 'replicate-video', category: 'video' },
  { title: '母婴好物推荐', desc: '实用母婴产品真实测评，播放量 88 万', hoverText: '点击复刻此爆款视频', image: '/placeholder.svg', miniTitle: '母婴好物推荐', targetId: 'replicate-video', category: 'video' },
  { title: '潮玩盲盒拆箱', desc: '限定款潮玩开箱 + 收藏展示，播放量 240 万', hoverText: '点击复刻此爆款视频', image: '/placeholder.svg', miniTitle: '潮玩盲盒拆箱', targetId: 'replicate-video', category: 'video' },
  { title: '户外露营 Vlog', desc: '精致露营场景布置与体验分享，播放量 160 万', hoverText: '点击复刻此爆款视频', image: '/placeholder.svg', miniTitle: '户外露营 Vlog', targetId: 'replicate-video', category: 'video' },
  { title: '香水测评合集', desc: '多款热门香水对比与推荐，播放量 110 万', hoverText: '点击复刻此爆款视频', image: '/placeholder.svg', miniTitle: '香水测评合集', targetId: 'replicate-video', category: 'video' },
  { title: '街头美食探店', desc: '各地特色街头美食打卡，播放量 290 万', hoverText: '点击复刻此爆款视频', image: '/placeholder.svg', miniTitle: '街头美食探店', targetId: 'replicate-video', category: 'video' },
  { title: '书桌布置灵感', desc: '学习/办公桌面改造与好物分享，播放量 75 万', hoverText: '点击复刻此爆款视频', image: '/placeholder.svg', miniTitle: '书桌布置灵感', targetId: 'replicate-video', category: 'video' },
  { title: '国风汉服展示', desc: '汉服穿搭 + 古风场景拍摄，播放量 340 万', hoverText: '点击复刻此爆款视频', image: '/placeholder.svg', miniTitle: '国风汉服展示', targetId: 'replicate-video', category: 'video' },
  { title: '智能家居体验', desc: '全屋智能联动场景展示，播放量 85 万', hoverText: '点击复刻此爆款视频', image: '/placeholder.svg', miniTitle: '智能家居体验', targetId: 'replicate-video', category: 'video' },
  { title: '乐器演奏短片', desc: '钢琴/吉他热门曲目演奏，播放量 200 万', hoverText: '点击复刻此爆款视频', image: '/placeholder.svg', miniTitle: '乐器演奏短片', targetId: 'replicate-video', category: 'video' },
  { title: '创意广告混剪', desc: '全球优秀创意广告精选混剪，播放量 145 万', hoverText: '点击复刻此爆款视频', image: '/placeholder.svg', miniTitle: '创意广告混剪', targetId: 'replicate-video', category: 'video' },
  { title: '夜市美食合集', desc: '夜市小吃制作过程特写，播放量 270 万', hoverText: '点击复刻此爆款视频', image: '/placeholder.svg', miniTitle: '夜市美食合集', targetId: 'replicate-video', category: 'video' },
  { title: '职场穿搭指南', desc: '通勤风 OOTD 搭配建议，播放量 92 万', hoverText: '点击复刻此爆款视频', image: '/placeholder.svg', miniTitle: '职场穿搭指南', targetId: 'replicate-video', category: 'video' },
  { title: '甜品制作教程', desc: '高颜值甜品从零制作过程，播放量 185 万', hoverText: '点击复刻此爆款视频', image: '/placeholder.svg', miniTitle: '甜品制作教程', targetId: 'replicate-video', category: 'video' },
  { title: '滑板技巧展示', desc: '街头滑板花式动作合集，播放量 320 万', hoverText: '点击复刻此爆款视频', image: '/placeholder.svg', miniTitle: '滑板技巧展示', targetId: 'replicate-video', category: 'video' },
  { title: '品牌联名开箱', desc: '热门品牌联名款产品首发开箱，播放量 155 万', hoverText: '点击复刻此爆款视频', image: '/placeholder.svg', miniTitle: '品牌联名开箱', targetId: 'replicate-video', category: 'video' },
  { title: '互动投票视频', desc: '带互动选项的产品投票与调研视频', hoverText: '点击查看视频生成案例', image: '/placeholder.svg', miniTitle: '互动投票视频', targetId: 'reference-to-video', category: 'video' },
  { title: 'AI数字人带货视频', desc: '虚拟数字人产品讲解与带货视频', hoverText: '点击查看视频生成案例', image: '/placeholder.svg', miniTitle: 'AI数字人带货视频', targetId: 'reference-to-video', category: 'video' },
];
