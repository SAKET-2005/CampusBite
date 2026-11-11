export const CURRENT_STUDENT_ID = "S001";

/**
 * Formats a 24-hour SQL time string (e.g., "13:15:00" or "13:15") to 12-hour format ("1:15 pm").
 */
export function formatSlot(timeStr: string): string {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1] ?? "00";
  const ampm = hours >= 12 ? "pm" : "am";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours}:${minutes} ${ampm}`;
}

