import { trpc } from "@/lib/trpc";
import { Bird, Camera, BookOpen, Feather, ChevronRight, Eye, Layers } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import FanGallery from "@/components/FanGallery";

// ── 置信度标签 ────────────────────────────────────────────────────────────────
function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 80
      ? "bg-primary/10 text-primary"
      : pct >= 60
      ? "bg-accent/10 text-accent"
      : "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {pct}% 置信
    </span>
  );
}

// ── 最新到访卡片 ──────────────────────────────────────────────────────────────
function BirdCard({ sighting }: { sighting: any }) {
  const picUrl = sighting.s3PicUrl || sighting.originalPicUrl;
  const timeAgo = formatDistanceToNow(new Date(sighting.capturedAt), {
    addSuffix: true,
    locale: zhCN,
  });

  return (
    <div
      className="group cursor-pointer"
      onClick={() => (window.location.href = "/sightings")}
    >
      <div className="rounded-2xl overflow-hidden border border-border bg-card shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
        <div className="relative aspect-[4/3] bg-muted overflow-hidden">
          {picUrl ? (
            <img
              src={picUrl}
              alt={sighting.speciesNameZh}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Bird className="w-12 h-12 text-muted-foreground/30" strokeWidth={1} />
            </div>
          )}
          <div className="absolute top-2 right-2">
            <ConfidenceBadge value={sighting.confidence} />
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-foreground text-base leading-tight">
            {sighting.speciesNameZh}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 italic">{sighting.speciesNameEn}</p>
          <p className="text-xs text-muted-foreground mt-2">{timeAgo}</p>
          <Link
            href="/encyclopedia"
            onClick={(e) => e.stopPropagation()}
            className="mt-2 inline-flex items-center gap-1 text-xs text-primary/70 hover:text-primary transition-colors"
          >
            <BookOpen className="w-3 h-3" strokeWidth={1.5} />
            查看百科
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── 主页面 ────────────────────────────────────────────────────────────────────
export default function Home() {
  const { data: summary, isLoading: summaryLoading } = trpc.stats.todaySummary.useQuery();
  const { data: latest, isLoading: latestLoading } = trpc.sightings.latest.useQuery({ limit: 8 });

  // 将最新识别记录转换为 FanGallery 所需格式
  const fanItems = (latest ?? [])
    .filter((s) => !!(s.s3PicUrl || s.originalPicUrl))
    .slice(0, 8)
    .map((s) => ({
      url: (s.s3PicUrl || s.originalPicUrl) as string,
      speciesNameZh: s.speciesNameZh,
      speciesNameEn: s.speciesNameEn ?? undefined,
      label: s.speciesNameZh,
    }));

  // 占位数据（无真实图片时）
  const placeholderItems = Array.from({ length: 5 }).map((_, i) => ({
    url: "",
    speciesNameZh: ["大山雀", "麻雀", "白头鹎", "乌鸫", "珠颈斑鸠"][i],
    speciesNameEn: ["Great Tit", "Tree Sparrow", "Light-vented Bulbul", "Blackbird", "Spotted Dove"][i],
    label: ["常见访客", "最爱谷物", "鸣声悦耳", "清晨歌手", "温柔来客"][i],
  }));

  const displayItems = fanItems.length >= 3 ? fanItems : placeholderItems;

  return (
    <div className="min-h-screen">
      {/* ════════════════════════════════════════════════════════════════
          Hero — 居中标题 + 扇形图片展示
      ════════════════════════════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden"
        style={{ background: "var(--background)" }}
      >
        {/* 背景纹理光晕 */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 20%, oklch(0.38 0.08 155 / 0.06) 0%, transparent 70%)",
          }}
        />

        <div className="container relative">
          {/* 居中标题区 */}
          <div className="text-center pt-16 pb-10 md:pt-20 md:pb-12">
            <div
              className="inline-flex items-center gap-2 text-xs tracking-widest uppercase mb-5 px-3 py-1.5 rounded-full border border-border text-muted-foreground"
            >
              <Feather className="w-3 h-3" strokeWidth={1.5} />
              Campus Bird Watch · 校园智能观鸟站
            </div>

            <h1
              className="text-5xl md:text-6xl lg:text-7xl font-semibold leading-tight mb-5"
              style={{
                fontFamily: "'Cormorant Garamond', 'Noto Serif SC', serif",
                color: "oklch(0.22 0.05 155)",
                letterSpacing: "-0.01em",
              }}
            >
              Stunning Images
            </h1>

            <p
              className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed mb-8"
            >
              AI 视觉识别每一位到访鸟屋的羽毛朋友，
              <br className="hidden md:block" />
              每一张抓拍，都是自然与校园相遇的珍贵瞬间。
            </p>

            {/* 统计数字行 */}
            {!summaryLoading && summary && (
              <div className="flex items-center justify-center gap-8 mb-10">
                <div className="text-center">
                  <div
                    className="text-3xl font-light"
                    style={{ fontFamily: "'Cormorant Garamond', serif", color: "oklch(0.22 0.05 155)" }}
                  >
                    {summary.totalSightings}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">今日识别</div>
                </div>
                <div className="w-px h-8 bg-border" />
                <div className="text-center">
                  <div
                    className="text-3xl font-light"
                    style={{ fontFamily: "'Cormorant Garamond', serif", color: "oklch(0.22 0.05 155)" }}
                  >
                    {summary.uniqueSpecies}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">鸟类品种</div>
                </div>
                {summary.latestSighting && (
                  <>
                    <div className="w-px h-8 bg-border" />
                    <div className="text-center">
                      <div
                        className="text-base font-medium truncate max-w-[100px]"
                        style={{ color: "oklch(0.22 0.05 155)" }}
                      >
                        {summary.latestSighting.speciesNameZh}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 italic truncate max-w-[100px]">
                        {summary.latestSighting.speciesNameEn}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* 扇形图片展示区 */}
          <div className="pb-16 md:pb-20">
            {latestLoading ? (
              <div className="flex items-end justify-center gap-3 h-80">
                {[0.72, 0.86, 1, 0.86, 0.72].map((s, i) => (
                  <Skeleton
                    key={i}
                    className="rounded-2xl flex-shrink-0"
                    style={{
                      width: `${s * 200}px`,
                      height: `${s * 280}px`,
                      opacity: 0.5 + s * 0.5,
                    }}
                  />
                ))}
              </div>
            ) : (
              <FanGallery items={displayItems} autoplay={fanItems.length >= 3} />
            )}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          快捷功能入口
      ════════════════════════════════════════════════════════════════ */}
      <section className="border-t border-border bg-card/50">
        <div className="container py-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 识别记录 */}
            <Link href="/sightings">
              <div className="group p-5 rounded-2xl border border-border bg-card hover:border-primary/30 hover:shadow-md transition-all duration-300 cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                  <Eye className="w-5 h-5 text-primary" strokeWidth={1.5} />
                </div>
                <h3 className="font-semibold text-foreground mb-1">识别记录</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  浏览所有抓拍图片与 AI 识别结果，支持筛选与复核
                </p>
              </div>
            </Link>

            {/* 鸟类百科 */}
            <Link href="/encyclopedia">
              <div className="group p-5 rounded-2xl border border-border bg-card hover:border-primary/30 hover:shadow-md transition-all duration-300 cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-3 group-hover:bg-accent/20 transition-colors">
                  <BookOpen className="w-5 h-5 text-accent" strokeWidth={1.5} />
                </div>
                <h3 className="font-semibold text-foreground mb-1">鸟类百科</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  AI 生成的形态、习性、分布与鸣声知识卡片
                </p>
              </div>
            </Link>

            {/* 历史统计 */}
            <Link href="/statistics">
              <div className="group p-5 rounded-2xl border border-border bg-card hover:border-primary/30 hover:shadow-md transition-all duration-300 cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                  <Layers className="w-5 h-5 text-primary" strokeWidth={1.5} />
                </div>
                <h3 className="font-semibold text-foreground mb-1">历史统计</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  按小时访问频次、品种分布饼图与排行榜
                </p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          最新到访记录
      ════════════════════════════════════════════════════════════════ */}
      <section className="container py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2
              className="text-2xl font-semibold text-foreground"
              style={{ fontFamily: "'Cormorant Garamond', 'Noto Serif SC', serif" }}
            >
              最新到访
            </h2>
            <p className="text-sm text-muted-foreground mt-1">近期识别到的鸟类访客</p>
          </div>
          <Link
            href="/sightings"
            className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
          >
            查看全部 <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {latestLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden border border-border">
                <Skeleton className="aspect-[4/3]" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : latest && latest.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {latest.map((sighting) => (
              <BirdCard key={sighting.id} sighting={sighting} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Bird className="w-8 h-8 text-muted-foreground/50" strokeWidth={1} />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">暂无识别记录</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              请在管理后台配置萤石云摄像头并启动监控，系统将自动识别来访的鸟类。
            </p>
            <Link
              href="/admin"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors"
            >
              <Camera className="w-4 h-4" strokeWidth={1.5} />
              前往配置
            </Link>
          </div>
        )}
      </section>

      {/* ════════════════════════════════════════════════════════════════
          百科入口（精简版）
      ════════════════════════════════════════════════════════════════ */}
      <EncyclopediaEntry />
    </div>
  );
}

// ── 百科快捷入口 ──────────────────────────────────────────────────────────────
function EncyclopediaEntry() {
  const { data: stats } = trpc.encyclopedia.stats.useQuery();
  const { data: entries } = trpc.encyclopedia.list.useQuery();
  const previews = (entries ?? []).filter((e) => !!e.representativePicUrl).slice(0, 4);

  return (
    <section className="border-t border-border" style={{ background: "oklch(0.96 0.012 155 / 0.25)" }}>
      <div className="container py-10">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-primary/70 text-xs font-medium mb-2 tracking-widest uppercase">
              <Feather className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Bird Encyclopedia</span>
            </div>
            <h2
              className="text-2xl font-semibold text-foreground mb-2"
              style={{ fontFamily: "'Cormorant Garamond', 'Noto Serif SC', serif" }}
            >
              鸟类百科
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4 max-w-md">
              探索每一位曾到访鸟屋的羽毛朋友——AI 自动生成的形态、习性、分布与鸣声知识卡片。
            </p>
            {stats && (
              <p className="text-xs text-muted-foreground mb-4">
                已收录
                <span className="text-foreground font-semibold mx-1">{stats.total}</span>
                种鸟类
                {stats.taxonomyCounts.length > 0 && (
                  <span className="ml-1">
                    ·{" "}
                    {stats.taxonomyCounts
                      .map((t) => t.taxonomy.split(" / ").pop())
                      .slice(0, 3)
                      .join("、")}{" "}
                    等
                  </span>
                )}
              </p>
            )}
            <Link href="/encyclopedia">
              <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors">
                <BookOpen className="w-4 h-4" strokeWidth={1.5} />
                浏览鸟类百科
                <ChevronRight className="w-4 h-4" />
              </button>
            </Link>
          </div>

          {previews.length > 0 && (
            <div className="flex gap-2 flex-shrink-0">
              {previews.map((entry) => (
                <Link key={entry.id} href={`/encyclopedia/${entry.id}`}>
                  <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden border border-border group cursor-pointer">
                    <img
                      src={entry.representativePicUrl!}
                      alt={entry.speciesNameZh}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                      <span className="text-white text-[10px] leading-tight font-medium">
                        {entry.speciesNameZh}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
              {(stats?.total ?? 0) > 4 && (
                <Link href="/encyclopedia">
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl border border-dashed border-border flex flex-col items-center justify-center gap-1 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer">
                    <span className="text-lg font-light text-muted-foreground">
                      +{(stats?.total ?? 0) - 4}
                    </span>
                    <span className="text-[10px] text-muted-foreground">更多</span>
                  </div>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
