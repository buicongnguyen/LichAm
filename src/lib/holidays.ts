import type { CountryCode, Holiday, LunarDate } from "../types";
import { addDays } from "./date";
import { solarLongitudeDegreesAtVietnamMidnight, solarToLunar } from "./vietnameseLunar";

export const countryNames: Record<CountryCode, string> = {
  VN: "Việt Nam",
  US: "Hoa Kỳ",
  KR: "Hàn Quốc",
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

type SolarTermRule = {
  longitude: number;
  label: string;
};

const solarRules: SolarRule[] = [
  { country: "VN", month: 1, day: 1, label: "Tết Dương lịch" },
  { country: "VN", month: 3, day: 8, label: "Ngày Quốc tế Phụ nữ", type: "observance" },
  { country: "VN", month: 4, day: 30, label: "Ngày Thống nhất" },
  { country: "VN", month: 5, day: 1, label: "Quốc tế Lao động" },
  { country: "VN", month: 9, day: 2, label: "Quốc khánh" },
  { country: "VN", month: 11, day: 20, label: "Ngày Nhà giáo Việt Nam", type: "observance" },
  { country: "VN", month: 12, day: 25, label: "Noel / Giáng sinh", type: "observance" },
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
  { country: "VN", month: 1, day: 1, label: "Tết Nguyên đán" },
  { country: "VN", month: 1, day: 2, label: "Tết Nguyên đán" },
  { country: "VN", month: 1, day: 15, label: "Tết Nguyên tiêu / Rằm tháng Giêng", type: "observance" },
  { country: "VN", month: 3, day: 3, label: "Tết Hàn thực", type: "observance" },
  { country: "VN", month: 3, day: 10, label: "Giỗ Tổ Hùng Vương" },
  { country: "VN", month: 4, day: 15, label: "Lễ Phật Đản", type: "observance" },
  { country: "VN", month: 5, day: 5, label: "Tết Đoan ngọ", type: "observance" },
  { country: "VN", month: 7, day: 15, label: "Vu Lan / Rằm tháng Bảy", type: "observance" },
  { country: "VN", month: 8, day: 15, label: "Tết Trung thu / Rằm tháng Tám", type: "observance" },
  { country: "VN", month: 12, day: 23, label: "Ông Công Ông Táo", type: "observance" },
  { country: "KR", month: 1, day: 1, label: "Seollal" },
  { country: "KR", month: 4, day: 8, label: "Buddha's Birthday" },
  { country: "KR", month: 8, day: 15, label: "Chuseok" },
];

const vietnameseSeasonTerms: SolarTermRule[] = [
  { longitude: 315, label: "Lập xuân" },
  { longitude: 0, label: "Xuân phân" },
  { longitude: 45, label: "Lập hạ" },
  { longitude: 90, label: "Hạ chí" },
  { longitude: 135, label: "Lập thu" },
  { longitude: 180, label: "Thu phân" },
  { longitude: 225, label: "Lập đông" },
  { longitude: 270, label: "Đông chí" },
];

function normalizeDegrees(value: number) {
  return ((value % 360) + 360) % 360;
}

function solarTermStartsOnDate(date: Date, longitude: number) {
  const start = solarLongitudeDegreesAtVietnamMidnight(date);
  const end = solarLongitudeDegreesAtVietnamMidnight(addDays(date, 1));
  const daySpan = normalizeDegrees(end - start);
  const targetOffset = normalizeDegrees(longitude - start);
  return targetOffset <= daySpan;
}

function isVietnameseLunarNewYearEve(date: Date, lunar: LunarDate) {
  if (lunar.isLeap || lunar.month !== 12) {
    return false;
  }

  const tomorrow = solarToLunar(addDays(date, 1));
  return !tomorrow.isLeap && tomorrow.month === 1 && tomorrow.day === 1 && tomorrow.year === lunar.year + 1;
}

export function getHolidays(date: Date, lunar: LunarDate, country: CountryCode): Holiday[] {
  const solarMatches = solarRules.filter(
    (rule) => rule.country === country && rule.month === date.getMonth() + 1 && rule.day === date.getDate(),
  );
  const lunarMatches = lunarRules.filter(
    (rule) => rule.country === country && rule.month === lunar.month && rule.day === lunar.day && !lunar.isLeap,
  );
  const solarTermMatches: SolarRule[] =
    country === "VN"
      ? vietnameseSeasonTerms
          .filter((term) => solarTermStartsOnDate(date, term.longitude))
          .map((term) => ({
            country: "VN",
            month: date.getMonth() + 1,
            day: date.getDate(),
            label: term.label,
            type: "observance",
          }))
      : [];
  const tetEveMatches: LunarRule[] =
    country === "VN" && isVietnameseLunarNewYearEve(date, lunar)
      ? [{ country: "VN", month: lunar.month, day: lunar.day, label: "Tết Nguyên đán" }]
      : [];

  return [...solarMatches, ...solarTermMatches, ...lunarMatches, ...tetEveMatches].map((rule) => ({
    id: `${rule.country}-${rule.label}-${rule.month}-${rule.day}`,
    label: rule.label,
    country: rule.country,
    type: rule.type ?? "public",
  }));
}
