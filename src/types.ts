export type CalendarKind = "solar" | "lunar";

export type CountryCode = "VN" | "US" | "KR";

export interface LunarDate {
  day: number;
  month: number;
  year: number;
  isLeap: boolean;
}

export interface MemoryDay {
  id: string;
  title: string;
  calendarKind: CalendarKind;
  sourceDate: string;
  country: CountryCode;
  repeatYearly: boolean;
  remindWeekBefore: boolean;
  remindDayBefore: boolean;
  lunarDate?: LunarDate;
  createdAt: string;
}

export interface Holiday {
  id: string;
  label: string;
  country: CountryCode;
  type: "public" | "observance";
}

export interface CalendarCell {
  date: Date;
  isoDate: string;
  inCurrentMonth: boolean;
  lunar: LunarDate;
  holidays: Holiday[];
  memories: MemoryDay[];
}
