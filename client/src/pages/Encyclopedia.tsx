import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import {
  Bird, Search, BookOpen, ChevronRight, Loader2, Feather,
  LayoutGrid, Filter, Clock, TrendingUp,
} from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// ── 保护状态颜色 ──────────────────────────────────────────────────────────────
const conservationColors: Record<string, string> = {
  "无危": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "LC":   "bg-emerald-100 text-emerald-700 border-emerald-200",
  "近危": "bg-amber-100 text-amber-700 border-amber-200",
  "NT":   "bg-amber-100 text-amber-700 border-amber-200",
  "易危": "bg-orange-100 text-orange-700 border-orange-200",
  "VU":   "bg-orange-100 text-orange-700 border-orange-200",
  "濒危": "bg-red-100 text-red-700 border-red-200",
  "EN":   "bg-red-100 text-red-700 border-red-200",
  "极危": "bg-red-200 text-red-800 border-red-300",
  "CR":   "bg-red-200 text-red-800 border-red-300",
};

function getConservationColor(status: string | null) {
  if (!status) return "bg-stone-100 text-stone-600 border-stone-200";
  for (const key of Object.keys(conservationColors)) {
    if (status.includes(key)) return conservationColors[key];
  }
  return "bg-stone-100 text-stone-600 border-stone-200";
}

// ── 排序选项 ──────────────────────────────────────────────────────────────────
type SortKey = "sightingCount" | "lastSeenAt" | "speciesNameZh";
const sortOptions: { key: SortKey; label: string; icon: typeof TrendingUp }[] = [
  { key: "sightingCount", label: "访问频次", icon: TrendingUp },
  { key: "lastSeenAt",    label: "最近到访", icon: Clock },
  { key: "speciesNameZh", label: "名称排序", icon: LayoutGrid },
];

export default function Encyclopedia() {
  const [search, setSearch]           = useState("");
  const [activeTaxonomy, setActiveTaxonomy] = useState<string | null>(null);
  const [sortKey, setSortKey]         = useState<SortKey>("sightingCount");

  const { data: entries, isLoading }  = trpc.encyclopedia.list.useQuery();
  const { data: taxonomies }          = trpc.encyclopedia.taxonomies.useQuery();
  const { data: stats }               = trpc.encyclopedia.stats.useQuery();

  // 最大识别次数（用于热度条计算）
  const maxSightingCount = useMemo(
    () => Math.max(...(entries?.map((e) => e.sightingCount) ?? [1]), 1),
    [entries]
  );

  const filtered = useMemo(() => {
    if (!entries) return [];
    let list = [...entries];

    // 分类筛选
    if (activeTaxonomy) {
      list = list.filter((e) => e.taxonomy?.includes(activeTaxonomy));
    }

    // 搜索过滤
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.speciesNameZh.toLowerCase().includes(q) ||
          e.speciesNameEn.toLowerCase().includes(q) ||
          e.scientificName.toLowerCase().includes(q) ||
          (e.taxonomy ?? "").toLowerCase().includes(q)
      );
    }

    // 排序
    list.sort((a, b) => {
      if (sortKey === "sightingCount") return b.sightingCount - a.sightingCount;
      if (sortKey === "lastSeenAt")    return (b.lastSeenAt ?? 0) - (a.lastSeenAt ?? 0);
      if (sortKey === "speciesNameZh") return a.speciesNameZh.localeCompare(b.speciesNameZh, "zh");
      return 0;
    });

    return list;
  }, [entries, activeTaxonomy, search, sortKey]);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero Header ── */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="container py-12 relative">
          <div className="flex items-center gap-2 text-primary/70 text-sm font-medium mb-3 tracking-widest uppercase">
            <Feather className="w-4 h-4" strokeWidth={1.5} />
            <span>Bird Encyclopedia</span>
          </div>
          <h1
            className="text-4xl md:text-5xl font-bold text-foreground mb-3"
            style={{ fontFamily: "'Noto Serif SC', 'Cormorant Garamond', serif" }}
          >
            鸟类百科
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mb-8">
            收录校园鸟屋中曾经到访的每一位羽毛朋友，探索它们的习性、分布与鸣声。
          </p>

          {/* 搜索框 */}
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索鸟类名称、学名或分类…"
              className="pl-10 bg-background border-border h-11 text-sm"
            />
          </div>

          {/* 统计徽章 */}
          {stats && (
            <div className="flex flex-wrap items-center gap-4 mt-5">
              <span className="text-sm text-muted-foreground">
                共收录
                <span className="text-foreground font-semibold mx-1">{stats.total}</span>
                种鸟类
              </span>
              {stats.taxonomyCounts.slice(0, 3).map((tc) => (
                <span key={tc.taxonomy} className="text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded-full">
                  {tc.taxonomy.split(" / ").pop()} · {tc.count} 种
                </span>
              ))}
              {search && (
                <span className="text-sm text-primary font-medium">
                  找到 {filtered.length} 种
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── 筛选栏 ── */}
      <section className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-16 z-30">
        <div className="container py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* 分类筛选 */}
          <div className="flex items-center gap-2 flex-wrap flex-1">
            <Filter className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" strokeWidth={1.5} />
            <button
              onClick={() => setActiveTaxonomy(null)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-full border transition-all",
                !activeTaxonomy
                  ? "bg-primary text-primary-foreground border-primary font-medium"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
              )}
            >
              全部
            </button>
            {taxonomies?.map((tax) => {
              // 只显示科名（最后一段）
              const shortName = tax.split(" / ").pop() ?? tax;
              return (
                <button
                  key={tax}
                  onClick={() => setActiveTaxonomy(activeTaxonomy === tax ? null : tax)}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-full border transition-all",
                    activeTaxonomy === tax
                      ? "bg-primary text-primary-foreground border-primary font-medium"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                  )}
                >
                  {shortName}
                </button>
              );
            })}
          </div>

          {/* 排序 */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {sortOptions.map(({ key, label }) => (
              <Button
                key={key}
                variant="ghost"
                size="sm"
                onClick={() => setSortKey(key)}
                className={cn(
                  "text-xs h-7 px-2.5",
                  sortKey === key ? "text-primary font-medium bg-primary/5" : "text-muted-foreground"
                )}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* ── 内容区 ── */}
      <section className="container py-10">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" strokeWidth={1.5} />
            <p className="text-muted-foreground text-sm">加载百科数据中…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
              <Bird className="w-8 h-8 text-muted-foreground/30" strokeWidth={1} />
            </div>
            <div>
              <p className="text-foreground font-medium mb-1">
                {search || activeTaxonomy ? "未找到匹配的鸟类" : "暂无百科记录"}
              </p>
              <p className="text-muted-foreground text-sm">
                {search || activeTaxonomy
                  ? "请尝试其他关键词或分类"
                  : "当摄像头识别到鸟类后，百科内容将自动生成"}
              </p>
            </div>
            {(search || activeTaxonomy) && (
              <Button variant="outline" size="sm" onClick={() => { setSearch(""); setActiveTaxonomy(null); }}>
                清除筛选
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((entry) => (
              <EncyclopediaCard
                key={entry.id}
                entry={entry}
                maxSightingCount={maxSightingCount}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ── 百科卡片 ──────────────────────────────────────────────────────────────────
function EncyclopediaCard({
  entry,
  maxSightingCount,
}: {
  entry: {
    id: number;
    speciesNameZh: string;
    speciesNameEn: string;
    scientificName: string;
    taxonomy: string | null;
    representativePicUrl: string | null;
    summary: string | null;
    conservationStatus: string | null;
    sightingCount: number;
    lastSeenAt: number | null;
  };
  maxSightingCount: number;
}) {
  const heatPct = Math.round((entry.sightingCount / maxSightingCount) * 100);

  return (
    <Link href={`/encyclopedia/${entry.id}`}>
      <div className="group cursor-pointer rounded-2xl overflow-hidden border border-border bg-card hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300 flex flex-col h-full">
        {/* 图片区 */}
        <div className="relative aspect-[4/3] bg-secondary overflow-hidden flex-shrink-0">
          {entry.representativePicUrl ? (
            <img
              src={entry.representativePicUrl}
              alt={entry.speciesNameZh}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Bird className="w-12 h-12 text-muted-foreground/30" strokeWidth={1} />
            </div>
          )}
          {/* 保护状态 */}
          {entry.conservationStatus && (
            <div className="absolute top-2.5 left-2.5">
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full border font-medium backdrop-blur-sm",
                  getConservationColor(entry.conservationStatus)
                )}
              >
                {entry.conservationStatus}
              </span>
            </div>
          )}
          {/* 识别次数徽章 */}
          <div className="absolute top-2.5 right-2.5">
            <div className="flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-full px-2.5 py-1 text-xs text-foreground/70">
              <BookOpen className="w-3 h-3" strokeWidth={1.5} />
              <span>{entry.sightingCount} 次</span>
            </div>
          </div>
        </div>

        {/* 文字区 */}
        <div className="p-4 flex flex-col flex-1">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3
              className="text-lg font-semibold text-foreground leading-tight"
              style={{ fontFamily: "'Noto Serif SC', serif" }}
            >
              {entry.speciesNameZh}
            </h3>
            <ChevronRight className="w-4 h-4 text-muted-foreground/50 flex-shrink-0 mt-0.5 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </div>
          <p className="text-xs text-muted-foreground italic mb-1">{entry.speciesNameEn}</p>
          <p className="text-xs text-muted-foreground/60 font-mono mb-3">{entry.scientificName}</p>

          {entry.taxonomy && (
            <Badge variant="secondary" className="text-xs font-normal mb-3 self-start">
              {entry.taxonomy}
            </Badge>
          )}

          {entry.summary && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-3 flex-1">
              {entry.summary}
            </p>
          )}

          {/* 热度条 */}
          <div className="mt-auto pt-2 border-t border-border/50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground/60">到访热度</span>
              {entry.lastSeenAt && (
                <span className="text-[10px] text-muted-foreground/60">
                  {new Date(entry.lastSeenAt).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}
                </span>
              )}
            </div>
            <div className="h-1 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary/60 rounded-full transition-all duration-500"
                style={{ width: `${heatPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
