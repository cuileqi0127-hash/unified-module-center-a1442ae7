/**
 * Shared trending video data source.
 * Used by: ReplicateWorkspace (近期热门), App Plaza showcase (灵感库)
 */

const COVER_GRADIENTS = [
  'from-rose-500/60 to-orange-400/60',
  'from-blue-500/60 to-cyan-400/60',
  'from-violet-500/60 to-purple-400/60',
  'from-emerald-500/60 to-green-400/60',
  'from-amber-500/60 to-yellow-400/60',
  'from-pink-500/60 to-rose-400/60',
  'from-indigo-500/60 to-blue-400/60',
  'from-red-500/60 to-rose-400/60',
  'from-teal-500/60 to-cyan-400/60',
  'from-fuchsia-500/60 to-pink-400/60',
];

let BASE_TRENDING_VIDEOS: TrendingVideoItem[];

export let TRENDING_VIDEOS: TrendingVideoItem[] = [];
export const TEMP_TRENDING_VIDEO_URL = '/app-plaza-inspiration-temp.mp4';

export interface TrendingVideoDetail {
  author?: string;
  businessType?: string;
  purpose?: string;
  audience?: string;
  techHighlight?: string;
  stats?: { views: string; likes: string; comments: string; shares: string };
  tags?: string[];
}

export interface TrendingVideoItem {
  id: string;
  title: string;
  desc: string;
  views: string;
  likes: string;
  coverGradient: string;
  videoUrl?: string;
  detail?: TrendingVideoDetail;
}

BASE_TRENDING_VIDEOS = [
  { id: 't1', title: 'Red Bull 极限运动混剪', desc: '高动态风格化饮料广告，播放量 67 万', views: '67万', likes: '1.5万', coverGradient: COVER_GRADIENTS[0], detail: { author: 'Red Bull Official', businessType: '饮料品牌', purpose: '品牌形象推广', audience: '18-35岁运动爱好者', techHighlight: 'AI 动态剪辑 + 风格迁移', stats: { views: '67万', likes: '1.5万', comments: '3200', shares: '8900' }, tags: ['极限运动', '品牌广告', '动感剪辑'] } },
  { id: 't2', title: '护肤品成分可视化', desc: '透明质酸分子动画 + 产品展示，播放量 120 万', views: '120万', likes: '8.5万', coverGradient: COVER_GRADIENTS[1], detail: { author: '护肤研究所', businessType: '美妆护肤', purpose: '产品教育种草', audience: '20-40岁女性', techHighlight: 'AI 分子动画生成', stats: { views: '120万', likes: '8.5万', comments: '1.2万', shares: '2.8万' }, tags: ['护肤', '成分党', '科普'] } },
  { id: 't3', title: '咖啡拉花慢镜头', desc: '极致美学慢动作咖啡制作过程，播放量 89 万', views: '89万', likes: '6.2万', coverGradient: COVER_GRADIENTS[2], detail: { author: '咖啡美学工作室', businessType: '餐饮', purpose: '品牌美学传播', audience: '咖啡爱好者', techHighlight: 'AI 超级慢动作增强', stats: { views: '89万', likes: '6.2万', comments: '4500', shares: '1.2万' }, tags: ['咖啡', '慢镜头', '美学'] } },
  { id: 't4', title: '运动鞋 360° 展示', desc: 'AI 生成运动鞋旋转展示 + 科技感特效，播放量 210 万', views: '210万', likes: '15万', coverGradient: COVER_GRADIENTS[3], detail: { author: 'SneakerLab', businessType: '运动鞋服', purpose: '新品发布推广', audience: '潮流运动人群', techHighlight: 'AI 3D 旋转 + 粒子特效', stats: { views: '210万', likes: '15万', comments: '2.1万', shares: '5.6万' }, tags: ['运动鞋', '3D展示', '科技感'] } },
  { id: 't5', title: '美妆变装挑战', desc: '素颜到精致妆容的变装视频，播放量 450 万', views: '450万', likes: '32万', coverGradient: COVER_GRADIENTS[4], detail: { author: '美妆达人小鹿', businessType: '美妆', purpose: '产品种草', audience: '18-30岁女性', techHighlight: 'AI 转场特效生成', stats: { views: '450万', likes: '32万', comments: '5.8万', shares: '12万' }, tags: ['变装', '美妆教程', '挑战'] } },
  { id: 't6', title: '零食开箱 ASMR', desc: '沉浸式零食开箱与试吃体验，播放量 95 万', views: '95万', likes: '7.1万', coverGradient: COVER_GRADIENTS[5], detail: { author: '吃货实验室', businessType: '食品', purpose: '产品体验推广', audience: '零食爱好者', techHighlight: 'AI 音频增强', stats: { views: '95万', likes: '7.1万', comments: '3800', shares: '9200' }, tags: ['ASMR', '零食', '开箱'] } },
  { id: 't7', title: '宠物日常 Vlog', desc: '萌宠搞笑日常合集，播放量 380 万', views: '380万', likes: '28万', coverGradient: COVER_GRADIENTS[6], detail: { author: '萌宠星球', businessType: '宠物', purpose: '账号涨粉', audience: '宠物爱好者', techHighlight: 'AI 精彩片段自动剪辑', stats: { views: '380万', likes: '28万', comments: '4.2万', shares: '9.5万' }, tags: ['宠物', 'Vlog', '搞笑'] } },
  { id: 't8', title: '家居好物分享', desc: '高颜值家居收纳神器展示，播放量 150 万', views: '150万', likes: '9.8万', coverGradient: COVER_GRADIENTS[7], detail: { author: '居家生活家', businessType: '家居', purpose: '好物种草', audience: '25-40岁家居爱好者', techHighlight: 'AI 场景化展示', stats: { views: '150万', likes: '9.8万', comments: '6700', shares: '2.1万' }, tags: ['家居', '收纳', '好物推荐'] } },
  { id: 't9', title: '健身教程 30 秒', desc: '快节奏居家健身动作教学，播放量 260 万', views: '260万', likes: '18万', coverGradient: COVER_GRADIENTS[8], detail: { author: '健身教练Amy', businessType: '健身', purpose: '教程引流', audience: '健身人群', techHighlight: 'AI 动作分解与节拍同步', stats: { views: '260万', likes: '18万', comments: '2.3万', shares: '6.8万' }, tags: ['健身', '教程', '居家'] } },
  { id: 't10', title: '美食制作过程', desc: '从食材到成品的高速剪辑，播放量 310 万', views: '310万', likes: '22万', coverGradient: COVER_GRADIENTS[9], detail: { author: '厨房实验室', businessType: '美食', purpose: '内容涨粉', audience: '美食爱好者', techHighlight: 'AI 高速剪辑与调色', stats: { views: '310万', likes: '22万', comments: '3.5万', shares: '7.2万' }, tags: ['美食', '制作过程', '高速剪辑'] } },
  { id: 't11', title: '旅行目的地推荐', desc: '航拍 + 转场的旅行短视频，播放量 180 万', views: '180万', likes: '12万', coverGradient: COVER_GRADIENTS[0], detail: { author: '旅行者联盟', businessType: '旅游', purpose: '目的地推广', audience: '旅行爱好者', techHighlight: 'AI 航拍稳定 + 智能转场', stats: { views: '180万', likes: '12万', comments: '1.8万', shares: '4.5万' }, tags: ['旅行', '航拍', '转场'] } },
  { id: 't12', title: '穿搭灵感合集', desc: '一周七套 OOTD 快速换装，播放量 220 万', views: '220万', likes: '16万', coverGradient: COVER_GRADIENTS[1], detail: { author: '时尚穿搭师', businessType: '服装', purpose: '穿搭种草', audience: '18-35岁时尚人群', techHighlight: 'AI 快速换装特效', stats: { views: '220万', likes: '16万', comments: '2.5万', shares: '5.8万' }, tags: ['穿搭', 'OOTD', '换装'] } },
  { id: 't13', title: '新能源车体验', desc: '智能座舱功能展示与驾驶体验，播放量 95 万', views: '95万', likes: '6.8万', coverGradient: COVER_GRADIENTS[2], detail: { author: '车评头条', businessType: '汽车', purpose: '新车推广', audience: '购车潜客', techHighlight: 'AI 车内场景增强', stats: { views: '95万', likes: '6.8万', comments: '4200', shares: '1.1万' }, tags: ['新能源', '汽车', '智能座舱'] } },
  { id: 't14', title: '手工 DIY 教程', desc: '创意手工制作全过程，播放量 130 万', views: '130万', likes: '9.2万', coverGradient: COVER_GRADIENTS[3], detail: { author: '手作时光', businessType: '手工', purpose: '教程分享', audience: 'DIY爱好者', techHighlight: 'AI 步骤分解', stats: { views: '130万', likes: '9.2万', comments: '5600', shares: '1.8万' }, tags: ['DIY', '手工', '教程'] } },
  { id: 't15', title: '数码产品开箱', desc: '最新科技产品首发开箱测评，播放量 170 万', views: '170万', likes: '11万', coverGradient: COVER_GRADIENTS[4], detail: { author: '科技前沿', businessType: '3C数码', purpose: '产品测评', audience: '科技爱好者', techHighlight: 'AI 产品特写增强', stats: { views: '170万', likes: '11万', comments: '1.5万', shares: '3.2万' }, tags: ['数码', '开箱', '测评'] } },
  { id: 't16', title: '母婴好物推荐', desc: '实用母婴产品真实测评，播放量 88 万', views: '88万', likes: '5.6万', coverGradient: COVER_GRADIENTS[5], detail: { author: '宝妈日记', businessType: '母婴', purpose: '好物种草', audience: '新手妈妈', techHighlight: 'AI 使用场景模拟', stats: { views: '88万', likes: '5.6万', comments: '3100', shares: '8500' }, tags: ['母婴', '好物', '测评'] } },
  { id: 't17', title: '潮玩盲盒拆箱', desc: '限定款潮玩开箱 + 收藏展示，播放量 240 万', views: '240万', likes: '17万', coverGradient: COVER_GRADIENTS[6], detail: { author: '潮玩收藏家', businessType: '潮玩', purpose: '开箱种草', audience: '潮玩收藏爱好者', techHighlight: 'AI 产品360°展示', stats: { views: '240万', likes: '17万', comments: '2.8万', shares: '6.1万' }, tags: ['潮玩', '盲盒', '收藏'] } },
  { id: 't18', title: '户外露营 Vlog', desc: '精致露营场景布置与体验分享，播放量 160 万', views: '160万', likes: '10万', coverGradient: COVER_GRADIENTS[7], detail: { author: '露营生活家', businessType: '户外', purpose: '场景种草', audience: '户外爱好者', techHighlight: 'AI 氛围感调色', stats: { views: '160万', likes: '10万', comments: '7200', shares: '2.5万' }, tags: ['露营', '户外', 'Vlog'] } },
  { id: 't19', title: '香水测评合集', desc: '多款热门香水对比与推荐，播放量 110 万', views: '110万', likes: '7.8万', coverGradient: COVER_GRADIENTS[8], detail: { author: '香气研究所', businessType: '香水', purpose: '产品对比', audience: '香水爱好者', techHighlight: 'AI 视觉化嗅觉表达', stats: { views: '110万', likes: '7.8万', comments: '4800', shares: '1.5万' }, tags: ['香水', '测评', '对比'] } },
  { id: 't20', title: '街头美食探店', desc: '各地特色街头美食打卡，播放量 290 万', views: '290万', likes: '20万', coverGradient: COVER_GRADIENTS[9], detail: { author: '街头吃货', businessType: '美食', purpose: '探店引流', audience: '美食爱好者', techHighlight: 'AI 美食特写增强', stats: { views: '290万', likes: '20万', comments: '3.2万', shares: '7.8万' }, tags: ['美食', '探店', '街头'] } },
  { id: 't21', title: '书桌布置灵感', desc: '学习/办公桌面改造与好物分享，播放量 75 万', views: '75万', likes: '4.8万', coverGradient: COVER_GRADIENTS[0], detail: { author: '桌面美学', businessType: '文具/家居', purpose: '好物种草', audience: '学生/上班族', techHighlight: 'AI 场景对比展示', stats: { views: '75万', likes: '4.8万', comments: '2800', shares: '7600' }, tags: ['桌面', '布置', '好物'] } },
  { id: 't22', title: '国风汉服展示', desc: '汉服穿搭 + 古风场景拍摄，播放量 340 万', views: '340万', likes: '25万', coverGradient: COVER_GRADIENTS[1], detail: { author: '汉服之美', businessType: '汉服', purpose: '文化传播', audience: '汉服爱好者', techHighlight: 'AI 古风场景生成', stats: { views: '340万', likes: '25万', comments: '3.8万', shares: '8.5万' }, tags: ['汉服', '国风', '古风'] } },
  { id: 't23', title: '智能家居体验', desc: '全屋智能联动场景展示，播放量 85 万', views: '85万', likes: '5.2万', coverGradient: COVER_GRADIENTS[2], detail: { author: '智能生活', businessType: '智能家居', purpose: '产品体验', audience: '科技家居爱好者', techHighlight: 'AI 智能联动可视化', stats: { views: '85万', likes: '5.2万', comments: '3500', shares: '9800' }, tags: ['智能家居', '全屋智能', '体验'] } },
  { id: 't24', title: '乐器演奏短片', desc: '钢琴/吉他热门曲目演奏，播放量 200 万', views: '200万', likes: '14万', coverGradient: COVER_GRADIENTS[3], detail: { author: '音乐工作室', businessType: '音乐', purpose: '才艺展示', audience: '音乐爱好者', techHighlight: 'AI 音画同步特效', stats: { views: '200万', likes: '14万', comments: '2.1万', shares: '5.2万' }, tags: ['乐器', '演奏', '音乐'] } },
  { id: 't25', title: '创意广告混剪', desc: '全球优秀创意广告精选混剪，播放量 145 万', views: '145万', likes: '9.5万', coverGradient: COVER_GRADIENTS[4], detail: { author: '广告灵感库', businessType: '广告', purpose: '创意参考', audience: '广告从业者', techHighlight: 'AI 智能混剪', stats: { views: '145万', likes: '9.5万', comments: '5200', shares: '1.8万' }, tags: ['广告', '创意', '混剪'] } },
  { id: 't26', title: '夜市美食合集', desc: '夜市小吃制作过程特写，播放量 270 万', views: '270万', likes: '19万', coverGradient: COVER_GRADIENTS[5], detail: { author: '夜市美食家', businessType: '美食', purpose: '内容涨粉', audience: '美食爱好者', techHighlight: 'AI 美食特写 + 烟火气增强', stats: { views: '270万', likes: '19万', comments: '2.8万', shares: '6.5万' }, tags: ['夜市', '小吃', '美食'] } },
  { id: 't27', title: '职场穿搭指南', desc: '通勤风 OOTD 搭配建议，播放量 92 万', views: '92万', likes: '6.1万', coverGradient: COVER_GRADIENTS[6], detail: { author: '职场穿搭', businessType: '服装', purpose: '穿搭种草', audience: '职场白领', techHighlight: 'AI 场景搭配建议', stats: { views: '92万', likes: '6.1万', comments: '3400', shares: '8900' }, tags: ['职场', '穿搭', '通勤'] } },
  { id: 't28', title: '甜品制作教程', desc: '高颜值甜品从零制作过程，播放量 185 万', views: '185万', likes: '13万', coverGradient: COVER_GRADIENTS[7], detail: { author: '甜品工坊', businessType: '烘焙', purpose: '教程分享', audience: '烘焙爱好者', techHighlight: 'AI 制作步骤优化', stats: { views: '185万', likes: '13万', comments: '1.8万', shares: '4.2万' }, tags: ['甜品', '烘焙', '教程'] } },
  { id: 't29', title: '滑板技巧展示', desc: '街头滑板花式动作合集，播放量 320 万', views: '320万', likes: '23万', coverGradient: COVER_GRADIENTS[8], detail: { author: '滑板少年', businessType: '运动', purpose: '才艺展示', audience: '滑板爱好者', techHighlight: 'AI 慢动作 + 动作分解', stats: { views: '320万', likes: '23万', comments: '3.5万', shares: '8.2万' }, tags: ['滑板', '技巧', '街头'] } },
  { id: 't30', title: '品牌联名开箱', desc: '热门品牌联名款产品首发开箱，播放量 155 万', views: '155万', likes: '10万', coverGradient: COVER_GRADIENTS[9], detail: { author: '联名速报', businessType: '潮流', purpose: '新品开箱', audience: '潮流消费者', techHighlight: 'AI 产品细节增强', stats: { views: '155万', likes: '10万', comments: '6800', shares: '2.2万' }, tags: ['联名', '开箱', '潮流'] } },
];

TRENDING_VIDEOS = BASE_TRENDING_VIDEOS.map((video) => ({
  ...video,
  videoUrl: video.videoUrl || TEMP_TRENDING_VIDEO_URL,
}));
