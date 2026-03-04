import { trpc } from "@/lib/trpc";
import { Bird, TrendingUp, BarChart3, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const CHART_COLORS = [
  "oklch(0.38 0.08 155)",
  "oklch(0.62 0.13 55)",
  "oklch(0.55 0.09 200)",
  "oklch(0.72 0.10 90)",
  "oklch(0.48 0.10 310)",
  "oklch(0.60 0.12 25)",
  "oklch(0.50 0.10 260)",
  "oklch(0.65 0.08 130)",
];

function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-primary" strokeWidth={1.5} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="text-3xl font-light text-foreground" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
        {value}
      </div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

export default function Statistics() {
  const { data: summary, isLoading: summaryLoading } = trpc.stats.todaySummary.useQuery();
  const { data: speciesStats, isLoading: speciesLoading } = trpc.stats.species.useQuery({ days: 30 });
  const { data: hourlyStats, isLoading: hourlyLoading } = trpc.stats.hourly.useQuery();

  // 构造24小时数据（补全缺失小时）
  const hourlyData = Array.from({ length: 24 }, (_, h) => {
    const found = hourlyStats?.find((s: any) => Number(s.hour) === h);
    return { hour: `${h}:00`, count: found ? Number(found.count) : 0 };
  });

  const speciesData = (speciesStats ?? []).map((s: any) => ({
    name: s.speciesNameZh,
    value: Number(s.count),
    en: s.speciesNameEn,
  }));

  return (
    <div className="container py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-6 bg-primary rounded-full" />
          <span className="text-xs text-muted-foreground tracking-widest uppercase">Statistics</span>
        </div>
        <h1 className="text-3xl font-light text-foreground" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
          历史统计
        </h1>
        <p className="text-sm text-muted-foreground mt-1">鸟类访问数据分析与可视化</p>
      </div>

      {/* 今日概览 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {summaryLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : (
          <>
            <StatCard icon={Bird} label="今日识别次数" value={summary?.totalSightings ?? 0} sub="次抓拍记录" />
            <StatCard icon={TrendingUp} label="今日品种数" value={summary?.uniqueSpecies ?? 0} sub="种不同鸟类" />
            <StatCard icon={BarChart3} label="近30天记录" value={(speciesStats ?? []).reduce((a: number, s: any) => a + Number(s.count), 0)} sub="条识别记录" />
            <StatCard icon={Clock} label="记录品种总数" value={(speciesStats ?? []).length} sub="种已识别" />
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* 今日按小时分布柱状图 */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-medium text-foreground mb-1" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            今日访问时间分布
          </h2>
          <p className="text-xs text-muted-foreground mb-6">按小时统计今日鸟类访问频次</p>
          {hourlyLoading ? (
            <Skeleton className="h-48" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={hourlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.88 0.015 80)" />
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 10, fill: "oklch(0.52 0.03 60)" }}
                  tickLine={false}
                  interval={3}
                />
                <YAxis tick={{ fontSize: 10, fill: "oklch(0.52 0.03 60)" }} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.99 0.005 80)",
                    border: "1px solid oklch(0.88 0.015 80)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(v: any) => [`${v} 次`, "访问次数"]}
                />
                <Bar dataKey="count" fill="oklch(0.38 0.08 155)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 品种分布饼图 */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-medium text-foreground mb-1" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            近30天品种分布
          </h2>
          <p className="text-xs text-muted-foreground mb-6">各鸟类品种出现频次占比</p>
          {speciesLoading ? (
            <Skeleton className="h-48" />
          ) : speciesData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
              暂无数据
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={speciesData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {speciesData.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.99 0.005 80)",
                    border: "1px solid oklch(0.88 0.015 80)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(v: any, _: any, props: any) => [`${v} 次`, props.payload.name]}
                />
                <Legend
                  formatter={(value) => <span style={{ fontSize: "11px", color: "oklch(0.52 0.03 60)" }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 品种排行榜 */}
      <div className="mt-8 bg-card border border-border rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-medium text-foreground mb-1" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
          品种访问排行
        </h2>
        <p className="text-xs text-muted-foreground mb-6">近30天各品种出现次数排名</p>
        {speciesLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : speciesData.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">暂无数据</div>
        ) : (
          <div className="space-y-3">
            {speciesData.slice(0, 10).map((s: any, i: number) => {
              const maxCount = speciesData[0]?.value ?? 1;
              const pct = Math.round((s.value / maxCount) * 100);
              return (
                <div key={s.name} className="flex items-center gap-4">
                  <div className="w-6 text-center text-sm font-medium text-muted-foreground">{i + 1}</div>
                  <div className="w-24 shrink-0">
                    <div className="text-sm font-medium text-foreground truncate">{s.name}</div>
                    <div className="text-xs text-muted-foreground italic truncate">{s.en}</div>
                  </div>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                  </div>
                  <div className="w-12 text-right text-sm text-muted-foreground">{s.value} 次</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
