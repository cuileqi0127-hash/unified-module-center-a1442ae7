# UI 组件库文档

## 1. 概述

项目 UI 组件位于 `src/components/ui/`，基于 **Radix UI** 与 **Tailwind CSS** 封装，保证无障碍与设计系统一致。业务模块组件位于 `src/components/modules/` 及 `src/components/layout/`。

---

## 2. 基础组件列表与 API

### 2.1 按钮 Button

**路径**: `src/components/ui/button.tsx`

| 属性 | 类型 | 说明 |
|------|------|------|
| `variant` | `'default' \| 'destructive' \| 'outline' \| 'secondary' \| 'ghost' \| 'link'` | 视觉变体，默认 `default` |
| `size` | `'default' \| 'sm' \| 'lg' \| 'icon'` | 尺寸 |
| `asChild` | `boolean` | 是否将子元素作为实际 DOM，用于与 Radix 等组合 |
| `className` | `string` | 额外类名 |
| 其他 | 继承 `ButtonHTMLAttributes` | 如 `disabled`、`onClick` 等 |

**示例**:

```tsx
import { Button } from '@/components/ui/button';

<Button>主要操作</Button>
<Button variant="ghost" size="sm">次要操作</Button>
<Button variant="outline" onClick={handleSave}>保存</Button>
```

---

### 2.2 表单类

| 组件 | 路径 | 说明与主要 API |
|------|------|----------------|
| **Input** | `ui/input.tsx` | 单行输入，支持 `className`、`type`、`placeholder` 等原生属性 |
| **Textarea** | `ui/textarea.tsx` | 多行输入，同上 |
| **Label** | `ui/label.tsx` | 与 Radix Label 一致，用于表单标签 |
| **Checkbox** | `ui/checkbox.tsx` | Radix Checkbox |
| **RadioGroup** | `ui/radio-group.tsx` | Radix RadioGroup |
| **Select** | `ui/select.tsx` | Select, SelectTrigger, SelectValue, SelectContent, SelectItem；支持 `collisionPadding` 防止溢出 |
| **Switch** | `ui/switch.tsx` | Radix Switch |
| **Form** | `ui/form.tsx` | react-hook-form + zod，提供 FormField, FormItem, FormLabel, FormControl, FormMessage |

**Select 示例**:

```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

<Select value={value} onValueChange={setValue}>
  <SelectTrigger>
    <SelectValue placeholder="请选择" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="a">选项 A</SelectItem>
    <SelectItem value="b">选项 B</SelectItem>
  </SelectContent>
</Select>
```

---

### 2.3 弹层与反馈

| 组件 | 路径 | 说明与主要 API |
|------|------|----------------|
| **Dialog** | `ui/dialog.tsx` | Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter；支持 i18n 关闭文案 |
| **Sheet** | `ui/sheet.tsx` | 侧边抽屉，SheetContent 等 |
| **Popover** | `ui/popover.tsx` | Popover, PopoverTrigger, PopoverContent；支持 `align`、`sideOffset`、`collisionPadding` |
| **DropdownMenu** | `ui/dropdown-menu.tsx` | DropdownMenu, Trigger, Content, Item, CheckboxItem, RadioItem, Sub, SubTrigger, SubContent 等 |
| **Tooltip** | `ui/tooltip.tsx` | TooltipProvider, Tooltip, TooltipTrigger, TooltipContent |
| **Toast** | `ui/sonner.tsx` / `ui/toast.tsx` | 使用 sonner 或 Radix Toast；业务中常用 `toast.success()` / `toast.error()` |
| **Alert** | `ui/alert.tsx` | 静态提示条 |
| **AlertDialog** | `ui/alert-dialog.tsx` | 确认弹窗 |

---

### 2.4 内联选择器 InlinePicker

**路径**: `src/components/ui/inline-picker.tsx`

与「策划方案」页「制定」「预算量级」「营销周期」下拉样式一致，弹层自适应位置不溢出视口。

| 属性 | 类型 | 说明 |
|------|------|------|
| `options` | `string[] \| InlinePickerOption[]` | 选项列表，`InlinePickerOption` 为 `{ value, label }` |
| `value` | `string` | 当前选中值 |
| `onChange` | `(v: string) => void` | 选中回调 |
| `placeholder` | `string` | 未选时占位文案 |
| `show` | `boolean` | 是否展开 |
| `setShow` | `(v: boolean) => void` | 控制展开 |
| `optionLabel?` | `(optionValue: string) => string` | 当 options 为 string[] 时的展示文案 |
| `className?` | `string` | 容器类名 |

**示例**:

```tsx
const [open, setOpen] = useState(false);
const [goal, setGoal] = useState('');

<InlinePicker
  options={['销量增长', '品牌升级', '新品发布']}
  value={goal}
  onChange={setGoal}
  placeholder="营销目标"
  show={open}
  setShow={setOpen}
/>
```

---

### 2.5 布局与展示

| 组件 | 路径 | 说明 |
|------|------|------|
| **Card** | `ui/card.tsx` | Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter |
| **ScrollArea** | `ui/scroll-area.tsx` | 滚动区域 |
| **Tabs** | `ui/tabs.tsx` | Tabs, TabsList, TabsTrigger, TabsContent |
| **Table** | `ui/table.tsx` | Table, TableHeader, TableBody, TableRow, TableHead, TableCell |
| **Avatar** | `ui/avatar.tsx` | AvatarImage, AvatarFallback |
| **Badge** | `ui/badge.tsx` | 标签 |
| **Skeleton** | `ui/skeleton.tsx` | 骨架屏 |
| **Progress** | `ui/progress.tsx` | 进度条 |
| **Separator** | `ui/separator.tsx` | 分隔线 |

---

### 2.6 业务相关组件

| 组件 | 路径 | 说明 |
|------|------|------|
| **LoadingSpinner** | `ui/loading-spinner.tsx` | 全局加载动画 |
| **MemoryButtonWithDialog** | `modules/memory/MemoryButtonWithDialog.tsx` | 记忆库入口按钮 + 选择弹窗，需在 MemoryProvider 内使用；Props: `selectedIds`, `onToggle`, `maxChars?` |
| **ReportDisplay** | `modules/ai-toolbox/ReportDisplay.tsx` | 报告 HTML 通过 fetch + srcDoc 在 iframe 中展示；Props: `reportUrl`, `reportTitle`, `generatingLabel?`, `generatingHint?` |
| **CategoryCascader** | `modules/ai-toolbox/CategoryCascader.tsx` | 三级品类级联选择，支持搜索；Props: `tree`, `value`, `onChange`, `placeholder?`, `searchPlaceholder?`, `searchEmptyText?` |

---

## 3. 使用约定

- 样式扩展优先使用 `className` 与 Tailwind，避免修改组件内部样式。
- 下拉/弹层已统一 `collisionPadding` 与圆角、accent 选中态，新组件请与现有 Select/InlinePicker 风格一致。
- 纯按钮 hover 已统一为灰色（ghost: `hover:bg-foreground/10 hover:text-foreground`），无需再单独写 hover 色。
