import { trpc } from "@/lib/trpc";
import { Bird, Clock, Leaf, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Sighting = {
  id: number;
  speciesNameZh: string;
  speciesNameEn: string;
  scientificName: string;
  taxonomy: string | null;
  confidence: number;
  s3PicUrl: string | null;
  originalPicUrl: string | null;
  description: string | null;
  capturedAt: number;
  deviceSerial: string | null;
};

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? "bg-primary" : pct >= 60 ? "bg-accent" : "bg-muted-foreground";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
    </div>
  );
}

function SightingDetailDialog({ sighting, open, onClose }: { sighting: Sighting | null; open: boolean; onClose: () => void }) {
  if (!sighting) return null;
  const picUrl = sighting.s3PicUrl || sighting.originalPicUrl;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            <Bird className="w-5 h-5 text-primary" strokeWidth={1.5} />
            {sighting.speciesNameZh}
          </DialogTitle>
        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-6">
          {picUrl && (
            <div className="rounded-xl overflow-hidden aspect-square bg-muted">
              <img src={picUrl} alt={sighting.speciesNameZh} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="space-y-4">
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">英文名</div>
              <div className="text-base font-medium">{sighting.speciesNameEn}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">学名</div>
              <div className="text-sm italic text-foreground">{sighting.scientificName}</div>
            </div>
            {sighting.taxonomy && (
              <div>
                <div className="text-xs text-muted-foreground mb-0.5">分类</div>
                <div className="text-sm flex items-center gap-1">
                  <Leaf className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
                  {sighting.taxonomy}
                </div>
              </div>
            )}
            <div>
              <div className="text-xs text-muted-foreground mb-1">识别置信度</div>
              <ConfidenceBar value={sighting.confidence} />
            </div>
            {sighting.description && (
              <div>
                <div className="text-xs text-muted-foreground mb-0.5">描述</div>
                <p className="text-sm text-foreground leading-relaxed">{sighting.description}</p>
              </div>
            )}
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">识别时间</div>
              <div className="text-sm flex items-center gap-1 text-foreground">
                <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
                {format(new Date(sighting.capturedAt), "yyyy年MM月dd日 HH:mm:ss")}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Sightings() {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Sighting | null>(null);
  const pageSize = 12;

  const { data, isLoading } = trpc.sightings.paginated.useQuery({ page, pageSize });
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="container py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-6 bg-primary rounded-full" />
          <span className="text-xs text-muted-foreground tracking-widest uppercase">Bird Records</span>
        </div>
        <h1 className="text-3xl font-light text-foreground" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
          识别记录
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          共 <span className="text-foreground font-medium">{total}</span> 条记录
        </p>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: pageSize }).map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden border border-border">
              <Skeleton className="aspect-[4/3]" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-muted-foreground/40" strokeWidth={1} />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">暂无识别记录</h3>
          <p className="text-sm text-muted-foreground">请先在管理后台配置摄像头并启动监控</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((sighting) => {
            const picUrl = sighting.s3PicUrl || sighting.originalPicUrl;
            const timeAgo = formatDistanceToNow(new Date(sighting.capturedAt), { addSuffix: true, locale: zhCN });
            const pct = Math.round(sighting.confidence * 100);
            return (
              <div
                key={sighting.id}
                className="bird-card cursor-pointer"
                onClick={() => setSelected(sighting as Sighting)}
              >
                <div className="rounded-2xl overflow-hidden border border-border bg-card shadow-sm">
                  <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                    {picUrl ? (
                      <img
                        src={picUrl}
                        alt={sighting.speciesNameZh}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Bird className="w-10 h-10 text-muted-foreground/30" strokeWidth={1} />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium backdrop-blur-sm
                        ${pct >= 80 ? "bg-primary/80 text-primary-foreground" : pct >= 60 ? "bg-accent/80 text-accent-foreground" : "bg-black/40 text-white"}`}>
                        {pct}%
                      </span>
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-foreground text-sm leading-tight">{sighting.speciesNameZh}</h3>
                    <p className="text-xs text-muted-foreground italic mt-0.5 truncate">{sighting.speciesNameEn}</p>
                    <p className="text-xs text-muted-foreground italic mt-0.5 truncate">{sighting.scientificName}</p>
                    {sighting.taxonomy && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Leaf className="w-3 h-3 flex-shrink-0" strokeWidth={1.5} />
                        <span className="truncate">{sighting.taxonomy}</span>
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                      <Clock className="w-3 h-3 flex-shrink-0" strokeWidth={1.5} />
                      {timeAgo}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-10">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground px-2">
            第 <span className="text-foreground font-medium">{page}</span> / {totalPages} 页
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Detail Dialog */}
      <SightingDetailDialog
        sighting={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
