import type { LunarDate } from "../types";
import { julianDayFromDate, solarLongitudeDegreesAtVietnamMidnight } from "./vietnameseLunar";

export const heavenlyStems = ["Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ", "Canh", "Tân", "Nhâm", "Quý"];
export const earthlyBranches = ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"];

const lunarMonthNames = [
  "Giêng",
  "Hai",
  "Ba",
  "Tư",
  "Năm",
  "Sáu",
  "Bảy",
  "Tám",
  "Chín",
  "Mười",
  "Mười Một",
  "Chạp",
];

const hourRanges = [
  "23-1",
  "1-3",
  "3-5",
  "5-7",
  "7-9",
  "9-11",
  "11-13",
  "13-15",
  "15-17",
  "17-19",
  "19-21",
  "21-23",
];

const goodHourPatterns = ["110100101100", "001101001011", "110011010010", "101100110100", "001011001101", "010010110011"];

export const solarTerms24 = [
  { longitude: 0, label: "Xuân phân" },
  { longitude: 15, label: "Thanh minh" },
  { longitude: 30, label: "Cốc vũ" },
  { longitude: 45, label: "Lập hạ" },
  { longitude: 60, label: "Tiểu mãn" },
  { longitude: 75, label: "Mang chủng" },
  { longitude: 90, label: "Hạ chí" },
  { longitude: 105, label: "Tiểu thử" },
  { longitude: 120, label: "Đại thử" },
  { longitude: 135, label: "Lập thu" },
  { longitude: 150, label: "Xử thử" },
  { longitude: 165, label: "Bạch lộ" },
  { longitude: 180, label: "Thu phân" },
  { longitude: 195, label: "Hàn lộ" },
  { longitude: 210, label: "Sương giáng" },
  { longitude: 225, label: "Lập đông" },
  { longitude: 240, label: "Tiểu tuyết" },
  { longitude: 255, label: "Đại tuyết" },
  { longitude: 270, label: "Đông chí" },
  { longitude: 285, label: "Tiểu hàn" },
  { longitude: 300, label: "Đại hàn" },
  { longitude: 315, label: "Lập xuân" },
  { longitude: 330, label: "Vũ thủy" },
  { longitude: 345, label: "Kinh trập" },
];

function positiveModulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

function stemBranch(stemIndex: number, branchIndex: number) {
  return `${heavenlyStems[positiveModulo(stemIndex, 10)]} ${earthlyBranches[positiveModulo(branchIndex, 12)]}`;
}

export function lunarMonthName(month: number) {
  return lunarMonthNames[month - 1] ?? String(month);
}

export function getYearCanChi(lunarYear: number) {
  return stemBranch(lunarYear + 6, lunarYear + 8);
}

export function getMonthCanChi(lunar: LunarDate) {
  const yearStemIndex = positiveModulo(lunar.year + 6, 10);
  const firstMonthStemByYearStem = [2, 4, 6, 8, 0, 2, 4, 6, 8, 0];
  const stemIndex = firstMonthStemByYearStem[yearStemIndex] + lunar.month - 1;
  const branchIndex = lunar.month + 1;
  return `${stemBranch(stemIndex, branchIndex)}${lunar.isLeap ? " nhuận" : ""}`;
}

export function getDayCanChi(date: Date) {
  const jd = julianDayFromDate(date);
  return {
    label: stemBranch(jd + 9, jd + 1),
    stemIndex: positiveModulo(jd + 9, 10),
    branchIndex: positiveModulo(jd + 1, 12),
  };
}

export function getHourBranchIndex(hour: number) {
  return positiveModulo(Math.floor((hour + 1) / 2), 12);
}

export function getHourCanChi(dayStemIndex: number, hour: number) {
  const firstHourStemByDayStem = [0, 2, 4, 6, 8, 0, 2, 4, 6, 8];
  const branchIndex = getHourBranchIndex(hour);
  return stemBranch(firstHourStemByDayStem[dayStemIndex] + branchIndex, branchIndex);
}

export function getGoodHours(dayBranchIndex: number) {
  const pattern = goodHourPatterns[positiveModulo(dayBranchIndex, 6)];

  return earthlyBranches
    .map((branch, index) => ({
      branch,
      range: hourRanges[index],
      label: `${branch} (${hourRanges[index]})`,
      isGood: pattern[index] === "1",
    }))
    .filter((item) => item.isGood);
}

export function getSolarTerm(date: Date) {
  const longitude = positiveModulo(solarLongitudeDegreesAtVietnamMidnight(date), 360);
  const termIndex = Math.floor(longitude / 15);
  return solarTerms24[termIndex];
}
