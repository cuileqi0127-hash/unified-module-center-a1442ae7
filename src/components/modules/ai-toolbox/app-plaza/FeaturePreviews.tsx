import { BarChart3, TrendingUp, Users, Target } from 'lucide-react';

/** Mini UI mockup for 市场洞察 */
export function PreviewInsight() {
  return (
    <div className="flex flex-col gap-1.5 h-full text-[6px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <BarChart3 className="size-2.5 text-accent" />
          <span className="font-medium text-foreground text-[7px]">市场洞察</span>
        </div>
        <span className="text-muted-foreground text-[5px]">深度报告</span>
      </div>
      <div className="flex gap-1 flex-1 min-h-0">
        <div className="flex flex-col gap-1 flex-1">
          <div className="rounded-md bg-gradient-to-br from-[hsl(15,85%,90%)] to-[hsl(35,90%,85%)] flex-1 flex items-center justify-center">
            <TrendingUp className="size-3 text-[hsl(25,80%,55%)]" />
          </div>
          <div className="rounded-md bg-gradient-to-br from-[hsl(200,80%,92%)] to-[hsl(260,70%,90%)] flex-1 flex items-center justify-center">
            <Users className="size-3 text-[hsl(230,60%,60%)]" />
          </div>
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <div className="rounded-md bg-gradient-to-br from-[hsl(40,90%,88%)] to-[hsl(20,85%,80%)] flex-[1.2] flex items-center justify-center">
            <Target className="size-3 text-[hsl(30,75%,50%)]" />
          </div>
          <div className="rounded-md bg-gradient-to-br from-[hsl(280,60%,92%)] to-[hsl(320,50%,88%)] flex-[0.8]" />
        </div>
      </div>
    </div>
  );
}

/** Mini UI mockup for 策划方案 */
export function PreviewPlanner() {
  return (
    <div className="flex flex-col gap-1.5 h-full text-[6px]">
      <div className="flex items-center gap-1">
        <div className="size-2.5 rounded bg-accent/20" />
        <span className="font-medium text-foreground text-[7px]">策划方案</span>
      </div>
      <div className="flex flex-col gap-1 flex-1">
        {['策略定位', '目标人群', '排期计划'].map((label, i) => (
          <div key={i} className="flex items-center gap-1.5 rounded-md border border-border/30 px-2 py-1.5 bg-muted/30">
            <div
              className="size-2 rounded-full shrink-0"
              style={{
                background: [
                  'hsl(15, 85%, 65%)',
                  'hsl(35, 90%, 65%)',
                  'hsl(200, 70%, 65%)',
                ][i],
              }}
            />
            <span className="text-foreground font-medium">{label}</span>
          </div>
        ))}
        <div className="rounded-md bg-gradient-to-r from-[hsl(15,80%,92%)] to-[hsl(40,85%,88%)] flex-1 mt-0.5" />
      </div>
    </div>
  );
}

/** Mini UI mockup for 图片生成 */
export function PreviewImageGen() {
  return (
    <div className="flex flex-col gap-1.5 h-full text-[6px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <div className="size-2.5 rounded bg-[hsl(15,80%,65%)]/20 flex items-center justify-center text-[hsl(15,80%,55%)] text-[5px]">✦</div>
          <span className="font-medium text-foreground text-[7px]">文生图</span>
        </div>
        <span className="text-muted-foreground text-[5px]">批量生成</span>
      </div>
      <div className="grid grid-cols-2 gap-1 flex-1 min-h-0">
        <div className="rounded-lg bg-gradient-to-br from-[hsl(330,70%,90%)] to-[hsl(350,60%,85%)]" />
        <div className="rounded-lg bg-gradient-to-br from-[hsl(40,90%,85%)] to-[hsl(30,80%,75%)]" />
        <div className="rounded-lg bg-gradient-to-br from-[hsl(195,80%,90%)] to-[hsl(210,60%,85%)]" />
        <div className="rounded-lg bg-gradient-to-br from-[hsl(270,60%,90%)] to-[hsl(290,50%,82%)]" />
      </div>
    </div>
  );
}

/** Mini UI mockup for 视频生成 */
export function PreviewVideoGen() {
  return (
    <div className="flex flex-col gap-1.5 h-full text-[6px]">
      <div className="flex items-center gap-1">
        <div className="size-2.5 rounded bg-[hsl(260,60%,65%)]/20" />
        <span className="font-medium text-foreground text-[7px]">视频生成</span>
      </div>
      <div className="flex gap-1 flex-1 min-h-0">
        <div className="flex flex-col gap-1 w-[35%]">
          {['脚本', '分镜', '成片'].map((s, i) => (
            <div key={i} className="rounded-md border border-border/30 px-1.5 py-1 bg-muted/30 flex items-center gap-1">
              <div className="size-1.5 rounded-full" style={{ background: ['hsl(15,80%,65%)', 'hsl(200,70%,60%)', 'hsl(140,55%,55%)'][i] }} />
              <span className="text-foreground">{s}</span>
            </div>
          ))}
        </div>
        <div className="flex-1 rounded-lg bg-gradient-to-br from-[hsl(260,50%,90%)] to-[hsl(200,60%,85%)] flex items-center justify-center">
          <div className="size-5 rounded-full bg-background/60 flex items-center justify-center">
            <div className="size-0 border-l-[5px] border-l-[hsl(260,50%,55%)] border-y-[3px] border-y-transparent ml-0.5" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Mini UI mockup for TikTok解决方案 - chat style */
export function PreviewTikTok() {
  return (
    <div className="flex flex-col gap-1.5 h-full text-[6px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <div className="size-2.5 rounded bg-foreground/10" />
          <span className="font-medium text-foreground text-[7px]">TikTok</span>
        </div>
        <span className="text-muted-foreground text-[5px]">增长方案</span>
      </div>
      <div className="flex flex-col gap-1 flex-1 min-h-0 overflow-hidden">
        {/* User message */}
        <div className="flex justify-end">
          <div className="rounded-lg rounded-tr-sm bg-accent/15 px-2 py-1 max-w-[75%]">
            <span className="text-foreground">帮我做一个美妆TikTok方案</span>
          </div>
        </div>
        {/* AI reply */}
        <div className="flex justify-start">
          <div className="rounded-lg rounded-tl-sm bg-muted/60 px-2 py-1 max-w-[80%]">
            <span className="text-foreground font-medium">✦ 选题方向</span>
            <p className="text-muted-foreground mt-0.5 leading-relaxed">平价好物测评 · 妆教合集…</p>
          </div>
        </div>
        {/* AI reply 2 */}
        <div className="flex justify-start">
          <div className="rounded-lg rounded-tl-sm bg-muted/60 px-2 py-1 max-w-[80%]">
            <span className="text-foreground font-medium">✦ 脚本大纲</span>
            <p className="text-muted-foreground mt-0.5 leading-relaxed">开头3s hook → 产品展示…</p>
          </div>
        </div>
      </div>
    </div>
  );
}
