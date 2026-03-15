import type { CategoryTree } from '@/types/category';

export interface CategoryNode {
  label: string;
  children?: CategoryNode[];
}

/** 将嵌套的 CategoryNode[] 转为统一级联控件使用的 CategoryTree（一级 > 二级 > 三级） */
export function categoryNodeTreeToCategoryTree(nodes: CategoryNode[]): CategoryTree {
  const tree: CategoryTree = {};
  for (const l1 of nodes) {
    tree[l1.label] = {};
    if (!l1.children?.length) continue;
    for (const l2 of l1.children) {
      if (l2.children && l2.children.length > 0) {
        tree[l1.label][l2.label] = l2.children.map((c) => c.label);
      } else {
        tree[l1.label][l2.label] = [l2.label];
      }
    }
  }
  return tree;
}

/** Skills 模块使用的品类树（嵌套结构），需转换为 CategoryTree 后传入级联控件 */
export const CATEGORY_TREE: CategoryNode[] = [
  {
    label: '穆斯林时尚',
    children: [
      { label: '穆斯林女装' },
      { label: '头巾与配饰' },
      { label: '穆斯林男装' },
    ],
  },
  {
    label: '鞋靴',
    children: [
      { label: '女鞋', children: [{ label: '高跟鞋' }, { label: '平底鞋' }, { label: '凉鞋' }, { label: '靴子' }] },
      { label: '男鞋', children: [{ label: '运动鞋' }, { label: '皮鞋' }, { label: '休闲鞋' }, { label: '凉鞋' }] },
      { label: '童鞋' },
    ],
  },
  {
    label: '美妆个护',
    children: [
      { label: '面部护肤', children: [{ label: '洁面' }, { label: '面霜' }, { label: '精华' }, { label: '面膜' }, { label: '防晒' }] },
      { label: '彩妆', children: [{ label: '口红' }, { label: '粉底' }, { label: '眼影' }, { label: '眉笔' }, { label: '腮红' }] },
      { label: '身体护理', children: [{ label: '沐浴露' }, { label: '身体乳' }, { label: '护手霜' }] },
      { label: '美发护发', children: [{ label: '洗发水' }, { label: '护发素' }, { label: '发膜' }, { label: '造型产品' }] },
      { label: '个人清洁' },
      { label: '美甲' },
    ],
  },
  {
    label: '手机与数码',
    children: [
      { label: '手机配件', children: [{ label: '手机壳' }, { label: '充电器' }, { label: '数据线' }, { label: '屏幕保护膜' }] },
      { label: '摄影摄像', children: [{ label: '相机' }, { label: '镜头' }, { label: '三脚架' }, { label: '存储卡' }] },
      { label: '影音设备', children: [{ label: '耳机' }, { label: '音箱' }, { label: '麦克风' }, { label: '录音设备' }] },
      { label: '游戏设备', children: [{ label: '游戏手柄' }, { label: '游戏耳机' }, { label: '游戏键盘' }] },
      { label: '智能及穿戴设备', children: [{ label: '智能手表' }, { label: '智能手环' }, { label: '智能眼镜' }] },
      { label: '电子教育设备' },
    ],
  },
  {
    label: '电脑办公',
    children: [
      { label: '笔记本电脑' },
      { label: '台式机' },
      { label: '显示器' },
      { label: '键盘鼠标', children: [{ label: '机械键盘' }, { label: '无线鼠标' }, { label: '键鼠套装' }] },
      { label: '办公用品' },
      { label: '打印设备' },
    ],
  },
  {
    label: '服饰鞋包',
    children: [
      { label: '女装', children: [{ label: '连衣裙' }, { label: 'T恤' }, { label: '外套' }, { label: '裤子' }, { label: '半身裙' }] },
      { label: '男装', children: [{ label: 'T恤' }, { label: '衬衫' }, { label: '夹克' }, { label: '裤子' }] },
      { label: '内衣', children: [{ label: '文胸' }, { label: '内裤' }, { label: '家居服' }, { label: '袜子' }] },
      { label: '箱包', children: [{ label: '双肩包' }, { label: '手提包' }, { label: '钱包' }, { label: '行李箱' }] },
      { label: '配饰', children: [{ label: '帽子' }, { label: '围巾' }, { label: '皮带' }, { label: '太阳镜' }] },
    ],
  },
  {
    label: '家居日用',
    children: [
      { label: '厨房用品', children: [{ label: '锅具' }, { label: '餐具' }, { label: '收纳' }, { label: '厨房小工具' }] },
      { label: '家纺', children: [{ label: '床上用品' }, { label: '毛巾浴巾' }, { label: '窗帘' }] },
      { label: '家居装饰' },
      { label: '清洁用品' },
      { label: '灯具照明' },
    ],
  },
  {
    label: '宠物用品',
    children: [
      { label: '狗狗用品', children: [{ label: '狗粮' }, { label: '玩具' }, { label: '牵引绳' }, { label: '狗窝' }] },
      { label: '猫咪用品', children: [{ label: '猫粮' }, { label: '猫砂' }, { label: '猫玩具' }, { label: '猫爬架' }] },
      { label: '小宠用品' },
    ],
  },
  {
    label: '母婴用品',
    children: [
      { label: '奶粉辅食' },
      { label: '纸尿裤' },
      { label: '童装', children: [{ label: '婴儿服' }, { label: '童装套装' }, { label: '童鞋' }] },
      { label: '玩具早教', children: [{ label: '积木' }, { label: '毛绒玩具' }, { label: '益智玩具' }] },
      { label: '婴儿出行' },
    ],
  },
  {
    label: '运动与户外',
    children: [
      { label: '运动服饰' },
      { label: '运动鞋' },
      { label: '健身器材', children: [{ label: '哑铃' }, { label: '瑜伽垫' }, { label: '跳绳' }, { label: '弹力带' }] },
      { label: '户外装备', children: [{ label: '帐篷' }, { label: '睡袋' }, { label: '登山杖' }, { label: '户外背包' }] },
      { label: '骑行装备' },
    ],
  },
  {
    label: '食品饮料',
    children: [
      { label: '零食', children: [{ label: '坚果' }, { label: '饼干' }, { label: '糖果' }, { label: '膨化食品' }] },
      { label: '茶饮咖啡' },
      { label: '方便食品' },
      { label: '保健食品' },
    ],
  },
  {
    label: '珠宝饰品',
    children: [
      { label: '项链' },
      { label: '耳饰' },
      { label: '手链手镯' },
      { label: '戒指' },
      { label: '发饰' },
    ],
  },
];
