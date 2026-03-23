"use client";

import { useEffect } from "react";
import { useModule } from "@/contexts/ModuleContext";
import type { ModuleType } from "@/types/modules";

/** 进入模块路由时同步侧边栏 / 顶栏的当前模块状态 */
export function useActiveModuleOnMount(module: ModuleType) {
  const { setActiveModule } = useModule();
  useEffect(() => {
    setActiveModule(module);
  }, [module, setActiveModule]);
}
