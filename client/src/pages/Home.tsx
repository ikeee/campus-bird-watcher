import { trpc } from "@/lib/trpc";
import { Bird, Camera, Clock, Leaf, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? "bg-primary/10 text-primary" : pct >= 60 ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {pct}% 置信
    </span>
  );
}

function BirdCard({ sighting }: { sighting: any }) {
  const picUrl = sighting.s3PicUrl || sighting.originalPicUrl;
  const timeAgo = formatDistanceToNow(new Date(sighting.capturedAt), { addSuffix: true, locale: zhCN });

  return (
    <div className="bird-card group cursor-pointer" onClick={() => window.location.href = '/sightings'}>
      <div className="rounded-2xl overflow-hidden border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
        {/* 图片区 */}
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
        {/* 信息区 */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-foreground text-base leading-tight">
                {sighting.speciesNameZh}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 italic">
                {sighting.speciesNameEn}
              </p>
            </div>
          </div>
          {sighting.taxonomy && (
            <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
              <Leaf className="w-3 h-3" strokeWidth={1.5} />
              {sighting.taxonomy}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <Clock className="w-3 h-3" strokeWidth={1.5} />
            {timeAgo}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { data: summary, isLoading: summaryLoading } = trpc.stats.todaySummary.useQuery();
  const { data: latest, isLoading: latestLoading } = trpc.sightings.latest.useQuery({ limit: 8 });

  return (
    <div className="min-h-screen">
      {/* ── Hero 区域 ── */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5 pointer-events-none" />
        <div className="container py-16 md:py-24 relative">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-8 bg-primary rounded-full" />
              <span className="text-sm text-muted-foreground tracking-widest uppercase">Campus Bird Watch</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-foreground leading-tight mb-4"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              校园鸟屋<br />
              <span className="text-primary italic">智能观鸟站</span>
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8">
              通过 AI 视觉识别，实时记录每一位来访的羽毛朋友。
              每一张图片，都是自然与校园相遇的珍贵瞬间。
            </p>

            {/* 今日统计卡片 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {summaryLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-xl" />
                ))
              ) : (
                <>
                  <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <Camera className="w-4 h-4 text-primary" strokeWidth={1.5} />
                      <span className="text-xs text-muted-foreground">今日访客</span>
                    </div>
                    <div className="text-2xl font-light text-foreground" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                      {summary?.totalSightings ?? 0}
                    </div>
                    <div className="text-xs text-muted-foreground">次识别记录</div>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <Bird className="w-4 h-4 text-accent" strokeWidth={1.5} />
                      <span className="text-xs text-muted-foreground">品种数量</span>
                    </div>
                    <div className="text-2xl font-light text-foreground" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                      {summary?.uniqueSpecies ?? 0}
                    </div>
                    <div className="text-xs text-muted-foreground">种不同鸟类</div>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-4 shadow-sm col-span-2 sm:col-span-1">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-primary" strokeWidth={1.5} />
                      <span className="text-xs text-muted-foreground">最新访客</span>
                    </div>
                    {summary?.latestSighting ? (
                      <>
                        <div className="text-base font-medium text-foreground truncate">
                          {summary.latestSighting.speciesNameZh}
                        </div>
                        <div className="text-xs text-muted-foreground italic truncate">
                          {summary.latestSighting.speciesNameEn}
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-muted-foreground">暂无记录</div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── 最新识别记录 ── */}
      <section className="container py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-light text-foreground" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              最新到访
            </h2>
            <p className="text-sm text-muted-foreground mt-1">近期识别到的鸟类访客</p>
          </div>
          <Link
            href="/sightings"
            className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
          >
            查看全部
            <span className="text-base">→</span>
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
    </div>
  );
}
