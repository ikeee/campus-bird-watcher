/**
 * FanGallery — 精确还原 BirdBuddy 官网扇形展开图片组件
 *
 * 参考图特征：
 * - 5 张深色圆角卡片，中间最大居中，两侧依次缩小并向外旋转
 * - 每张卡片顶部有弧形鸟屋遮罩（深绿色 SVG 弧形）
 * - 右上角绿色胶囊标签（品种名 / 特性描述）
 * - 暖米白背景，卡片有明显投影
 */
import { useState, useEffect } from "react";
import { Bird } from "lucide-react";

interface FanItem {
  url: string;
  speciesNameZh: string;
  speciesNameEn?: string;
  label?: string;
}

interface FanGalleryProps {
  items: FanItem[];
  autoplay?: boolean;
  autoplayInterval?: number;
}

// 5 个槽位的变换参数（index 0=最左, 2=中心, 4=最右）
// 参考图：两侧卡片有明显旋转角度和位移，中间卡片最大最前
const SLOT_CONFIG = [
  { rotate: -22, tx: -52, ty: 28, scale: 0.68, zIndex: 1, opacity: 0.80 },
  { rotate: -11, tx: -26, ty: 10, scale: 0.84, zIndex: 2, opacity: 0.92 },
  { rotate:   0, tx:   0, ty:  0, scale: 1.00, zIndex: 5, opacity: 1.00 },
  { rotate:  11, tx:  26, ty: 10, scale: 0.84, zIndex: 2, opacity: 0.92 },
  { rotate:  22, tx:  52, ty: 28, scale: 0.68, zIndex: 1, opacity: 0.80 },
];

// 鸟屋顶部弧形遮罩 SVG（深绿色，模拟鸟屋屋顶形状）
function BirdhouseRoof({ color = "#1a3a2a" }: { color?: string }) {
  return (
    <svg
      viewBox="0 0 400 120"
      xmlns="http://www.w3.org/2000/svg"
      className="absolute inset-x-0 top-0 w-full pointer-events-none"
      style={{ zIndex: 2 }}
      preserveAspectRatio="none"
    >
      {/* 主屋顶弧形 */}
      <path
        d="M0,0 L0,55 Q60,20 120,30 Q180,42 200,28 Q220,14 280,30 Q340,46 400,55 L400,0 Z"
        fill={color}
      />
      {/* 屋顶底部柔和过渡 */}
      <path
        d="M0,50 Q60,18 120,28 Q180,40 200,26 Q220,12 280,28 Q340,44 400,50"
        fill="none"
        stroke={color}
        strokeWidth="2"
        opacity="0.5"
      />
    </svg>
  );
}

const PLACEHOLDER_LABELS = ["常见访客", "清晨歌手", "最爱谷物", "鸣声悦耳", "温柔来客"];
const PLACEHOLDER_NAMES = ["大山雀", "麻雀", "白头鹎", "乌鸫", "珠颈斑鸠"];

export default function FanGallery({ items, autoplay = true, autoplayInterval = 3500 }: FanGalleryProps) {
  const [centerOffset, setCenterOffset] = useState(0);
  const count = Math.max(items.length, 1);

  useEffect(() => {
    if (!autoplay || count <= 1) return;
    const id = setInterval(() => setCenterOffset((p) => (p + 1) % count), autoplayInterval);
    return () => clearInterval(id);
  }, [autoplay, autoplayInterval, count]);

  function getItemIndex(slotIndex: number) {
    const offset = slotIndex - 2;
    return ((centerOffset + offset) % count + count) % count;
  }

  function renderCard(slotIndex: number) {
    const cfg = SLOT_CONFIG[slotIndex];
    const itemIdx = getItemIndex(slotIndex);
    const item = items[itemIdx];
    const isCenter = slotIndex === 2;

    const label = item?.label ?? PLACEHOLDER_LABELS[slotIndex];
    const nameZh = item?.speciesNameZh ?? PLACEHOLDER_NAMES[slotIndex];
    const nameEn = item?.speciesNameEn;
    const imgUrl = item?.url;

    // 卡片宽度：中心卡片更大
    const cardW = isCenter ? "min(300px, 38vw)" : "min(210px, 27vw)";

    return (
      <div
        key={slotIndex}
        className="absolute"
        style={{
          width: cardW,
          aspectRatio: "3 / 4",
          transform: `translateX(${cfg.tx}%) translateY(${cfg.ty}px) rotate(${cfg.rotate}deg) scale(${cfg.scale})`,
          zIndex: cfg.zIndex,
          opacity: cfg.opacity,
          transition: "all 0.65s cubic-bezier(0.34, 1.4, 0.64, 1)",
          borderRadius: "1.5rem",
          overflow: "hidden",
          boxShadow: isCenter
            ? "0 28px 64px rgba(0,0,0,0.28), 0 8px 24px rgba(0,0,0,0.14)"
            : "0 14px 36px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.10)",
          // 深色卡片背景（参考图中卡片背景为深绿/深灰）
          background: "#1c3528",
        }}
      >
        {/* 鸟类照片 */}
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={nameZh}
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
            style={{ zIndex: 0 }}
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              background: "linear-gradient(160deg, #1c3528 0%, #0f2018 100%)",
              zIndex: 0,
            }}
          >
            <Bird
              className="text-white/20"
              style={{ width: "35%", height: "35%" }}
              strokeWidth={0.8}
            />
          </div>
        )}

        {/* 顶部鸟屋屋顶弧形遮罩 */}
        <BirdhouseRoof color="#1c3528" />

        {/* 右上角绿色胶囊标签 */}
        <div
          className="absolute top-3 right-3"
          style={{ zIndex: 3 }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "3px 10px",
              borderRadius: "999px",
              background: "oklch(0.52 0.14 155)",
              color: "#fff",
              fontSize: "0.68rem",
              fontWeight: 600,
              letterSpacing: "0.02em",
              backdropFilter: "blur(6px)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
            }}
          >
            {label}
          </span>
        </div>

        {/* 底部渐变 + 鸟名（仅中心卡片显示） */}
        {isCenter && (
          <div
            className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-10"
            style={{
              background: "linear-gradient(to top, rgba(8,24,16,0.85) 0%, transparent 100%)",
              zIndex: 3,
            }}
          >
            <p className="text-white font-semibold text-sm leading-tight">{nameZh}</p>
            {nameEn && (
              <p className="text-white/60 text-xs italic mt-0.5">{nameEn}</p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{
        height: "min(500px, 60vw)",
        minHeight: "300px",
      }}
    >
      {/* 渲染顺序：先渲染两侧，最后渲染中心（确保中心在最上层） */}
      {[0, 1, 3, 4, 2].map((slotIndex) => renderCard(slotIndex))}

      {/* 轮播指示点 */}
      {count > 1 && (
        <div
          className="absolute flex gap-1.5"
          style={{ bottom: "6px", left: "50%", transform: "translateX(-50%)", zIndex: 10 }}
        >
          {Array.from({ length: Math.min(count, 8) }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCenterOffset(i)}
              style={{
                width: i === centerOffset ? "20px" : "6px",
                height: "6px",
                borderRadius: "999px",
                background:
                  i === centerOffset
                    ? "oklch(0.32 0.09 155)"
                    : "oklch(0.32 0.09 155 / 0.28)",
                transition: "all 0.3s ease",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
