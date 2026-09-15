// Fictional UI fixtures only. These are not production members or database models.
export const members = [
  { id: "thanh", name: "Thanh", initial: "T", color: "teal" },
  { id: "ba", name: "Ba", initial: "B", color: "blue" },
  { id: "me", name: "Mẹ", initial: "M", color: "orange" },
  { id: "linh", name: "Linh", initial: "L", color: "purple" },
  { id: "nam", name: "Nam", initial: "N", color: "pink" },
] as const;

export type MemberId = (typeof members)[number]["id"];
export const currentUser = members[0];
export const houseworkMember: MemberId = "thanh";
export const households = ["Nhà Ngoại", "Nhà Nội", "Nhà Dì"];

export type MockFoodBatch = {
  id: number;
  householdIndex: number;
  status: "active" | "waiting" | "finished";
  startedAt: string | null;
  finishedAt: string | null;
};

export function memberName(id: MemberId) {
  return members.find((member) => member.id === id)!.name;
}

export function localDate(now: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(now);
}

export function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00+07:00`);
  value.setUTCDate(value.getUTCDate() + days);
  return localDate(value);
}

export function dateLabel(date: string, short = false) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    ...(short ? {} : { weekday: "long" as const }),
    day: "2-digit",
    month: short ? "2-digit" : "long",
  }).format(new Date(`${date}T12:00:00+07:00`));
}

export function timeLabel(timestamp: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit",
  }).format(new Date(timestamp));
}

export function createMockData(today: string) {
  const weekday = new Date(`${today}T12:00:00+07:00`).getUTCDay();
  const monday = addDays(today, -(weekday === 0 ? 6 : weekday - 1));
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const foodBatches: MockFoodBatch[] = [{
    id: 0, householdIndex: 0, status: "active",
    startedAt: `${addDays(today, -2)}T12:00:00+07:00`, finishedAt: null,
  }];
  return { today, monday, days, foodBatches };
}
