const thb = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  minimumFractionDigits: 2,
});

export function formatTHB(value: number | string | null | undefined) {
  return thb.format(Number(value ?? 0));
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Bangkok",
  });
}

/** วันนี้ในรูปแบบ YYYY-MM-DD (เวลาไทย) สำหรับ <input type="date"> */
export function todayISO() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
}

/** วันเกิด (YYYY-MM-DD) → "15 ม.ค. 2538 (อายุ 30 ปี)" แบบปีพุทธศักราช */
export function formatBirthDate(birthDate: string | null | undefined) {
  if (!birthDate) return "-";
  const [y, m, d] = birthDate.split("-").map(Number);
  const label = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

  const [ty, tm, td] = todayISO().split("-").map(Number);
  const age = ty - y - (tm < m || (tm === m && td < d) ? 1 : 0);
  return `${label} (อายุ ${age} ปี)`;
}

export function initials(name: string | null | undefined) {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "?";
  return trimmed.slice(0, 1).toUpperCase();
}
