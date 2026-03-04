import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCheck,
  Loader2,
} from "lucide-react";

type ReviewItem = {
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
  reviewStatus: string;
  reviewNote: string | null;
};

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    value >= 0.7 ? "text-amber-600 bg-amber-50 border-amber-200" : "text-red-600 bg-red-50 border-red-200";
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${color}`}>
      <AlertTriangle className="w-3 h-3" />
      {pct}%
    </span>
  );
}

export default function Review() {
  const { user, isAuthenticated } = useAuth();
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [detailItem, setDetailItem] = useState<ReviewItem | null>(null);
  const [noteText, setNoteText] = useState("");
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteAction, setNoteAction] = useState<"approve" | "reject">("approve");
  const [noteTargetId, setNoteTargetId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data: statsData } = trpc.review.stats.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
    refetchInterval: 10000,
  });

  const { data: listData, isLoading } = trpc.review.pendingList.useQuery(
    { page, pageSize },
    {
      enabled: isAuthenticated && user?.role === "admin",
      refetchInterval: 15000,
    }
  );

  const approveMutation = trpc.review.approve.useMutation({
    onSuccess: () => {
      toast.success("已通过该识别记录");
      utils.review.pendingList.invalidate();
      utils.review.stats.invalidate();
      setDetailItem(null);
    },
    onError: () => toast.error("操作失败，请重试"),
  });

  const rejectMutation = trpc.review.reject.useMutation({
    onSuccess: () => {
      toast.success("已拒绝该识别记录");
      utils.review.pendingList.invalidate();
      utils.review.stats.invalidate();
      setDetailItem(null);
    },
    onError: () => toast.error("操作失败，请重试"),
  });

  const batchApproveMutation = trpc.review.batchApprove.useMutation({
    onSuccess: (data) => {
      toast.success(`已批量通过 ${data.count} 条记录`);
      setSelectedIds(new Set());
      utils.review.pendingList.invalidate();
      utils.review.stats.invalidate();
    },
    onError: () => toast.error("批量操作失败，请重试"),
  });

  const batchRejectMutation = trpc.review.batchReject.useMutation({
    onSuccess: (data) => {
      toast.success(`已批量拒绝 ${data.count} 条记录`);
      setSelectedIds(new Set());
      utils.review.pendingList.invalidate();
      utils.review.stats.invalidate();
    },
    onError: () => toast.error("批量操作失败，请重试"),
  });

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
          <p className="text-lg font-medium text-foreground/70">需要管理员权限</p>
          <Link href="/">
            <Button variant="outline">返回首页</Button>
          </Link>
        </div>
      </div>
    );
  }

  const items: ReviewItem[] = (listData?.items ?? []) as ReviewItem[];
  const total = listData?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  const openNoteDialog = (action: "approve" | "reject", id: number) => {
    setNoteAction(action);
    setNoteTargetId(id);
    setNoteText("");
    setNoteDialogOpen(true);
  };

  const confirmNoteAction = () => {
    if (!noteTargetId) return;
    if (noteAction === "approve") {
      approveMutation.mutate({ id: noteTargetId, note: noteText || undefined });
    } else {
      rejectMutation.mutate({ id: noteTargetId, note: noteText || undefined });
    }
    setNoteDialogOpen(false);
  };

  const picUrl = (item: ReviewItem) => item.s3PicUrl || item.originalPicUrl || "";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-foreground/50 mb-2">
            <Link href="/admin" className="hover:text-foreground transition-colors">
              管理后台
            </Link>
            <span>/</span>
            <span>待复核队列</span>
          </div>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-serif font-semibold text-foreground">待复核队列</h1>
              <p className="mt-1 text-foreground/60">
                置信度低于阈值的识别记录，需要管理员人工确认
              </p>
            </div>
            {statsData && (
              <div className="flex gap-3">
                <div className="text-center px-4 py-2 rounded-xl bg-amber-50 border border-amber-100">
                  <div className="text-2xl font-serif font-bold text-amber-700">{statsData.pending}</div>
                  <div className="text-xs text-amber-600">待复核</div>
                </div>
                <div className="text-center px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-100">
                  <div className="text-2xl font-serif font-bold text-emerald-700">{statsData.approved}</div>
                  <div className="text-xs text-emerald-600">已通过</div>
                </div>
                <div className="text-center px-4 py-2 rounded-xl bg-red-50 border border-red-100">
                  <div className="text-2xl font-serif font-bold text-red-700">{statsData.rejected}</div>
                  <div className="text-xs text-red-600">已拒绝</div>
                </div>
                <div className="text-center px-4 py-2 rounded-xl bg-stone-50 border border-stone-100">
                  <div className="text-2xl font-serif font-bold text-stone-600">{statsData.autoApproved}</div>
                  <div className="text-xs text-stone-500">自动通过</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 批量操作栏 */}
        {items.length > 0 && (
          <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-stone-50 border border-stone-100">
            <Checkbox
              checked={selectedIds.size === items.length && items.length > 0}
              onCheckedChange={toggleSelectAll}
              id="select-all"
            />
            <label htmlFor="select-all" className="text-sm text-foreground/70 cursor-pointer">
              全选本页（{items.length} 条）
            </label>
            {selectedIds.size > 0 && (
              <>
                <span className="text-sm text-foreground/50">已选 {selectedIds.size} 条</span>
                <div className="ml-auto flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    onClick={() => batchApproveMutation.mutate({ ids: Array.from(selectedIds) })}
                    disabled={batchApproveMutation.isPending}
                  >
                    <CheckCheck className="w-4 h-4 mr-1" />
                    批量通过
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-200 text-red-700 hover:bg-red-50"
                    onClick={() => batchRejectMutation.mutate({ ids: Array.from(selectedIds) })}
                    disabled={batchRejectMutation.isPending}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    批量拒绝
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* 记录列表 */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-foreground/30" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-24">
            <CheckCircle className="w-16 h-16 text-emerald-300 mx-auto mb-4" />
            <h3 className="text-xl font-serif font-medium text-foreground/60">队列已清空</h3>
            <p className="text-foreground/40 mt-2">目前没有待复核的识别记录</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((item) => (
              <Card
                key={item.id}
                className={`group overflow-hidden border transition-all duration-200 cursor-pointer hover:shadow-md ${
                  selectedIds.has(item.id) ? "ring-2 ring-primary border-primary/30" : "border-stone-100"
                }`}
              >
                <div className="relative">
                  {/* 选择框 */}
                  <div
                    className="absolute top-2 left-2 z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(item.id);
                    }}
                  >
                    <Checkbox
                      checked={selectedIds.has(item.id)}
                      className="bg-white/90 border-white shadow-sm"
                    />
                  </div>

                  {/* 图片 */}
                  <div
                    className="aspect-[4/3] overflow-hidden bg-stone-100"
                    onClick={() => setDetailItem(item)}
                  >
                    {picUrl(item) ? (
                      <img
                        src={picUrl(item)}
                        alt={item.speciesNameZh}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-300">
                        <Eye className="w-8 h-8" />
                      </div>
                    )}
                  </div>

                  {/* 置信度角标 */}
                  <div className="absolute top-2 right-2">
                    <ConfidenceBadge value={item.confidence} />
                  </div>
                </div>

                <CardContent className="p-3">
                  <div className="mb-2">
                    <h3 className="font-serif font-semibold text-foreground text-base leading-tight">
                      {item.speciesNameZh}
                    </h3>
                    <p className="text-xs text-foreground/50 italic mt-0.5">{item.scientificName}</p>
                  </div>
                  <p className="text-xs text-foreground/40 mb-3">
                    {new Date(item.capturedAt).toLocaleString("zh-CN", {
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        openNoteDialog("approve", item.id);
                      }}
                      disabled={approveMutation.isPending}
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      通过
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-7 text-xs border-red-200 text-red-600 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        openNoteDialog("reject", item.id);
                      }}
                      disabled={rejectMutation.isPending}
                    >
                      <XCircle className="w-3 h-3 mr-1" />
                      拒绝
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-foreground/60">
              第 {page} / {totalPages} 页，共 {total} 条
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
      </div>

      {/* 详情弹窗 */}
      {detailItem && (
        <Dialog open={!!detailItem} onOpenChange={(open) => !open && setDetailItem(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-serif text-xl">
                {detailItem.speciesNameZh}
                <span className="ml-2 text-sm font-normal text-foreground/50 italic">
                  {detailItem.scientificName}
                </span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {picUrl(detailItem) && (
                <img
                  src={picUrl(detailItem)}
                  alt={detailItem.speciesNameZh}
                  className="w-full rounded-lg object-cover max-h-64"
                />
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-stone-50 rounded-lg p-3">
                  <div className="text-xs text-foreground/50 mb-1">英文名</div>
                  <div className="font-medium">{detailItem.speciesNameEn}</div>
                </div>
                <div className="bg-stone-50 rounded-lg p-3">
                  <div className="text-xs text-foreground/50 mb-1">分类</div>
                  <div className="font-medium">{detailItem.taxonomy || "—"}</div>
                </div>
                <div className="bg-amber-50 rounded-lg p-3">
                  <div className="text-xs text-amber-600 mb-1">置信度</div>
                  <div className="font-bold text-amber-700">
                    {Math.round(detailItem.confidence * 100)}%
                  </div>
                </div>
                <div className="bg-stone-50 rounded-lg p-3">
                  <div className="text-xs text-foreground/50 mb-1">识别时间</div>
                  <div className="font-medium text-xs">
                    {new Date(detailItem.capturedAt).toLocaleString("zh-CN")}
                  </div>
                </div>
              </div>
              {detailItem.description && (
                <div className="bg-stone-50 rounded-lg p-3 text-sm text-foreground/70">
                  {detailItem.description}
                </div>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50"
                onClick={() => openNoteDialog("reject", detailItem.id)}
              >
                <XCircle className="w-4 h-4 mr-1" />
                拒绝
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => openNoteDialog("approve", detailItem.id)}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                通过
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* 备注对话框 */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif">
              {noteAction === "approve" ? "确认通过" : "确认拒绝"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-foreground/60">
              {noteAction === "approve"
                ? "确认该识别结果正确，将其标记为已通过。"
                : "确认该识别结果有误，将其标记为已拒绝。"}
            </p>
            <Textarea
              placeholder="可选：添加复核备注（如：图片模糊、识别错误等）"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={3}
              className="resize-none text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialogOpen(false)}>
              取消
            </Button>
            <Button
              className={
                noteAction === "approve"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }
              onClick={confirmNoteAction}
              disabled={approveMutation.isPending || rejectMutation.isPending}
            >
              {approveMutation.isPending || rejectMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : noteAction === "approve" ? (
                <CheckCircle className="w-4 h-4 mr-1" />
              ) : (
                <XCircle className="w-4 h-4 mr-1" />
              )}
              确认{noteAction === "approve" ? "通过" : "拒绝"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
