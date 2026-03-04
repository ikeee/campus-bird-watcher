/**
 * AI 模型管理页面
 * 管理员可在此配置、切换、测试不同的 AI 识鸟模型
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Bot,
  Plus,
  Trash2,
  Zap,
  FlaskConical,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Info,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

// ─── 预设提供商配置 ────────────────────────────────────────────────────────────

interface ProviderPreset {
  label: string;
  provider: string;
  baseUrl: string;
  defaultModel: string;
  models: { value: string; label: string }[];
  supportsVision: boolean;
  notes: string;
}

const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    label: "DeepSeek",
    provider: "deepseek",
    baseUrl: "https://api.deepseek.com",
    defaultModel: "deepseek-chat",
    models: [
      { value: "deepseek-chat", label: "DeepSeek Chat (V3)" },
      { value: "deepseek-reasoner", label: "DeepSeek Reasoner (R1)" },
    ],
    supportsVision: true,
    notes: "推荐用于识鸟，性价比高，支持中文。在 platform.deepseek.com 获取 API Key。",
  },
  {
    label: "OpenAI",
    provider: "openai",
    baseUrl: "https://api.openai.com",
    defaultModel: "gpt-4o",
    models: [
      { value: "gpt-4o", label: "GPT-4o" },
      { value: "gpt-4o-mini", label: "GPT-4o Mini（更快更便宜）" },
      { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
    ],
    supportsVision: true,
    notes: "识别精度高，支持多语言。在 platform.openai.com 获取 API Key。",
  },
  {
    label: "Google Gemini",
    provider: "gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-2.0-flash",
    models: [
      { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash（推荐）" },
      { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
      { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro（最强）" },
    ],
    supportsVision: true,
    notes: "Google 最新多模态模型，图片理解能力强。在 aistudio.google.com 获取 API Key。",
  },
  {
    label: "Ollama（本地）",
    provider: "ollama",
    baseUrl: "http://localhost:11434",
    defaultModel: "llava",
    models: [
      { value: "llava", label: "LLaVA（通用视觉）" },
      { value: "llava:13b", label: "LLaVA 13B（更精准）" },
      { value: "moondream", label: "Moondream（轻量）" },
      { value: "qwen2-vl", label: "Qwen2-VL（中文优化）" },
    ],
    supportsVision: true,
    notes: "完全离线运行，数据不出内网。需在服务器上安装 Ollama 并拉取对应模型。API Key 可填任意字符。",
  },
  {
    label: "自定义（OpenAI 兼容）",
    provider: "custom",
    baseUrl: "",
    defaultModel: "",
    models: [],
    supportsVision: true,
    notes: "任何兼容 OpenAI Chat Completions API 的服务均可接入，包括 Azure OpenAI、国内中转等。",
  },
];

// ─── 表单默认值 ────────────────────────────────────────────────────────────────

interface ModelForm {
  name: string;
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  imageDetail: "low" | "high" | "auto";
  maxTokens: number;
  notes: string;
}

const DEFAULT_FORM: ModelForm = {
  name: "",
  provider: "deepseek",
  apiKey: "",
  baseUrl: "https://api.deepseek.com",
  model: "deepseek-chat",
  imageDetail: "high",
  maxTokens: 512,
  notes: "",
};

// ─── 主组件 ────────────────────────────────────────────────────────────────────

export default function AiModelManager() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const { data: configs, isLoading } = trpc.aiModel.list.useQuery();
  const { data: activeConfig } = trpc.aiModel.active.useQuery();

  const createMutation = trpc.aiModel.create.useMutation({
    onSuccess: () => {
      toast.success("AI 模型配置已添加");
      utils.aiModel.list.invalidate();
      utils.aiModel.active.invalidate();
      setShowAddDialog(false);
      setForm(DEFAULT_FORM);
    },
    onError: (e) => toast.error("添加失败：" + e.message),
  });

  const updateMutation = trpc.aiModel.update.useMutation({
    onSuccess: () => {
      toast.success("配置已更新");
      utils.aiModel.list.invalidate();
      utils.aiModel.active.invalidate();
      setEditingId(null);
    },
    onError: (e) => toast.error("更新失败：" + e.message),
  });

  const deleteMutation = trpc.aiModel.delete.useMutation({
    onSuccess: () => {
      toast.success("配置已删除");
      utils.aiModel.list.invalidate();
      utils.aiModel.active.invalidate();
    },
    onError: (e) => toast.error("删除失败：" + e.message),
  });

  const activateMutation = trpc.aiModel.activate.useMutation({
    onSuccess: () => {
      toast.success("已切换 AI 模型");
      utils.aiModel.list.invalidate();
      utils.aiModel.active.invalidate();
    },
    onError: (e) => toast.error("切换失败：" + e.message),
  });

  const testMutation = trpc.aiModel.test.useMutation({
    onSuccess: (data) => {
      setTestResult(data);
    },
    onError: (e) => {
      setTestResult({ success: false, error: e.message });
    },
  });

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ModelForm>(DEFAULT_FORM);
  const [editForm, setEditForm] = useState<ModelForm>(DEFAULT_FORM);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showEditApiKey, setShowEditApiKey] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    result?: { hasBird: boolean; speciesNameZh: string; confidence: number; description: string };
    error?: string;
    latencyMs?: number;
  } | null>(null);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // 选择提供商时自动填充 baseUrl 和默认模型
  function applyPreset(providerKey: string, target: "add" | "edit") {
    const preset = PROVIDER_PRESETS.find((p) => p.provider === providerKey);
    if (!preset) return;
    const patch = {
      provider: preset.provider,
      baseUrl: preset.baseUrl,
      model: preset.defaultModel,
      notes: preset.notes,
    };
    if (target === "add") setForm((f) => ({ ...f, ...patch }));
    else setEditForm((f) => ({ ...f, ...patch }));
  }

  function handleAddSubmit() {
    createMutation.mutate(form);
  }

  function handleEditSubmit(id: number) {
    updateMutation.mutate({ id, ...editForm });
  }

  function handleTest(cfg: ModelForm, id?: number) {
    setTestResult(null);
    if (id) setTestingId(id);
    testMutation.mutate({
      apiKey: cfg.apiKey,
      baseUrl: cfg.baseUrl,
      model: cfg.model,
      imageDetail: cfg.imageDetail,
      maxTokens: cfg.maxTokens,
    });
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-background)" }}>
        <p className="text-muted-foreground">需要管理员权限</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4" style={{ background: "var(--color-background)" }}>
      <div className="max-w-4xl mx-auto">
        {/* 页头 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "var(--color-primary)", color: "var(--color-primary-foreground)" }}>
              <Bot size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: "var(--color-foreground)", fontFamily: "'Cormorant Garamond', serif" }}>
                AI 识鸟模型管理
              </h1>
              <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>
                配置和切换不同的 AI 提供商，支持 DeepSeek、OpenAI、Gemini、Ollama 等
              </p>
            </div>
          </div>
          <Button
            onClick={() => { setForm(DEFAULT_FORM); setShowAddDialog(true); }}
            style={{ background: "var(--color-primary)", color: "var(--color-primary-foreground)" }}
          >
            <Plus size={16} className="mr-2" />
            添加模型配置
          </Button>
        </div>

        {/* 当前激活配置提示 */}
        {activeConfig && (
          <div className="mb-6 p-4 rounded-xl border flex items-center gap-3"
            style={{ background: "oklch(0.97 0.02 145)", borderColor: "oklch(0.7 0.12 145)", color: "oklch(0.3 0.1 145)" }}>
            <CheckCircle2 size={18} />
            <span className="text-sm font-medium">
              当前激活：<strong>{activeConfig.name}</strong>
              （{activeConfig.provider} / {activeConfig.model}）
            </span>
          </div>
        )}

        {!activeConfig && !isLoading && (
          <div className="mb-6 p-4 rounded-xl border flex items-center gap-3"
            style={{ background: "oklch(0.97 0.05 50)", borderColor: "oklch(0.7 0.1 50)", color: "oklch(0.4 0.1 50)" }}>
            <Info size={18} />
            <span className="text-sm">
              尚未激活任何 AI 模型配置，请添加并激活一个配置后，系统才能自动识别鸟类。
            </span>
          </div>
        )}

        {/* 配置列表 */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin" style={{ color: "var(--color-primary)" }} />
          </div>
        ) : configs && configs.length > 0 ? (
          <div className="space-y-4">
            {configs.map((cfg) => {
              const preset = PROVIDER_PRESETS.find((p) => p.provider === cfg.provider);
              const isExpanded = expandedId === cfg.id;
              const isEditing = editingId === cfg.id;

              return (
                <div
                  key={cfg.id}
                  className="rounded-2xl border overflow-hidden transition-all"
                  style={{
                    background: "var(--color-card)",
                    borderColor: cfg.isActive ? "oklch(0.6 0.15 145)" : "var(--color-border)",
                    boxShadow: cfg.isActive ? "0 0 0 2px oklch(0.6 0.15 145 / 0.2)" : undefined,
                  }}
                >
                  {/* 卡片头部 */}
                  <div className="p-5 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-base" style={{ color: "var(--color-foreground)" }}>
                          {cfg.name}
                        </span>
                        {cfg.isActive && (
                          <Badge style={{ background: "oklch(0.6 0.15 145)", color: "white", fontSize: "11px" }}>
                            ✓ 当前使用
                          </Badge>
                        )}
                        <Badge variant="outline" style={{ fontSize: "11px" }}>
                          {preset?.label ?? cfg.provider}
                        </Badge>
                        <span className="text-xs font-mono px-2 py-0.5 rounded"
                          style={{ background: "var(--color-muted)", color: "var(--color-muted-foreground)" }}>
                          {cfg.model}
                        </span>
                      </div>
                      <p className="text-xs mt-1 truncate" style={{ color: "var(--color-muted-foreground)" }}>
                        {cfg.baseUrl}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {!cfg.isActive && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => activateMutation.mutate({ id: cfg.id })}
                          disabled={activateMutation.isPending}
                          className="text-xs"
                        >
                          <Zap size={13} className="mr-1" />
                          激活
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setTestingId(cfg.id);
                          setTestResult(null);
                          handleTest({
                            name: cfg.name,
                            provider: cfg.provider,
                            apiKey: cfg.apiKey,
                            baseUrl: cfg.baseUrl,
                            model: cfg.model,
                            imageDetail: (cfg.imageDetail as "low" | "high" | "auto") || "high",
                            maxTokens: cfg.maxTokens || 512,
                            notes: cfg.notes || "",
                          }, cfg.id);
                        }}
                        disabled={testMutation.isPending && testingId === cfg.id}
                        className="text-xs"
                      >
                        {testMutation.isPending && testingId === cfg.id ? (
                          <Loader2 size={13} className="mr-1 animate-spin" />
                        ) : (
                          <FlaskConical size={13} className="mr-1" />
                        )}
                        测试
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (isEditing) {
                            setEditingId(null);
                          } else {
                            setEditingId(cfg.id);
                            setEditForm({
                              name: cfg.name,
                              provider: cfg.provider,
                              apiKey: cfg.apiKey,
                              baseUrl: cfg.baseUrl,
                              model: cfg.model,
                              imageDetail: (cfg.imageDetail as "low" | "high" | "auto") || "high",
                              maxTokens: cfg.maxTokens || 512,
                              notes: cfg.notes || "",
                            });
                            setExpandedId(cfg.id);
                          }
                        }}
                        className="text-xs"
                      >
                        {isEditing ? "取消" : "编辑"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setExpandedId(isExpanded ? null : cfg.id)}
                        className="text-xs px-2"
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`确定删除配置"${cfg.name}"吗？`)) {
                            deleteMutation.mutate({ id: cfg.id });
                          }
                        }}
                        className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50 px-2"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>

                  {/* 测试结果 */}
                  {testingId === cfg.id && testResult && (
                    <div className={`mx-5 mb-4 p-3 rounded-xl text-sm ${testResult.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                      {testResult.success ? (
                        <div className="flex items-start gap-2">
                          <CheckCircle2 size={16} className="text-green-600 mt-0.5 shrink-0" />
                          <div>
                            <p className="font-medium text-green-800">测试成功！耗时 {testResult.latencyMs}ms</p>
                            {testResult.result?.hasBird ? (
                              <p className="text-green-700 mt-1">
                                识别到：<strong>{testResult.result.speciesNameZh}</strong>
                                （置信度 {((testResult.result.confidence || 0) * 100).toFixed(0)}%）
                                — {testResult.result.description}
                              </p>
                            ) : (
                              <p className="text-green-700 mt-1">API 连接正常，测试图片中未检测到鸟类。</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2">
                          <XCircle size={16} className="text-red-600 mt-0.5 shrink-0" />
                          <div>
                            <p className="font-medium text-red-800">测试失败</p>
                            <p className="text-red-700 mt-1 font-mono text-xs">{testResult.error}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 编辑表单 */}
                  {isEditing && (
                    <div className="px-5 pb-5 border-t pt-4" style={{ borderColor: "var(--color-border)" }}>
                      <ModelForm
                        form={editForm}
                        setForm={setEditForm}
                        showApiKey={showEditApiKey}
                        setShowApiKey={setShowEditApiKey}
                        onPreset={(p) => applyPreset(p, "edit")}
                      />
                      <div className="flex gap-2 mt-4">
                        <Button
                          size="sm"
                          onClick={() => handleEditSubmit(cfg.id)}
                          disabled={updateMutation.isPending}
                          style={{ background: "var(--color-primary)", color: "var(--color-primary-foreground)" }}
                        >
                          {updateMutation.isPending ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
                          保存修改
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                          取消
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* 展开详情（非编辑状态） */}
                  {isExpanded && !isEditing && (
                    <div className="px-5 pb-5 border-t pt-4 text-sm space-y-2"
                      style={{ borderColor: "var(--color-border)", color: "var(--color-muted-foreground)" }}>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                        <span>提供商</span><span className="font-medium" style={{ color: "var(--color-foreground)" }}>{preset?.label ?? cfg.provider}</span>
                        <span>模型</span><span className="font-mono font-medium" style={{ color: "var(--color-foreground)" }}>{cfg.model}</span>
                        <span>Base URL</span><span className="font-mono text-xs break-all" style={{ color: "var(--color-foreground)" }}>{cfg.baseUrl}</span>
                        <span>图片精度</span><span style={{ color: "var(--color-foreground)" }}>{cfg.imageDetail}</span>
                        <span>最大 Token</span><span style={{ color: "var(--color-foreground)" }}>{cfg.maxTokens}</span>
                        <span>API Key</span><span className="font-mono" style={{ color: "var(--color-foreground)" }}>{"•".repeat(Math.min(16, cfg.apiKey.length))}</span>
                      </div>
                      {cfg.notes && (
                        <p className="mt-2 text-xs italic">{cfg.notes}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 rounded-2xl border border-dashed"
            style={{ borderColor: "var(--color-border)" }}>
            <Bot size={40} className="mx-auto mb-3" style={{ color: "var(--color-muted-foreground)" }} />
            <p className="font-medium" style={{ color: "var(--color-foreground)" }}>尚未配置任何 AI 模型</p>
            <p className="text-sm mt-1 mb-4" style={{ color: "var(--color-muted-foreground)" }}>
              添加一个 AI 模型配置后，系统将自动识别鸟类品种
            </p>
            <Button
              onClick={() => { setForm(DEFAULT_FORM); setShowAddDialog(true); }}
              style={{ background: "var(--color-primary)", color: "var(--color-primary-foreground)" }}
            >
              <Plus size={16} className="mr-2" />
              添加第一个模型
            </Button>
          </div>
        )}

        {/* 提供商说明卡片 */}
        <div className="mt-10">
          <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--color-foreground)", fontFamily: "'Cormorant Garamond', serif" }}>
            支持的 AI 提供商
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PROVIDER_PRESETS.map((preset) => (
              <div key={preset.provider} className="p-4 rounded-xl border"
                style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-sm" style={{ color: "var(--color-foreground)" }}>
                    {preset.label}
                  </span>
                  {preset.supportsVision && (
                    <Badge variant="outline" style={{ fontSize: "10px" }}>视觉识别</Badge>
                  )}
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "var(--color-muted-foreground)" }}>
                  {preset.notes}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {preset.models.slice(0, 3).map((m) => (
                    <span key={m.value} className="text-xs font-mono px-1.5 py-0.5 rounded"
                      style={{ background: "var(--color-muted)", color: "var(--color-muted-foreground)" }}>
                      {m.value}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 添加配置对话框 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              添加 AI 模型配置
            </DialogTitle>
          </DialogHeader>
          <ModelForm
            form={form}
            setForm={setForm}
            showApiKey={showApiKey}
            setShowApiKey={setShowApiKey}
            onPreset={(p) => applyPreset(p, "add")}
          />
          <DialogFooter className="gap-2 mt-2">
            <Button
              variant="outline"
              onClick={() => {
                setTestResult(null);
                setTestingId(null);
                handleTest(form);
              }}
              disabled={testMutation.isPending && testingId === null}
            >
              {testMutation.isPending && testingId === null ? (
                <Loader2 size={14} className="animate-spin mr-1" />
              ) : (
                <FlaskConical size={14} className="mr-1" />
              )}
              测试连接
            </Button>
            <Button
              onClick={handleAddSubmit}
              disabled={createMutation.isPending}
              style={{ background: "var(--color-primary)", color: "var(--color-primary-foreground)" }}
            >
              {createMutation.isPending ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
              保存配置
            </Button>
          </DialogFooter>
          {testResult && testingId === null && (
            <div className={`mt-3 p-3 rounded-xl text-sm ${testResult.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
              {testResult.success ? (
                <div className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-green-800">连接成功！耗时 {testResult.latencyMs}ms</p>
                    {testResult.result?.hasBird ? (
                      <p className="text-green-700 mt-1">
                        识别到：<strong>{testResult.result.speciesNameZh}</strong>
                        （置信度 {((testResult.result.confidence || 0) * 100).toFixed(0)}%）
                      </p>
                    ) : (
                      <p className="text-green-700 mt-1">API 连接正常。</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <XCircle size={16} className="text-red-600 mt-0.5 shrink-0" />
                  <p className="text-red-700 font-mono text-xs">{testResult.error}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── 表单子组件 ────────────────────────────────────────────────────────────────

function ModelForm({
  form,
  setForm,
  showApiKey,
  setShowApiKey,
  onPreset,
}: {
  form: ModelForm;
  setForm: (f: ModelForm) => void;
  showApiKey: boolean;
  setShowApiKey: (v: boolean) => void;
  onPreset: (provider: string) => void;
}) {
  const preset = PROVIDER_PRESETS.find((p) => p.provider === form.provider);

  return (
    <div className="space-y-4">
      {/* 配置名称 */}
      <div className="space-y-1.5">
        <Label>配置名称</Label>
        <Input
          placeholder="如：DeepSeek 识鸟"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>

      {/* 提供商选择 */}
      <div className="space-y-1.5">
        <Label>AI 提供商</Label>
        <Select
          value={form.provider}
          onValueChange={(v) => {
            setForm({ ...form, provider: v });
            onPreset(v);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="选择提供商" />
          </SelectTrigger>
          <SelectContent>
            {PROVIDER_PRESETS.map((p) => (
              <SelectItem key={p.provider} value={p.provider}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {preset && (
          <p className="text-xs leading-relaxed" style={{ color: "var(--color-muted-foreground)" }}>
            {preset.notes}
          </p>
        )}
      </div>

      {/* API Key */}
      <div className="space-y-1.5">
        <Label>API Key</Label>
        <div className="relative">
          <Input
            type={showApiKey ? "text" : "password"}
            placeholder="sk-..."
            value={form.apiKey}
            onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
            className="pr-10"
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2"
            onClick={() => setShowApiKey(!showApiKey)}
            style={{ color: "var(--color-muted-foreground)" }}
          >
            {showApiKey ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      {/* Base URL */}
      <div className="space-y-1.5">
        <Label>Base URL</Label>
        <Input
          placeholder="https://api.deepseek.com"
          value={form.baseUrl}
          onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
        />
      </div>

      {/* 模型型号 */}
      <div className="space-y-1.5">
        <Label>模型型号</Label>
        {preset && preset.models.length > 0 ? (
          <Select
            value={form.model}
            onValueChange={(v) => setForm({ ...form, model: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择模型" />
            </SelectTrigger>
            <SelectContent>
              {preset.models.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
              <SelectItem value="__custom__">自定义型号…</SelectItem>
            </SelectContent>
          </Select>
        ) : null}
        {(!preset || preset.models.length === 0 || form.model === "__custom__") && (
          <Input
            placeholder="如：deepseek-chat"
            value={form.model === "__custom__" ? "" : form.model}
            onChange={(e) => setForm({ ...form, model: e.target.value })}
          />
        )}
      </div>

      {/* 高级选项 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>图片精度</Label>
          <Select
            value={form.imageDetail}
            onValueChange={(v) => setForm({ ...form, imageDetail: v as "low" | "high" | "auto" })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">high（高精度，推荐）</SelectItem>
              <SelectItem value="low">low（低精度，更快）</SelectItem>
              <SelectItem value="auto">auto（自动）</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>最大 Token</Label>
          <Input
            type="number"
            min={128}
            max={4096}
            value={form.maxTokens}
            onChange={(e) => setForm({ ...form, maxTokens: parseInt(e.target.value) || 512 })}
          />
        </div>
      </div>

      {/* 备注 */}
      <div className="space-y-1.5">
        <Label>备注（可选）</Label>
        <Textarea
          placeholder="如：用于校园鸟屋识别，每月预算 ¥50"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={2}
        />
      </div>
    </div>
  );
}
