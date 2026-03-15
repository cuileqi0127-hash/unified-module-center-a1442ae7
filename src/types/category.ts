/**
 * 通用品类树结构：一级 -> 二级 -> 三级列表
 * 下拉级联控件使用此类型，数据由外部传入。
 */
export interface CategoryTree {
  [level1: string]: {
    [level2: string]: string[];
  };
}
