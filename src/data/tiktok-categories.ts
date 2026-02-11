// Complete TikTok category tree structure
// Format: { [level1]: { [level2]: string[] } }

export interface CategoryTree {
  [level1: string]: {
    [level2: string]: string[];
  };
}

export const categoryTreeZh: CategoryTree = {
  '玩具和爱好': {
    '娃娃与毛绒玩具': ['娃娃配件', '毛绒玩具', '娃娃', '娃娃屋'],
    '益智玩具': ['二手', '收藏品', '侦探与间谍玩具', '益智卡片', '手工艺玩具', '数学玩具', '科技玩具', '几何玩具'],
    '运动与户外玩具': ['自然探索玩具', '弹珠游戏', '泡泡玩具', '玩具刀和剑', '骑乘类玩具', '游乐园设备玩具'],
    '电动与遥控玩具': ['舞蹈毯', '卡拉OK机', '对讲机', '电子宠物', '相机玩具', '遥控及电动飞机'],
    '棋盘娱乐': ['地板游戏', '堆叠游戏', '魔方', '拼图', '掷骰游戏', '棋盘游戏'],
    '传统与创新玩具': ['车辆模型', '木偶玩具及配件', '指尖玩具', '过家家玩具', '创意与整蛊玩具', '模型玩具'],
  },
  '家具': {
    '室内家具': ['沙发', '架子与置物架', '屏风', '化妆台', '衣帽架', '桌子'],
    '室外家具': ['户外沙发', '户外椅子', '遮阳伞', '户外秋千', '户外家具套装', '户外桌子'],
    '儿童家具': ['儿童床', '儿童沙发', '儿童椅子', '儿童凳', '儿童柜', '儿童家具套装'],
    '商用家具': ['沙龙家具', '酒店家具', '学校家具', '饭店家具', '办公家具'],
  },
  '五金工具': {
    '电动工具': ['小众电动工具', '电钻', '电动螺丝刀', '电锯', '鼓风机', '角磨机'],
    '手动工具': ['手动铆机', '多功能手动工具与配件', '切割手动工具', '砌体和瓷砖工具', '小众手动工具', '工业锤子'],
    '测量工具': ['光学仪器', '压力测量仪器', '温度测量仪器', '手动测量工具', '物理测量仪器', '电流测量仪器'],
    '园林工具': ['小众园林工具', '金属探测器', '链锯', '铲雪工具', '园林工具配件', '割草机'],
    '焊接工具': ['电烙铁', '焊台', '焊机', '焊接配件'],
    '工具收纳': ['工具包', '工具盒', '工具收纳架'],
  },
  '家装建材': {
    '太阳能与风能设备': ['电源逆变器', '太阳能板', '充电控制器和配件', '太阳能发电系统', '风力发电机'],
    '灯具和照明设备': ['照明配件', '灯泡、灯管、灯带', '室内照明', '便携照明', '户外照明', '新奇照明'],
    '电气设备及用品': ['连接器和终端', '开关及配件', '继电器、断路器', '电源供给', '发动机、发电机及配件', '电器插座及配件'],
    '厨房设备': ['厨房水龙头', '厨房水池', '厨房橱柜', '厨房滤水设备', '厨房设施配件', '厨房设施套装'],
    '家庭智能系统': ['智能家居控制', '智能温控系统', '自动窗帘控制系统', '智能人体传感器'],
    '建筑用品': ['墙纸工具', '墙面漆', '加热、冷却和通风口', '门、门和窗户', '墙纸与墙饰', '油漆工具'],
  },
  '汽车与摩托车': {
    '汽车零部件': ['车身、框架和保险杠', '雨刷和垫圈', '排气和排放装置', '车轮、轮辋和配件', '轮胎及配件', '减震、支柱和悬挂'],
    '摩托车零部件': ['火花塞', '排气和排放', '车灯', '传动系统、变速器和离合器', '减震、支柱和悬挂', '轮胎及配件'],
    '摩托车': ['手动挡摩托车', '自动挡摩托车', '电动摩托车'],
    '汽车电子产品': ['行车记录仪', 'FM 和蓝牙发射器', 'USB 充电器', '汽车智能系统', '汽车视频监控', '报警系统与安全'],
    '外部配件': ['遮阳篷', '天线顶部', '挡泥板和防溅板', '喇叭及配件', '镀铬饰条及配件', '机架'],
    '内部配件': ['饰品', '车载收纳', '车载支架', '防滑垫', '汽车防尘垫', '汽车香薰'],
  },
  '时尚配件': {
    '假发': ['真人发T型分缝头套', '真人发全蕾丝头套', '真人发360蕾丝头套', '真人发前蕾丝头套', '真人发发块头套', '真人发定制头套'],
    '服装布料': ['巴迪', '蕾丝', '棉布', '羊毛', '天鹅绒、丝绸&缎面', '皮革'],
    '婚礼配件': ['传统男士婚礼配件', '新郎腰带', '嫁妆'],
    '服饰配件': ['领夹&胸针', '服饰配件套装', '围巾&围脖', '手套', '帽子', '皮带'],
    '眼镜': ['镜框与镜片', '太阳镜', '眼镜盒与配件'],
    '手表与配件': ['男表', '女表', '情侣表', '手表配件', '中性表'],
  },
  '家居用品': {
    '家居收纳': ['收纳盒', '收纳篮', '衣架和衣夹', '收纳包', '收纳架', '收纳瓶罐'],
    '浴室用品': ['马桶刷和马桶塞', '坐便垫', '皂液容器和洗手液盒', '漱口杯', '牙刷架', '浴帘与浴帘杆'],
    '装饰': ['小摆件与雕像', '钟表', '家居装饰贴', '相框', '装饰钩、架', '装饰假花、干花、假植物、假水果'],
    '家庭护理用品': ['除尘掸 / 掸头', '清洁手套', '垃圾袋', '垃圾桶', '清洁抹布', '扫把'],
    '洗衣工具': ['护洗袋', '晾衣绳', '熨衣板', '晾衣架', '洗衣球', '洗衣板'],
    '节庆及派对用品': ['节日装饰', '气球', '五彩纸屑和彩带', '背景、横幅', '一次性餐具', '聚会帽子、面具与道具'],
  },
  '厨房用品': {
    '咖啡用具与茶用具': ['咖啡壶', '咖啡用具套装', '奶壶', '不带电咖啡制作工具', '咖啡过滤器', '手动咖啡研磨机'],
    '刀具': ['厨房刀', '切菜板', '磨刀器', '厨房刀架与刀具收纳', '厨房剪刀', '厨房刀具及配件的套装'],
    '烧烤用具': ['烧烤炉', '烧烤工具'],
    '酒具': ['调酒工具', '酒架', '酒具套装', '醒酒工具'],
    '烘培用具': ['烘培模具', '烘培工具与配件', '烘培用具套装', '隔热手套', '烘培盘', '裱花、装饰工具'],
    '烹饪工具': ['汤锅', '炊具套装', '平底锅、炒锅', '蒸锅', '压力锅', '一次性炊具'],
  },
  '家纺布艺': {
    '床上用品': ['毯子', '床单与枕套', '夏凉被', '枕头和背垫', '床上配件', '床品套件'],
    '居家布艺': ['椅套', '桌布、桌旗', '地毯', '坐垫、抱枕与抱枕套', '沙发套', '窗帘'],
    '布料与手工工具': ['缝纫材料套装', '缝纫工具套装', '家纺布料', '缝纫配件 / 辅料 / 配饰', '缝纫机', '线'],
  },
  '家电': {
    '厨房家电': ['烤面包机', '压力锅、电饭锅', '电蒸锅', '封口机', '微波炉', '烤箱'],
    '生活家电': ['空气净化器', '加湿器', '电暖风', '电熨斗', '吸尘器及扫地机器人', '电风扇'],
    '大家电': ['电视', '空调', '热水器', '洗衣机 & 干衣机', '冰箱', '抽油烟机'],
    '商用电器': ['商用洗衣设备', '清洗 / 清理设备', '商用炉灶', '风机 / 排风设备', '制冷设备', '食品加工设备'],
  },
  '女装与女士内衣': {
    '女士上装': ['T恤', '衬衫', '针织衫', '卫衣', '外套', '马甲'],
    '女士下装': ['牛仔裤', '休闲裤', '半身裙', '打底裤', '短裤', '阔腿裤'],
    '女士连衣裙': ['日常连衣裙', '晚礼服', '派对连衣裙', '商务连衣裙'],
    '女士特殊服饰': ['泳装', '运动服', '睡衣', '家居服'],
    '女士套装与连体衣': ['两件套', '三件套', '连体裤', '连体裙'],
    '女士内衣': ['文胸', '内裤', '塑身衣', '睡眠内衣', '内衣套装'],
  },
  '穆斯林时尚': {
    '面纱': ['头巾', '面纱'],
    '女士穆斯林服饰': ['长袍', '连衣裙', '外套'],
    '男士穆斯林服装': ['长袍', '上衣', '裤装'],
    '外套': ['披风', '风衣'],
    '儿童穆斯林服装': ['男童穆斯林服装', '女童穆斯林服装'],
    '穆斯林配饰': ['帽子', '围巾', '配饰'],
  },
  '鞋靴': {
    '女鞋': ['高跟鞋', '平底鞋', '凉鞋', '靴子', '运动鞋', '拖鞋'],
    '男鞋': ['皮鞋', '休闲鞋', '运动鞋', '靴子', '凉鞋', '拖鞋'],
    '鞋靴配件': ['鞋垫', '鞋带', '鞋刷', '鞋撑', '防滑贴', '护理用品'],
  },
  '美妆个护': {
    '美妆': ['彩妆套装', '粉底', '口红', '眼妆', '腮红', '定妆产品'],
    '美容护肤': ['面部护理', '面膜', '防晒', '精华', '面霜', '护肤套装'],
    '头部护理与造型': ['洗发水', '护发素', '发膜', '造型产品', '染发产品', '头皮护理'],
    '手足护理': ['护手霜', '手膜', '指甲护理', '足部护理', '去角质产品', '护理工具'],
    '洗浴与身体护理': ['沐浴露', '身体乳', '香皂', '身体清洁工具', '身体护理套装', '去角质'],
    '男士护理': ['男士洁面', '剃须用品', '男士护肤', '香水', '男士护理套装'],
  },
  '手机与数码': {
    '手机配件': ['手机壳', '贴膜', '数据线', '充电器', '支架', '移动电源'],
    '摄影摄像': ['相机', '镜头', '三脚架', '摄像配件', '存储卡', '摄影灯'],
    '影音设备': ['耳机', '音箱', '麦克风', '录音设备', '播放设备'],
    '游戏设备': ['游戏机', '游戏手柄', '游戏配件'],
    '智能及穿戴设备': ['智能手表', '智能手环', '智能眼镜', '智能家居设备'],
    '电子教育设备': ['学习平板', '电子词典', '教育机器人'],
  },
  '电脑办公': {
    '电脑整机': ['台式机', '笔记本电脑', '一体机', '迷你电脑'],
    '电脑 & 笔记本电脑组件': ['主板', '显卡', '内存', '硬盘', '处理器', '电源'],
    '外设产品与配件': ['键盘', '鼠标', '显示器', '摄像头', '耳麦', '扩展坞'],
    '数据储存与软件': ['U盘', '移动硬盘', '存储卡', '软件授权'],
    '网络组件': ['路由器', '交换机', '网卡', '网线'],
    '办公设备': ['打印机', '扫描仪', '投影仪', '碎纸机'],
  },
  '宠物用品': {
    '猫狗食品': ['干粮', '湿粮', '零食', '营养补充品'],
    '猫狗家具': ['猫爬架', '宠物窝', '宠物床', '宠物围栏'],
    '猫狗服饰': ['宠物衣服', '宠物鞋', '宠物饰品'],
    '猫狗如厕用品': ['猫砂', '猫砂盆', '尿垫'],
    '猫狗清洁美容': ['洗护用品', '美容工具', '清洁用品'],
    '猫狗健康护理': ['驱虫用品', '医疗护理用品', '健康监测用品'],
  },
  '母婴用品': {
    '婴儿服饰与鞋': ['婴儿上衣', '婴儿裤装', '婴儿连体衣', '婴儿鞋袜'],
    '婴儿外出用品': ['婴儿推车', '安全座椅', '背带'],
    '哺育用品': ['奶瓶', '吸奶器', '消毒用品', '辅食工具'],
    '婴儿家具': ['婴儿床', '婴儿餐椅', '婴儿柜'],
    '婴儿安全防护用品': ['防撞条', '安全门', '监护设备'],
    '婴儿玩具': ['早教玩具', '安抚玩具', '益智玩具'],
  },
  '运动与户外': {
    '运动服饰': ['运动上衣', '运动裤', '运动套装', '压缩服', '户外服饰'],
    '运动鞋': ['跑步鞋', '篮球鞋', '足球鞋', '户外登山鞋'],
    '运动与户外配件': ['运动背包', '护具', '运动手套', '运动帽'],
    '球类运动设备': ['篮球', '足球', '排球', '网球'],
    '水上运动设备': ['泳装', '泳镜', '浮潜设备', '冲浪设备'],
    '冬季运动设备': ['滑雪装备', '滑冰装备', '保暖装备'],
  },
  '箱包': {
    '女包': ['单肩包', '手提包', '斜挎包', '双肩包'],
    '男包': ['公文包', '背包', '腰包'],
    '旅行箱包': ['拉杆箱', '行李包', '旅行收纳袋'],
    '功能箱包': ['电脑包', '相机包', '户外功能包'],
    '箱包配件': ['箱包挂件', '箱包收纳'],
  },
  '食品饮料': {
    '奶与乳制品': ['牛奶', '酸奶', '奶粉'],
    '酒': ['啤酒', '葡萄酒', '白酒'],
    '饮料': ['碳酸饮料', '果汁', '功能饮料'],
    '即食食品': ['速食', '零食', '罐头'],
    '主食与烹饪调味': ['米面粮油', '调味料'],
    '烘培用品': ['烘培原料', '烘培辅料'],
  },
  '保健': {
    '保健食品': ['维生素', '矿物质补充', '草本保健品'],
    '医疗保健': ['医疗器械', '健康监测设备'],
    '情趣用品': ['情趣器具', '成人用品'],
    '非处方药物与疗法': ['常用OTC', '外用药'],
    '另类医疗': ['理疗用品', '替代疗法产品'],
  },
  '图书&杂志&音频': {
    '人文社科': ['哲学', '历史', '社会学'],
    '杂志与报纸': ['时尚杂志', '新闻报纸'],
    '文学与艺术': ['小说', '艺术书籍'],
    '经济与管理': ['商业管理', '投资理财'],
    '儿童与婴幼儿图书': ['绘本', '早教读物'],
    '科技': ['科普读物', '技术书籍'],
  },
  '儿童时尚': {
    '男童服饰': ['男童上装', '男童下装'],
    '女童服饰': ['女童上装', '女童下装'],
    '男童鞋': ['男童运动鞋', '男童凉鞋'],
    '女童鞋': ['女童运动鞋', '女童凉鞋'],
    '儿童时尚配件': ['儿童帽子', '儿童包袋'],
  },
  '男装与男士内衣': {
    '男士上装': ['男士马甲', '男士衬衫', '男士夹克与风衣', '男士卫衣', '男士毛衣与针织衫', '男士T恤'],
    '男士下装': ['男士短裤', '男士牛仔裤', '男士裤子'],
    '男士特殊服饰': ['男士变装服饰', '男士工作服', '男士传统服饰'],
    '男士内衣': ['男士内裤', '男士内穿背心', '男士保暖内衣', '男士袜子'],
    '男士睡衣和家居服': ['连体睡衣', '睡衣', '睡袍、浴袍', '睡裙'],
    '男士套装与连体衣': ['男士套装', '男士西服套装', '男士连体衣'],
  },
  '虚拟商品': {
    '软件与数字内容': ['软件授权', '数字工具', '模板资源', '插件', '在线服务'],
    '游戏与娱乐虚拟物品': ['游戏点卡', '游戏道具', '会员订阅'],
    '数字权益': ['兑换码', '激活码', '数字礼品卡'],
  },
  '二手': {
    '二手数码': ['二手手机', '二手电脑', '二手相机', '二手配件'],
    '二手家电': ['二手电视', '二手冰箱', '二手洗衣机'],
    '二手家具': ['二手沙发', '二手桌椅', '二手床'],
    '二手服饰与配件': ['二手服装', '二手鞋靴', '二手箱包'],
  },
  '收藏品': {
    '艺术收藏': ['绘画', '雕塑', '版画'],
    '钱币与邮票': ['纪念币', '古钱币', '邮票'],
    '模型与手办': ['模型', '手办', '限量版收藏'],
    '纪念品': ['体育纪念品', '影视纪念品'],
  },
  '珠宝与衍生品': {
    '珠宝首饰': ['戒指', '项链', '手链', '耳饰'],
    '贵金属制品': ['黄金制品', '白银制品', '铂金制品'],
    '宝石与半宝石': ['钻石', '彩色宝石', '半宝石'],
    '珠宝衍生品': ['首饰盒', '清洁与护理用品'],
  },
  '票务与代金券': {
    '演出与赛事票务': ['演唱会门票', '体育赛事门票', '演出门票'],
    '交通与出行票务': ['机票', '火车票', '景区门票'],
    '生活服务券': ['餐饮代金券', '娱乐代金券', '服务体验券'],
  },
};

// English translations for categories
export const categoryTreeEn: CategoryTree = {
  'Toys & Hobbies': {
    'Dolls & Plush Toys': ['Doll Accessories', 'Plush Toys', 'Dolls', 'Dollhouses'],
    'Educational Toys': ['Secondhand', 'Collectibles', 'Detective & Spy Toys', 'Educational Cards', 'Craft Toys', 'Math Toys', 'Tech Toys', 'Geometry Toys'],
    'Sports & Outdoor Toys': ['Nature Exploration Toys', 'Marble Games', 'Bubble Toys', 'Toy Swords & Knives', 'Ride-On Toys', 'Playground Equipment Toys'],
    'Electronic & RC Toys': ['Dance Mats', 'Karaoke Machines', 'Walkie Talkies', 'Electronic Pets', 'Toy Cameras', 'RC & Electric Aircraft'],
    'Board Games': ['Floor Games', 'Stacking Games', 'Rubik\'s Cubes', 'Puzzles', 'Dice Games', 'Board Games'],
    'Traditional & Novelty Toys': ['Vehicle Models', 'Puppets & Accessories', 'Fidget Toys', 'Pretend Play Toys', 'Creative & Prank Toys', 'Model Toys'],
  },
  'Furniture': {
    'Indoor Furniture': ['Sofas', 'Shelves & Racks', 'Room Dividers', 'Vanities', 'Coat Racks', 'Tables'],
    'Outdoor Furniture': ['Outdoor Sofas', 'Outdoor Chairs', 'Umbrellas', 'Outdoor Swings', 'Outdoor Furniture Sets', 'Outdoor Tables'],
    'Children\'s Furniture': ['Children\'s Beds', 'Children\'s Sofas', 'Children\'s Chairs', 'Children\'s Stools', 'Children\'s Cabinets', 'Children\'s Furniture Sets'],
    'Commercial Furniture': ['Salon Furniture', 'Hotel Furniture', 'School Furniture', 'Restaurant Furniture', 'Office Furniture'],
  },
  'Hardware & Tools': {
    'Power Tools': ['Niche Power Tools', 'Electric Drills', 'Electric Screwdrivers', 'Electric Saws', 'Blowers', 'Angle Grinders'],
    'Hand Tools': ['Manual Riveters', 'Multi-Function Hand Tools', 'Cutting Hand Tools', 'Masonry & Tile Tools', 'Niche Hand Tools', 'Industrial Hammers'],
    'Measuring Tools': ['Optical Instruments', 'Pressure Gauges', 'Temperature Gauges', 'Manual Measuring Tools', 'Physical Measuring Instruments', 'Current Meters'],
    'Garden Tools': ['Niche Garden Tools', 'Metal Detectors', 'Chainsaws', 'Snow Removal Tools', 'Garden Tool Accessories', 'Lawn Mowers'],
    'Welding Tools': ['Soldering Irons', 'Soldering Stations', 'Welding Machines', 'Welding Accessories'],
    'Tool Storage': ['Tool Bags', 'Tool Boxes', 'Tool Storage Racks'],
  },
  'Home Improvement': {
    'Solar & Wind Equipment': ['Power Inverters', 'Solar Panels', 'Charge Controllers', 'Solar Power Systems', 'Wind Turbines'],
    'Lighting': ['Lighting Accessories', 'Bulbs & LED Strips', 'Indoor Lighting', 'Portable Lighting', 'Outdoor Lighting', 'Novelty Lighting'],
    'Electrical Equipment': ['Connectors & Terminals', 'Switches & Accessories', 'Relays & Breakers', 'Power Supplies', 'Motors & Generators', 'Outlets & Accessories'],
    'Kitchen Equipment': ['Kitchen Faucets', 'Kitchen Sinks', 'Kitchen Cabinets', 'Water Filtration', 'Kitchen Accessories', 'Kitchen Sets'],
    'Smart Home Systems': ['Smart Home Control', 'Smart Thermostats', 'Automated Curtains', 'Smart Motion Sensors'],
    'Building Materials': ['Wallpaper Tools', 'Wall Paint', 'HVAC Vents', 'Doors & Windows', 'Wallpaper & Wall Decor', 'Paint Tools'],
  },
  'Automotive & Motorcycle': {
    'Auto Parts': ['Body & Bumpers', 'Wipers & Washers', 'Exhaust Systems', 'Wheels & Rims', 'Tires & Accessories', 'Shocks & Suspension'],
    'Motorcycle Parts': ['Spark Plugs', 'Exhaust Systems', 'Lights', 'Drivetrain & Clutch', 'Shocks & Suspension', 'Tires & Accessories'],
    'Motorcycles': ['Manual Motorcycles', 'Automatic Motorcycles', 'Electric Motorcycles'],
    'Car Electronics': ['Dash Cams', 'FM & Bluetooth Transmitters', 'USB Chargers', 'Car Smart Systems', 'Video Monitoring', 'Alarms & Security'],
    'Exterior Accessories': ['Awnings', 'Antenna Toppers', 'Mudguards', 'Horns & Accessories', 'Chrome Trims', 'Racks'],
    'Interior Accessories': ['Ornaments', 'Car Storage', 'Car Mounts', 'Anti-Slip Mats', 'Car Floor Mats', 'Car Fragrances'],
  },
  'Fashion Accessories': {
    'Wigs': ['T-Part Wigs', 'Full Lace Wigs', '360 Lace Wigs', 'Front Lace Wigs', 'Wig Toppers', 'Custom Wigs'],
    'Fabrics': ['Batik', 'Lace', 'Cotton', 'Wool', 'Velvet & Silk', 'Leather'],
    'Wedding Accessories': ['Traditional Wedding Accessories', 'Groom Belts', 'Dowry'],
    'Clothing Accessories': ['Tie Clips & Brooches', 'Accessory Sets', 'Scarves', 'Gloves', 'Hats', 'Belts'],
    'Eyewear': ['Frames & Lenses', 'Sunglasses', 'Eyewear Cases'],
    'Watches & Accessories': ['Men\'s Watches', 'Women\'s Watches', 'Couple Watches', 'Watch Accessories', 'Unisex Watches'],
  },
  'Home & Living': {
    'Home Storage': ['Storage Boxes', 'Storage Baskets', 'Hangers & Clips', 'Storage Bags', 'Storage Racks', 'Storage Jars'],
    'Bathroom Supplies': ['Toilet Brushes', 'Toilet Seat Covers', 'Soap Dispensers', 'Rinse Cups', 'Toothbrush Holders', 'Shower Curtains'],
    'Decor': ['Figurines & Statues', 'Clocks', 'Wall Stickers', 'Photo Frames', 'Decorative Hooks', 'Artificial Plants & Flowers'],
    'Household Cleaning': ['Dusters', 'Cleaning Gloves', 'Garbage Bags', 'Trash Cans', 'Cleaning Cloths', 'Brooms'],
    'Laundry Tools': ['Laundry Bags', 'Clotheslines', 'Ironing Boards', 'Drying Racks', 'Laundry Balls', 'Washboards'],
    'Party Supplies': ['Holiday Decor', 'Balloons', 'Confetti & Streamers', 'Backdrops & Banners', 'Disposable Tableware', 'Party Hats & Masks'],
  },
  'Kitchen': {
    'Coffee & Tea': ['Coffee Pots', 'Coffee Sets', 'Milk Jugs', 'Manual Coffee Tools', 'Coffee Filters', 'Manual Coffee Grinders'],
    'Cutlery': ['Kitchen Knives', 'Cutting Boards', 'Knife Sharpeners', 'Knife Storage', 'Kitchen Scissors', 'Knife Sets'],
    'BBQ': ['BBQ Grills', 'BBQ Tools'],
    'Bar Accessories': ['Bartending Tools', 'Wine Racks', 'Bar Sets', 'Wine Aerators'],
    'Baking': ['Baking Molds', 'Baking Tools', 'Baking Sets', 'Oven Mitts', 'Baking Pans', 'Decorating Tools'],
    'Cookware': ['Stock Pots', 'Cookware Sets', 'Pans & Woks', 'Steamers', 'Pressure Cookers', 'Disposable Cookware'],
  },
  'Home Textiles': {
    'Bedding': ['Blankets', 'Sheets & Pillowcases', 'Summer Quilts', 'Pillows & Cushions', 'Bed Accessories', 'Bedding Sets'],
    'Home Fabrics': ['Chair Covers', 'Tablecloths', 'Rugs', 'Cushions & Pillow Covers', 'Sofa Covers', 'Curtains'],
    'Fabrics & Sewing': ['Sewing Material Sets', 'Sewing Tool Sets', 'Home Fabrics', 'Sewing Accessories', 'Sewing Machines', 'Thread'],
  },
  'Appliances': {
    'Kitchen Appliances': ['Toasters', 'Pressure Cookers & Rice Cookers', 'Electric Steamers', 'Sealers', 'Microwaves', 'Ovens'],
    'Home Appliances': ['Air Purifiers', 'Humidifiers', 'Space Heaters', 'Electric Irons', 'Vacuums & Robot Vacuums', 'Electric Fans'],
    'Major Appliances': ['TVs', 'Air Conditioners', 'Water Heaters', 'Washers & Dryers', 'Refrigerators', 'Range Hoods'],
    'Commercial Appliances': ['Commercial Laundry', 'Cleaning Equipment', 'Commercial Stoves', 'Ventilation', 'Refrigeration', 'Food Processing'],
  },
  'Women\'s Fashion': {
    'Women\'s Tops': ['T-Shirts', 'Blouses', 'Knitwear', 'Hoodies', 'Outerwear', 'Vests'],
    'Women\'s Bottoms': ['Jeans', 'Casual Pants', 'Skirts', 'Leggings', 'Shorts', 'Wide-Leg Pants'],
    'Women\'s Dresses': ['Casual Dresses', 'Evening Gowns', 'Party Dresses', 'Business Dresses'],
    'Women\'s Special Wear': ['Swimwear', 'Sportswear', 'Sleepwear', 'Loungewear'],
    'Women\'s Sets': ['Two-Piece Sets', 'Three-Piece Sets', 'Jumpsuits', 'Rompers'],
    'Women\'s Lingerie': ['Bras', 'Panties', 'Shapewear', 'Sleep Bras', 'Lingerie Sets'],
  },
  'Muslim Fashion': {
    'Veils': ['Hijabs', 'Niqabs'],
    'Women\'s Muslim Wear': ['Abayas', 'Dresses', 'Outerwear'],
    'Men\'s Muslim Wear': ['Thobes', 'Tops', 'Pants'],
    'Outerwear': ['Capes', 'Trench Coats'],
    'Children\'s Muslim Wear': ['Boys\' Muslim Wear', 'Girls\' Muslim Wear'],
    'Muslim Accessories': ['Caps', 'Scarves', 'Accessories'],
  },
  'Shoes': {
    'Women\'s Shoes': ['High Heels', 'Flats', 'Sandals', 'Boots', 'Sneakers', 'Slippers'],
    'Men\'s Shoes': ['Dress Shoes', 'Casual Shoes', 'Sneakers', 'Boots', 'Sandals', 'Slippers'],
    'Shoe Accessories': ['Insoles', 'Shoelaces', 'Shoe Brushes', 'Shoe Trees', 'Anti-Slip Pads', 'Shoe Care'],
  },
  'Beauty & Personal Care': {
    'Makeup': ['Makeup Sets', 'Foundation', 'Lipstick', 'Eye Makeup', 'Blush', 'Setting Products'],
    'Skincare': ['Facial Care', 'Face Masks', 'Sunscreen', 'Serums', 'Creams', 'Skincare Sets'],
    'Hair Care': ['Shampoo', 'Conditioner', 'Hair Masks', 'Styling Products', 'Hair Color', 'Scalp Care'],
    'Hand & Foot Care': ['Hand Cream', 'Hand Masks', 'Nail Care', 'Foot Care', 'Exfoliants', 'Care Tools'],
    'Bath & Body': ['Body Wash', 'Body Lotion', 'Bar Soap', 'Body Cleansing Tools', 'Body Care Sets', 'Body Scrubs'],
    'Men\'s Grooming': ['Men\'s Cleansers', 'Shaving', 'Men\'s Skincare', 'Cologne', 'Men\'s Care Sets'],
  },
  'Phones & Electronics': {
    'Phone Accessories': ['Phone Cases', 'Screen Protectors', 'Cables', 'Chargers', 'Stands', 'Power Banks'],
    'Photography': ['Cameras', 'Lenses', 'Tripods', 'Camera Accessories', 'Memory Cards', 'Studio Lights'],
    'Audio & Video': ['Headphones', 'Speakers', 'Microphones', 'Recording Equipment', 'Players'],
    'Gaming': ['Consoles', 'Controllers', 'Gaming Accessories'],
    'Wearables': ['Smart Watches', 'Smart Bands', 'Smart Glasses', 'Smart Home Devices'],
    'Educational Electronics': ['Learning Tablets', 'Electronic Dictionaries', 'Educational Robots'],
  },
  'Computers & Office': {
    'Computers': ['Desktops', 'Laptops', 'All-in-Ones', 'Mini PCs'],
    'Computer Components': ['Motherboards', 'Graphics Cards', 'RAM', 'Hard Drives', 'Processors', 'Power Supplies'],
    'Peripherals': ['Keyboards', 'Mice', 'Monitors', 'Webcams', 'Headsets', 'Docking Stations'],
    'Storage & Software': ['USB Drives', 'External Drives', 'Memory Cards', 'Software Licenses'],
    'Networking': ['Routers', 'Switches', 'Network Cards', 'Network Cables'],
    'Office Equipment': ['Printers', 'Scanners', 'Projectors', 'Shredders'],
  },
  'Pet Supplies': {
    'Pet Food': ['Dry Food', 'Wet Food', 'Treats', 'Supplements'],
    'Pet Furniture': ['Cat Trees', 'Pet Beds', 'Pet Mats', 'Pet Gates'],
    'Pet Clothing': ['Pet Clothes', 'Pet Shoes', 'Pet Accessories'],
    'Pet Toiletries': ['Cat Litter', 'Litter Boxes', 'Pee Pads'],
    'Pet Grooming': ['Shampoos', 'Grooming Tools', 'Cleaning Supplies'],
    'Pet Health': ['Flea & Tick', 'Medical Supplies', 'Health Monitors'],
  },
  'Baby & Kids': {
    'Baby Clothing': ['Baby Tops', 'Baby Pants', 'Baby Rompers', 'Baby Shoes & Socks'],
    'Baby Gear': ['Strollers', 'Car Seats', 'Baby Carriers'],
    'Feeding': ['Bottles', 'Breast Pumps', 'Sterilizers', 'Baby Food Tools'],
    'Baby Furniture': ['Cribs', 'High Chairs', 'Baby Cabinets'],
    'Baby Safety': ['Corner Guards', 'Safety Gates', 'Baby Monitors'],
    'Baby Toys': ['Early Learning Toys', 'Comfort Toys', 'Educational Toys'],
  },
  'Sports & Outdoors': {
    'Sportswear': ['Sports Tops', 'Sports Pants', 'Sports Sets', 'Compression Wear', 'Outdoor Wear'],
    'Athletic Shoes': ['Running Shoes', 'Basketball Shoes', 'Soccer Cleats', 'Hiking Shoes'],
    'Sports Accessories': ['Sports Bags', 'Protective Gear', 'Sports Gloves', 'Sports Caps'],
    'Ball Sports': ['Basketballs', 'Soccer Balls', 'Volleyballs', 'Tennis Balls'],
    'Water Sports': ['Swimwear', 'Goggles', 'Snorkeling Gear', 'Surfing Gear'],
    'Winter Sports': ['Ski Gear', 'Skating Gear', 'Thermal Gear'],
  },
  'Bags & Luggage': {
    'Women\'s Bags': ['Shoulder Bags', 'Handbags', 'Crossbody Bags', 'Backpacks'],
    'Men\'s Bags': ['Briefcases', 'Backpacks', 'Waist Bags'],
    'Travel Bags': ['Suitcases', 'Duffel Bags', 'Travel Organizers'],
    'Functional Bags': ['Laptop Bags', 'Camera Bags', 'Outdoor Bags'],
    'Bag Accessories': ['Bag Charms', 'Bag Organizers'],
  },
  'Food & Beverages': {
    'Dairy': ['Milk', 'Yogurt', 'Milk Powder'],
    'Alcohol': ['Beer', 'Wine', 'Spirits'],
    'Beverages': ['Soda', 'Juice', 'Energy Drinks'],
    'Ready-to-Eat': ['Instant Food', 'Snacks', 'Canned Food'],
    'Staples & Seasonings': ['Grains & Oils', 'Seasonings'],
    'Baking Supplies': ['Baking Ingredients', 'Baking Additives'],
  },
  'Health': {
    'Health Supplements': ['Vitamins', 'Minerals', 'Herbal Supplements'],
    'Medical Health': ['Medical Devices', 'Health Monitors'],
    'Adult Products': ['Adult Toys', 'Adult Supplies'],
    'OTC & Remedies': ['Common OTC', 'Topical Medications'],
    'Alternative Medicine': ['Therapy Products', 'Alternative Treatments'],
  },
  'Books & Media': {
    'Humanities': ['Philosophy', 'History', 'Sociology'],
    'Magazines & News': ['Fashion Magazines', 'Newspapers'],
    'Literature & Arts': ['Novels', 'Art Books'],
    'Business': ['Business Management', 'Investing'],
    'Children\'s Books': ['Picture Books', 'Early Learning'],
    'Science & Technology': ['Popular Science', 'Tech Books'],
  },
  'Kids\' Fashion': {
    'Boys\' Clothing': ['Boys\' Tops', 'Boys\' Bottoms'],
    'Girls\' Clothing': ['Girls\' Tops', 'Girls\' Bottoms'],
    'Boys\' Shoes': ['Boys\' Sneakers', 'Boys\' Sandals'],
    'Girls\' Shoes': ['Girls\' Sneakers', 'Girls\' Sandals'],
    'Kids\' Accessories': ['Kids\' Hats', 'Kids\' Bags'],
  },
  'Men\'s Fashion': {
    'Men\'s Tops': ['Men\'s Vests', 'Men\'s Shirts', 'Men\'s Jackets', 'Men\'s Hoodies', 'Men\'s Sweaters', 'Men\'s T-Shirts'],
    'Men\'s Bottoms': ['Men\'s Shorts', 'Men\'s Jeans', 'Men\'s Pants'],
    'Men\'s Special Wear': ['Costumes', 'Workwear', 'Traditional Wear'],
    'Men\'s Underwear': ['Men\'s Briefs', 'Undershirts', 'Thermal Underwear', 'Men\'s Socks'],
    'Men\'s Sleepwear': ['Onesies', 'Pajamas', 'Robes', 'Nightgowns'],
    'Men\'s Sets': ['Casual Sets', 'Suit Sets', 'Jumpsuits'],
  },
  'Virtual Goods': {
    'Software & Digital Content': ['Software Licenses', 'Digital Tools', 'Templates', 'Plugins', 'Online Services'],
    'Gaming & Entertainment': ['Game Cards', 'Game Items', 'Subscriptions'],
    'Digital Rights': ['Redemption Codes', 'Activation Codes', 'Digital Gift Cards'],
  },
  'Secondhand': {
    'Secondhand Electronics': ['Used Phones', 'Used Computers', 'Used Cameras', 'Used Accessories'],
    'Secondhand Appliances': ['Used TVs', 'Used Refrigerators', 'Used Washers'],
    'Secondhand Furniture': ['Used Sofas', 'Used Tables & Chairs', 'Used Beds'],
    'Secondhand Fashion': ['Used Clothing', 'Used Shoes', 'Used Bags'],
  },
  'Collectibles': {
    'Art': ['Paintings', 'Sculptures', 'Prints'],
    'Coins & Stamps': ['Commemorative Coins', 'Ancient Coins', 'Stamps'],
    'Models & Figures': ['Models', 'Figures', 'Limited Editions'],
    'Memorabilia': ['Sports Memorabilia', 'Movie Memorabilia'],
  },
  'Jewelry': {
    'Jewelry': ['Rings', 'Necklaces', 'Bracelets', 'Earrings'],
    'Precious Metals': ['Gold Items', 'Silver Items', 'Platinum Items'],
    'Gemstones': ['Diamonds', 'Colored Gems', 'Semi-Precious Stones'],
    'Jewelry Accessories': ['Jewelry Boxes', 'Cleaning & Care'],
  },
  'Tickets & Vouchers': {
    'Event Tickets': ['Concert Tickets', 'Sports Tickets', 'Show Tickets'],
    'Travel Tickets': ['Flight Tickets', 'Train Tickets', 'Attraction Tickets'],
    'Service Vouchers': ['Dining Vouchers', 'Entertainment Vouchers', 'Experience Vouchers'],
  },
};

// Helper type for search results
export interface CategorySearchResult {
  level1: string;
  level2: string;
  level3: string;
  path: string;
}

// Function to search categories by keyword
export function searchCategories(
  tree: CategoryTree,
  keyword: string,
  limit: number = 20
): CategorySearchResult[] {
  if (!keyword.trim()) return [];
  
  const results: CategorySearchResult[] = [];
  const lowerKeyword = keyword.toLowerCase();
  
  for (const level1 of Object.keys(tree)) {
    for (const level2 of Object.keys(tree[level1])) {
      for (const level3 of tree[level1][level2]) {
        if (level3.toLowerCase().includes(lowerKeyword)) {
          results.push({
            level1,
            level2,
            level3,
            path: `${level1} / ${level2} / ${level3}`,
          });
          
          if (results.length >= limit) {
            return results;
          }
        }
      }
    }
  }
  
  return results;
}

// Get all level1 categories
export function getLevel1Options(tree: CategoryTree): string[] {
  return Object.keys(tree);
}

// Get level2 options for a given level1
export function getLevel2Options(tree: CategoryTree, level1: string): string[] {
  return level1 && tree[level1] ? Object.keys(tree[level1]) : [];
}

// Get level3 options for given level1 and level2
export function getLevel3Options(tree: CategoryTree, level1: string, level2: string): string[] {
  if (!level1 || !level2 || !tree[level1]) return [];
  return tree[level1][level2] || [];
}
