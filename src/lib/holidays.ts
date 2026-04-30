import type { CountryCode, Holiday, LunarDate } from "../types";

export const countryNames: Record<CountryCode, string> = {
  VN: "Vietnam",
  US: "United States",
  KR: "Korea",
};

type SolarRule = {
  month: number;
  day: number;
  label: string;
  country: CountryCode;
  type?: Holiday["type"];
};

type LunarRule = {
  month: number;
  day: number;
  label: string;
  country: CountryCode;
  type?: Holiday["type"];
};

const solarRules: SolarRule[] = [
  { country: "VN", month: 1, day: 1, label: "New Year" },
  { country: "VN", month: 4, day: 30, label: "Reunification Day" },
  { country: "VN", month: 5, day: 1, label: "Labor Day" },
  { country: "VN", month: 9, day: 2, label: "National Day" },
  { country: "US", month: 1, day: 1, label: "New Year's Day" },
  { country: "US", month: 7, day: 4, label: "Independence Day" },
  { country: "US", month: 11, day: 11, label: "Veterans Day" },
  { country: "US", month: 12, day: 25, label: "Christmas Day" },
  { country: "KR", month: 1, day: 1, label: "New Year's Day" },
  { country: "KR", month: 3, day: 1, label: "Independence Movement Day" },
  { country: "KR", month: 8, day: 15, label: "Liberation Day" },
  { country: "KR", month: 10, day: 3, label: "National Foundation Day" },
  { country: "KR", month: 10, day: 9, label: "Hangul Day" },
  { country: "KR", month: 12, day: 25, label: "Christmas Day" },
];

const lunarRules: LunarRule[] = [
  { country: "VN", month: 1, day: 1, label: "Tet" },
  { country: "VN", month: 1, day: 2, label: "Tet Holiday" },
  { country: "VN", month: 1, day: 3, label: "Tet Holiday" },
  { country: "VN", month: 3, day: 10, label: "Hung Kings" },
  { country: "VN", month: 8, day: 15, label: "Mid-Autumn", type: "observance" },
  { country: "VN", month: 12, day: 23, label: "Kitchen Gods", type: "observance" },
  { country: "KR", month: 1, day: 1, label: "Seollal" },
  { country: "KR", month: 4, day: 8, label: "Buddha's Birthday" },
  { country: "KR", month: 8, day: 15, label: "Chuseok" },
];

export function getHolidays(date: Date, lunar: LunarDate, country: CountryCode): Holiday[] {
  const solarMatches = solarRules.filter(
    (rule) => rule.country === country && rule.month === date.getMonth() + 1 && rule.day === date.getDate(),
  );
  const lunarMatches = lunarRules.filter(
    (rule) => rule.country === country && rule.month === lunar.month && rule.day === lunar.day && !lunar.isLeap,
  );

  return [...solarMatches, ...lunarMatches].map((rule) => ({
    id: `${rule.country}-${rule.label}-${rule.month}-${rule.day}`,
    label: rule.label,
    country: rule.country,
    type: rule.type ?? "public",
  }));
}
