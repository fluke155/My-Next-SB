import { ImageResponse } from "next/og";

/**
 * วาดไอคอนแอป (สร้างเป็น PNG ตอน build ไม่ต้องมีไฟล์รูป)
 * maskable = เว้นขอบให้ Android ตัดเป็นวงกลม/สี่เหลี่ยมมนได้
 */
export function renderAppIcon(size: number, { maskable = false } = {}) {
  const inner = maskable ? size * 0.6 : size * 0.78;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 55%, #4338ca 100%)",
          borderRadius: maskable ? 0 : size * 0.22,
        }}
      >
        <div
          style={{
            width: inner,
            height: inner,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: inner * 0.5,
            fontWeight: 700,
            letterSpacing: -inner * 0.02,
          }}
        >
          CM
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
