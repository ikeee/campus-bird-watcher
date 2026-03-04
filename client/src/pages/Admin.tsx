import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import {
  Camera,
  Plus,
  Play,
  Square,
  Trash2,
  Settings,
  Lock,
  AlertCircle,
  CheckCircle2,
  Edit3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Link } from "wouter";
import { AlertTriangle, ExternalLink } from "lucide-react";

type CameraFormData = {
  name: string;
  appKey: string;
  appSecret: string;
  deviceSerial: string;
  channelNo: number;
  pollIntervalMs: number;
};

const defaultForm: CameraFormData = {
  name: "",
  appKey: "",
  appSecret: "",
  deviceSerial: "",
  channelNo: 1,
  pollIntervalMs: 10000,
};

function CameraFormDialog({
  open,
  onClose,
  editId,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  editId?: number;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<CameraFormData>(defaultForm);
  const utils = trpc.useUtils();

  const createMutation = trpc.cameras.create.useMutation({
    onSuccess: () => {
      toast.success("摄像头配置已创建");
      utils.cameras.list.invalidate();
      onSuccess();
      onClose();
    },
    onError: (e) => toast.error(`创建失败: ${e.message}`),
  });

  const updateMutation = trpc.cameras.update.useMutation({
    onSuccess: () => {
      toast.success("配置已更新");
      utils.cameras.list.invalidate();
      onSuccess();
      onClose();
    },
    onError: (e) => toast.error(`更新失败: ${e.message}`),
  });

  const handleSubmit = () => {
    if (!form.name || !form.appKey || !form.appSecret || !form.deviceSerial) {
      toast.error("请填写所有必填项");
      return;
    }
    if (editId) {
      updateMutation.mutate({ id: editId, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            <Camera className="w-5 h-5 text-primary" strokeWidth={1.5} />
            {editId ? "编辑摄像头配置" : "添加摄像头"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="name" className="text-xs text-muted-foreground mb-1.5 block">摄像头名称 *</Label>
            <Input id="name" placeholder="如：鸟屋1号摄像头" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">AppKey *</Label>
              <Input placeholder="萤石云 AppKey" value={form.appKey}
                onChange={(e) => setForm({ ...form, appKey: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">AppSecret *</Label>
              <Input type="password" placeholder="萤石云 AppSecret" value={form.appSecret}
                onChange={(e) => setForm({ ...form, appSecret: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">设备序列号 *</Label>
              <Input placeholder="设备序列号" value={form.deviceSerial}
                onChange={(e) => setForm({ ...form, deviceSerial: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">通道号</Label>
              <Input type="number" min={1} value={form.channelNo}
                onChange={(e) => setForm({ ...form, channelNo: parseInt(e.target.value) || 1 })} />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              轮询间隔（毫秒）<span className="text-muted-foreground/60">最小 4000ms</span>
            </Label>
            <Input type="number" min={4000} step={1000} value={form.pollIntervalMs}
              onChange={(e) => setForm({ ...form, pollIntervalMs: Math.max(4000, parseInt(e.target.value) || 10000) })} />
            <p className="text-xs text-muted-foreground mt-1">
              当前设置：每 {(form.pollIntervalMs / 1000).toFixed(0)} 秒抓拍一次
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>取消</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "保存中..." : editId ? "保存修改" : "添加摄像头"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Admin() {
  const { user, isAuthenticated, loading } = useAuth();
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<number | undefined>();
  const [deleteId, setDeleteId] = useState<number | undefined>();

  const utils = trpc.useUtils();

  // 置信度阈值状态
  const { data: thresholdData } = trpc.config.getThreshold.useQuery();
  const { data: reviewStats } = trpc.review.stats.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
    refetchInterval: 15000,
  });
  const [localThreshold, setLocalThreshold] = useState<number>(0.75);
  const [thresholdSaved, setThresholdSaved] = useState(false);

  useEffect(() => {
    if (thresholdData?.threshold !== undefined) {
      setLocalThreshold(thresholdData.threshold);
    }
  }, [thresholdData?.threshold]);

  const setThresholdMutation = trpc.config.setThreshold.useMutation({
    onSuccess: () => {
      toast.success("阈值已更新，历史记录已重新分类");
      setThresholdSaved(true);
      setTimeout(() => setThresholdSaved(false), 2000);
      utils.review.stats.invalidate();
    },
    onError: (e) => toast.error(`设置失败: ${e.message}`),
  });

  const { data: cameras, isLoading } = trpc.cameras.list.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });
  const { data: activeMonitors } = trpc.cameras.activeMonitors.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
    refetchInterval: 5000,
  });

  const startMutation = trpc.cameras.startMonitor.useMutation({
    onSuccess: () => { toast.success("监控已启动"); utils.cameras.list.invalidate(); utils.cameras.activeMonitors.invalidate(); },
    onError: (e) => toast.error(`启动失败: ${e.message}`),
  });
  const stopMutation = trpc.cameras.stopMonitor.useMutation({
    onSuccess: () => { toast.success("监控已停止"); utils.cameras.list.invalidate(); utils.cameras.activeMonitors.invalidate(); },
    onError: (e) => toast.error(`停止失败: ${e.message}`),
  });
  const deleteMutation = trpc.cameras.delete.useMutation({
    onSuccess: () => { toast.success("已删除"); utils.cameras.list.invalidate(); setDeleteId(undefined); },
    onError: (e) => toast.error(`删除失败: ${e.message}`),
  });

  // 未登录
  if (!loading && !isAuthenticated) {
    return (
      <div className="container py-20 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-muted-foreground/50" strokeWidth={1} />
        </div>
        <h2 className="text-2xl font-light mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>需要登录</h2>
        <p className="text-sm text-muted-foreground mb-6">管理后台需要管理员账号登录</p>
        <a href={getLoginUrl()} className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors">
          登录账号
        </a>
      </div>
    );
  }

  // 非管理员
  if (!loading && isAuthenticated && user?.role !== "admin") {
    return (
      <div className="container py-20 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-muted-foreground/50" strokeWidth={1} />
        </div>
        <h2 className="text-2xl font-light mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>权限不足</h2>
        <p className="text-sm text-muted-foreground">此页面仅限管理员访问</p>
      </div>
    );
  }

  return (
    <div className="container py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-6 bg-primary rounded-full" />
            <span className="text-xs text-muted-foreground tracking-widest uppercase">Admin Panel</span>
          </div>
          <h1 className="text-3xl font-light text-foreground" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            管理后台
          </h1>
          <p className="text-sm text-muted-foreground mt-1">配置萤石云摄像头，管理监控任务</p>
        </div>
        <Button onClick={() => { setEditId(undefined); setAddOpen(true); }} className="flex items-center gap-2">
          <Plus className="w-4 h-4" strokeWidth={2} />
          添加摄像头
        </Button>
      </div>

      {/* 运行状态 */}
      <div className="bg-card border border-border rounded-xl p-4 mb-6 flex items-center gap-3">
        <div className={`w-2.5 h-2.5 rounded-full ${(activeMonitors?.length ?? 0) > 0 ? "bg-green-500 animate-pulse" : "bg-muted-foreground/40"}`} />
        <span className="text-sm text-foreground">
          {(activeMonitors?.length ?? 0) > 0
            ? `${activeMonitors?.length} 个摄像头正在监控中`
            : "当前无摄像头运行"}
        </span>
        {(activeMonitors?.length ?? 0) > 0 && (
          <Badge variant="secondary" className="ml-auto text-xs">运行中</Badge>
        )}
      </div>

      {/* 摄像头列表 */}
      {loading || isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : !cameras || cameras.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-2xl">
          <Camera className="w-12 h-12 text-muted-foreground/30 mb-4" strokeWidth={1} />
          <h3 className="text-lg font-medium text-foreground mb-2">尚未配置摄像头</h3>
          <p className="text-sm text-muted-foreground mb-4">点击右上角"添加摄像头"开始配置</p>
        </div>
      ) : (
        <div className="space-y-4">
          {cameras.map((cam: any) => {
            const isRunning = activeMonitors?.includes(cam.id);
            return (
              <div key={cam.id} className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center ${isRunning ? "bg-primary/10" : "bg-muted"}`}>
                      <Camera className={`w-4 h-4 ${isRunning ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.5} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-foreground">{cam.name}</h3>
                        {isRunning ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />监控中
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            已停止
                          </span>
                        )}
                      </div>
                      <div className="mt-1 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1">
                        <div className="text-xs text-muted-foreground">
                          <span className="text-foreground/60">设备序列号：</span>{cam.deviceSerial}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <span className="text-foreground/60">AppKey：</span>{cam.appKey.slice(0, 8)}...
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <span className="text-foreground/60">通道：</span>{cam.channelNo}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <span className="text-foreground/60">轮询间隔：</span>{cam.pollIntervalMs / 1000}s
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isRunning ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => stopMutation.mutate({ id: cam.id })}
                        disabled={stopMutation.isPending}
                        className="text-destructive border-destructive/30 hover:bg-destructive/5"
                      >
                        <Square className="w-3.5 h-3.5 mr-1" strokeWidth={2} />
                        停止
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => startMutation.mutate({ id: cam.id })}
                        disabled={startMutation.isPending}
                      >
                        <Play className="w-3.5 h-3.5 mr-1" strokeWidth={2} />
                        启动
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setEditId(cam.id); setAddOpen(true); }}
                    >
                      <Edit3 className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteId(cam.id)}
                      className="text-destructive border-destructive/30 hover:bg-destructive/5"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 置信度阈值设置面板 */}
      <div className="mt-8 bg-card border border-border rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" strokeWidth={1.5} />
            <h3 className="text-sm font-medium text-foreground">识别置信度阈值</h3>
          </div>
          {reviewStats && reviewStats.pending > 0 && (
            <Link href="/review">
              <Button variant="outline" size="sm" className="border-amber-200 text-amber-700 hover:bg-amber-50 gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                {reviewStats.pending} 条待复核
                <ExternalLink className="w-3 h-3" />
              </Button>
            </Link>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          置信度低于阈值的识别结果将进入“待复核队列”，需要管理员手动确认。高于阈值的识别结果将自动通过。
        </p>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground/70">当前阈值</span>
            <span className="text-lg font-serif font-bold text-primary">
              {Math.round(localThreshold * 100)}%
            </span>
          </div>
          <Slider
            value={[localThreshold]}
            min={0}
            max={1}
            step={0.01}
            onValueChange={([v]) => setLocalThreshold(v)}
            className="w-full"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>0%（全部进入复核）</span>
            <div className="flex gap-2">
              {[0.5, 0.6, 0.7, 0.75, 0.8, 0.9].map((v) => (
                <button
                  key={v}
                  onClick={() => setLocalThreshold(v)}
                  className={`px-2 py-0.5 rounded text-xs transition-colors ${
                    Math.abs(localThreshold - v) < 0.005
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  {Math.round(v * 100)}%
                </button>
              ))}
            </div>
            <span>100%（全部自动通过）</span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <div className="text-xs text-muted-foreground">
              {reviewStats && (
                <span>当前待复核：<strong className="text-amber-600">{reviewStats.pending}</strong> 条 · 自动通过：<strong>{reviewStats.autoApproved}</strong> 条</span>
              )}
            </div>
            <Button
              size="sm"
              onClick={() => setThresholdMutation.mutate({ threshold: localThreshold, reclassify: true })}
              disabled={setThresholdMutation.isPending || Math.abs(localThreshold - (thresholdData?.threshold ?? 0.75)) < 0.001}
              className={thresholdSaved ? "bg-emerald-600 hover:bg-emerald-700" : ""}
            >
              {setThresholdMutation.isPending ? "保存中..." : thresholdSaved ? "已保存" : "应用阈值"}
            </Button>
          </div>
        </div>
      </div>

      {/* 使用说明 */}
      <div className="mt-4 bg-muted/50 border border-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <Settings className="w-4 h-4 text-primary" strokeWidth={1.5} />
          配置说明
        </h3>
        <div className="text-xs text-muted-foreground space-y-1.5 leading-relaxed">
          <p>1. 登录 <a href="https://open.ys7.com" target="_blank" rel="noopener" className="text-primary hover:underline">萤石云开放平台</a>，在「开发者服务 → 我的应用」中获取 AppKey 和 AppSecret。</p>
          <p>2. 在萤石云 App 或网页端查看摄像头设备序列号（通常印在设备背面）。</p>
          <p>3. 轮询间隔建议设置 10000ms（10秒）以上，最小不得低于 4000ms（萤石云 API 限制）。</p>
          <p>4. 启动监控后，系统将自动抓拍图片并通过 AI 识别鸟类，识别到鸟类时自动保存记录。</p>
          <p>5. 抓拍图片将上传至云存储永久保存，不受萤石云 2 小时有效期限制。</p>
        </div>
      </div>

      {/* 添加/编辑对话框 */}
      <CameraFormDialog
        open={addOpen}
        onClose={() => { setAddOpen(false); setEditId(undefined); }}
        editId={editId}
        onSuccess={() => {}}
      />

      {/* 删除确认 */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              删除后将同时停止该摄像头的监控任务，历史识别记录不受影响。此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
