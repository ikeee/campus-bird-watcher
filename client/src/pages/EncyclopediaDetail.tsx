import { trpc } from "@/lib/trpc";
import { Link, useParams } from "wouter";
import {
  Bird, ArrowLeft, Loader2, RefreshCw, MapPin, Heart, Utensils,
  TreePine, Baby, Music2, Shield, Sparkles, Eye, Feather, BookOpen,
  Clock, AlertCircle
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// 知识卡片配置
const knowledgeCards = [
  {
    key: "morphology" as const,
    label: "形态特征",
    icon: Feather,
    color: "bg-amber-50 border-amber-100",
    iconColor: "text-amber-600",
    description: "外观、体型与羽色",
  },
  {
    key: "behavior" as const,
    label: "生活习性",
    icon: Heart,
    color: "bg-rose-50 border-rose-100",
    iconColor: "text-rose-500",
    description: "活动规律与社会行为",
  },
  {
    key: "diet" as const,
    label: "食性",
    icon: Utensils,
    color: "bg-orange-50 border-orange-100",
    iconColor: "text-orange-500",
    description: "主要食物与觅食方式",
  },
  {
    key: "distribution" as const,
    label: "分布地区",
    icon: MapPin,
    color: "bg-blue-50 border-blue-100",
    iconColor: "text-blue-500",
    description: "在中国及世界的分布",
  },
  {
    key: "habitat" as const,
    label: "栖息地",
    icon: TreePine,
    color: "bg-emerald-50 border-emerald-100",
    iconColor: "text-emerald-600",
    description: "偏好的生活环境",
  },
  {
    key: "breeding" as const,
    label: "繁殖",
    icon: Baby,
    color: "bg-pink-50 border-pink-100",
    iconColor: "text-pink-500",
    description: "繁殖季节与筑巢习性",
  },
  {
    key: "vocalizations" as const,
    label: "鸣声",
    icon: Music2,
    color: "bg-violet-50 border-violet-100",
    iconColor: "text-violet-500",
    description: "鸣叫特点与声音描述",
  },
  {
    key: "campusObservationTips" as const,
    label: "校园观察建议",
    icon: Eye,
    color: "bg-teal-50 border-teal-100",
    iconColor: "text-teal-600",
    description: "如何在校园中找到它",
  },
];

const conservationColors: Record<string, string> = {
  "无危": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "LC": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "近危": "bg-amber-100 text-amber-700 border-amber-200",
  "NT": "bg-amber-100 text-amber-700 border-amber-200",
  "易危": "bg-orange-100 text-orange-700 border-orange-200",
  "VU": "bg-orange-100 text-orange-700 border-orange-200",
  "濒危": "bg-red-100 text-red-700 border-red-200",
  "EN": "bg-red-100 text-red-700 border-red-200",
  "极危": "bg-red-200 text-red-800 border-red-300",
  "CR": "bg-red-200 text-red-800 border-red-300",
};

function getConservationColor(status: string | null) {
  if (!status) return "bg-stone-100 text-stone-600 border-stone-200";
  for (const key of Object.keys(conservationColors)) {
    if (status.includes(key)) return conservationColors[key];
  }
  return "bg-stone-100 text-stone-600 border-stone-200";
}

export default function EncyclopediaDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0", 10);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const { data: entry, isLoading, refetch } = trpc.encyclopedia.getById.useQuery(
    { id },
    { enabled: !!id && !isNaN(id) }
  );

  const regenerateMutation = trpc.encyclopedia.regenerate.useMutation({
    onSuccess: () => {
      toast.success("百科内容已重新生成");
      refetch();
      setIsRegenerating(false);
    },
    onError: (err) => {
      toast.error("重新生成失败：" + err.message);
      setIsRegenerating(false);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" strokeWidth={1.5} />
          <p className="text-muted-foreground text-sm">加载百科内容…</p>
        </div>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" strokeWidth={1} />
          <h2 className="text-xl font-semibold text-foreground mb-2">百科条目不存在</h2>
          <p className="text-muted-foreground text-sm mb-6">该鸟类的百科内容尚未生成</p>
          <Link href="/encyclopedia">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回百科列表
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const hasContent = entry.generatedAt !== null;

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero 区域 ── */}
      <section className="relative border-b border-border overflow-hidden">
        {/* 背景图（模糊） */}
        {entry.representativePicUrl && (
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `url(${entry.representativePicUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "blur(40px)",
              transform: "scale(1.1)",
            }}
          />
        )}
        <div className="container py-10 relative">
          {/* 返回按钮 */}
          <Link href="/encyclopedia">
            <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 group">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              返回百科列表
            </button>
          </Link>

          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* 鸟类图片 */}
            <div className="flex-shrink-0">
              <div className="w-48 h-48 md:w-56 md:h-56 rounded-2xl overflow-hidden border border-border shadow-lg bg-secondary">
                {entry.representativePicUrl ? (
                  <img
                    src={entry.representativePicUrl}
                    alt={entry.speciesNameZh}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Bird className="w-16 h-16 text-muted-foreground/30" strokeWidth={1} />
                  </div>
                )}
              </div>
            </div>

            {/* 基本信息 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-primary/70 text-xs font-medium mb-2 tracking-widest uppercase">
                <Feather className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>Bird Encyclopedia</span>
              </div>

              <h1
                className="text-4xl md:text-5xl font-bold text-foreground mb-1"
                style={{ fontFamily: "'Noto Serif SC', 'Cormorant Garamond', serif" }}
              >
                {entry.speciesNameZh}
              </h1>
              <p className="text-lg text-muted-foreground italic mb-1">{entry.speciesNameEn}</p>
              <p className="text-sm text-muted-foreground/70 font-mono mb-4">{entry.scientificName}</p>

              {/* 标签行 */}
              <div className="flex flex-wrap items-center gap-2 mb-5">
                {entry.taxonomy && (
                  <Badge variant="secondary" className="text-xs font-normal">
                    {entry.taxonomy}
                  </Badge>
                )}
                {entry.conservationStatus && (
                  <span
                    className={cn(
                      "text-xs px-2.5 py-1 rounded-full border font-medium flex items-center gap-1",
                      getConservationColor(entry.conservationStatus)
                    )}
                  >
                    <Shield className="w-3 h-3" strokeWidth={1.5} />
                    {entry.conservationStatus}
                  </span>
                )}
                <span className="text-xs text-muted-foreground flex items-center gap-1 bg-secondary px-2.5 py-1 rounded-full">
                  <BookOpen className="w-3 h-3" strokeWidth={1.5} />
                  本站识别 {entry.sightingCount} 次
                </span>
                {entry.lastSeenAt && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1 bg-secondary px-2.5 py-1 rounded-full">
                    <Clock className="w-3 h-3" strokeWidth={1.5} />
                    最近：{new Date(entry.lastSeenAt).toLocaleDateString("zh-CN")}
                  </span>
                )}
              </div>

              {/* 简介 */}
              {entry.summary && (
                <p className="text-muted-foreground leading-relaxed text-sm md:text-base max-w-2xl">
                  {entry.summary}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── 知识卡片区 ── */}
      <section className="container py-10">
        {!hasContent ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-foreground font-medium mb-1">百科内容生成中</p>
              <p className="text-muted-foreground text-sm">AI 正在为这种鸟类撰写详细介绍，请稍后刷新</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新
            </Button>
          </div>
        ) : (
          <>
            {/* 趣味小知识 — 特别展示 */}
            {entry.funFacts && (
              <div className="mb-8 rounded-2xl bg-gradient-to-br from-primary/5 via-primary/3 to-transparent border border-primary/10 p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-primary" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-primary mb-2 tracking-wide uppercase">
                      趣味小知识
                    </h3>
                    <p className="text-foreground leading-relaxed">{entry.funFacts}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 知识卡片网格 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {knowledgeCards.map(({ key, label, icon: Icon, color, iconColor, description }) => {
                const content = entry[key];
                if (!content) return null;
                return (
                  <div
                    key={key}
                    className={cn(
                      "rounded-2xl border p-5 transition-shadow hover:shadow-md",
                      color
                    )}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-white/60 flex items-center justify-center">
                        <Icon className={cn("w-4 h-4", iconColor)} strokeWidth={1.5} />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{label}</h3>
                        <p className="text-xs text-muted-foreground">{description}</p>
                      </div>
                    </div>
                    <p className="text-sm text-foreground/80 leading-relaxed">{content}</p>
                  </div>
                );
              })}
            </div>

            {/* 生成时间 & 重新生成按钮 */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                {entry.generatedAt
                  ? `百科内容由 AI 生成于 ${new Date(entry.generatedAt).toLocaleString("zh-CN")}`
                  : ""}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground"
                disabled={isRegenerating}
                onClick={() => {
                  setIsRegenerating(true);
                  regenerateMutation.mutate({
                    speciesNameZh: entry.speciesNameZh,
                    speciesNameEn: entry.speciesNameEn,
                    scientificName: entry.scientificName,
                    taxonomy: entry.taxonomy,
                    representativePicUrl: entry.representativePicUrl,
                  });
                }}
              >
                {isRegenerating ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                )}
                重新生成
              </Button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
