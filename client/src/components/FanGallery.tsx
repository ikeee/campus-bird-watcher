/**
 * FanGallery — BirdBuddy 风格扇形展开图片组件
 *
 * 布局：5 张图片以透视扇形排列，中间一张最大居中，
 * 向两侧依次缩小并旋转，营造景深感。
 * 每张图片右上角显示鸟类名称标签（绿色胶囊）。
 */
import { useState, useEffect } from "react";
import { Bird } from "lucide-react";

interface FanItem {
  url: string;
  speciesNameZh: string;
  speciesNameEn?: string;
  label?: string; // 右上角标签文字，如 "HDR" / "2K" / 鸟名
}

interface FanGalleryProps {
  items: FanItem[];
  /** 是否自动轮播（切换中心图） */
  autoplay?: boolean;
  autoplayInterval?: number;
}

// 每个位置的视觉参数（5 张，index 0 = 最左，2 = 中心，4 = 最右）
const SLOT_CONFIG = [
  { rotate: -18, translateX: -72, translateY: 16, scale: 0.72, zIndex: 1, opacity: 0.75 },
  { rotate: -9,  translateX: -38, translateY: 6,  scale: 0.86, zIndex: 2, opacity: 0.88 },
  { rotate: 0,   translateX: 0,   translateY: 0,  scale: 1.0,  zIndex: 5, opacity: 1.0  },
  { rotate: 9,   translateX: 38,  translateY: 6,  scale: 0.86, zIndex: 2, opacity: 0.88 },
  { rotate: 18,  translateX: 72,  translateY: 16, scale: 0.72, zIndex: 1, opacity: 0.75 },
];

// 占位鸟类图片（当无真实数据时使用）
const PLACEHOLDER_LABELS = ["Built for everyone", "1.00", "2k video", "HDR", "Wide field of view"];
const PLACEHOLDER_COLOR = "oklch(0.38 0.08 155)";

export default function FanGallery({ items, autoplay = true, autoplayInterval = 3500 }: FanGalleryProps) {
  // centerOffset 控制哪张图片在中心（0 = 第一张居中）
  const [centerOffset, setCenterOffset] = useState(0);

  const count = Math.max(items.length, 1);

  useEffect(() => {
    if (!autoplay || count <= 1) return;
    const id = setInterval(() => {
      setCenterOffset((prev) => (prev + 1) % count);
    }, autoplayInterval);
    return () => clearInterval(id);
  }, [autoplay, autoplayInterval, count]);

  // 根据 centerOffset 计算每个 slot 对应的 item index
  function getItemIndex(slotIndex: number): number {
    // 5 个 slot，中心 slot = 2
    const offset = slotIndex - 2;
    return ((centerOffset + offset) % count + count) % count;
  }

  // 渲染单张图片
  function renderCard(slotIndex: number) {
    const cfg = SLOT_CONFIG[slotIndex];
    const itemIdx = getItemIndex(slotIndex);
    const item = items[itemIdx];

    const label = item?.label ?? item?.speciesNameZh ?? PLACEHOLDER_LABELS[slotIndex];
    const isCenter = slotIndex === 2;

    return (
      <div
        key={slotIndex}
        className="absolute"
        style={{
          width: isCenter ? "min(340px, 44vw)" : "min(240px, 30vw)",
          aspectRatio: "3 / 4",
          transform: `
            translateX(${cfg.translateX}%)
            translateY(${cfg.translateY}px)
            rotate(${cfg.rotate}deg)
            scale(${cfg.scale})
          `,
          zIndex: cfg.zIndex,
          opacity: cfg.opacity,
          transition: "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
          borderRadius: "1.25rem",
          overflow: "hidden",
          boxShadow: isCenter
            ? "0 24px 60px rgba(0,0,0,0.22), 0 8px 20px rgba(0,0,0,0.12)"
            : "0 12px 32px rgba(0,0,0,0.14)",
        }}
      >
        {/* 图片 */}
        {item?.url ? (
          <img
            src={item.url}
            alt={item.speciesNameZh}
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: `oklch(0.28 0.06 155)` }}
          >
            <Bird className="text-white/30" style={{ width: "30%", height: "30%" }} strokeWidth={1} />
          </div>
        )}

        {/* 顶部深色遮罩（用于标签背景） */}
        <div
          className="absolute inset-x-0 top-0 h-16"
          style={{
            background: "linear-gradient(to bottom, rgba(20,50,40,0.72) 0%, transparent 100%)",
          }}
        />

        {/* 右上角标签 */}
        <div className="absolute top-3 right-3">
          <span
            className="inline-flex items-center px-2.5 py-1 rounded-full text-white text-xs font-semibold"
            style={{
              background: "oklch(0.38 0.08 155)",
              backdropFilter: "blur(4px)",
              fontSize: "0.7rem",
              letterSpacing: "0.01em",
            }}
          >
            {label}
          </span>
        </div>

        {/* 中心图片底部鸟名 */}
        {isCenter && item?.speciesNameEn && (
          <div
            className="absolute inset-x-0 bottom-0 px-4 py-3"
            style={{
              background: "linear-gradient(to top, rgba(10,30,20,0.8) 0%, transparent 100%)",
            }}
          >
            <p className="text-white/90 text-sm font-medium">{item.speciesNameZh}</p>
            <p className="text-white/60 text-xs italic">{item.speciesNameEn}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="relative flex items-center justify-center"
      style={{
        height: "min(480px, 58vw)",
        minHeight: "280px",
        perspective: "1000px",
      }}
    >
      {/* 渲染 5 个 slot（从后到前，确保中心在最上层） */}
      {[0, 1, 3, 4, 2].map((slotIndex) => renderCard(slotIndex))}

      {/* 轮播指示点 */}
      {count > 1 && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {Array.from({ length: Math.min(count, 8) }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCenterOffset(i)}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === centerOffset ? "20px" : "6px",
                height: "6px",
                background: i === centerOffset ? PLACEHOLDER_COLOR : "oklch(0.38 0.08 155 / 0.3)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
