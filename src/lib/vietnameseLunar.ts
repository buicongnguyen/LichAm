import type { LunarDate } from "../types";

const TIME_ZONE = 7;

function int(value: number) {
  return Math.floor(value);
}

function jdFromDate(day: number, month: number, year: number) {
  const a = int((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  let jd = day + int((153 * m + 2) / 5) + 365 * y + int(y / 4) - int(y / 100) + int(y / 400) - 32045;

  if (jd < 2299161) {
    jd = day + int((153 * m + 2) / 5) + 365 * y + int(y / 4) - 32083;
  }

  return jd;
}

function jdToDate(jd: number) {
  let a: number;
  let b: number;
  let c: number;

  if (jd > 2299160) {
    a = jd + 32044;
    b = int((4 * a + 3) / 146097);
    c = a - int((b * 146097) / 4);
  } else {
    b = 0;
    c = jd + 32082;
  }

  const d = int((4 * c + 3) / 1461);
  const e = c - int((1461 * d) / 4);
  const m = int((5 * e + 2) / 153);
  const day = e - int((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * int(m / 10);
  const year = b * 100 + d - 4800 + int(m / 10);
  return { day, month, year };
}

function newMoon(k: number) {
  const t = k / 1236.85;
  const t2 = t * t;
  const t3 = t2 * t;
  const dr = Math.PI / 180;
  let jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * t2 - 0.000000155 * t3;
  jd1 += 0.00033 * Math.sin((166.56 + 132.87 * t - 0.009173 * t2) * dr);
  const m = 359.2242 + 29.10535608 * k - 0.0000333 * t2 - 0.00000347 * t3;
  const mpr = 306.0253 + 385.81691806 * k + 0.0107306 * t2 + 0.00001236 * t3;
  const f = 21.2964 + 390.67050646 * k - 0.0016528 * t2 - 0.00000239 * t3;
  let c1 = (0.1734 - 0.000393 * t) * Math.sin(m * dr) + 0.0021 * Math.sin(2 * dr * m);
  c1 -= 0.4068 * Math.sin(mpr * dr) + 0.0161 * Math.sin(2 * dr * mpr);
  c1 -= 0.0004 * Math.sin(3 * dr * mpr);
  c1 += 0.0104 * Math.sin(2 * dr * f) - 0.0051 * Math.sin((m + mpr) * dr);
  c1 -= 0.0074 * Math.sin((m - mpr) * dr) + 0.0004 * Math.sin((2 * f + m) * dr);
  c1 -= 0.0004 * Math.sin((2 * f - m) * dr) - 0.0006 * Math.sin((2 * f + mpr) * dr);
  c1 += 0.001 * Math.sin((2 * f - mpr) * dr) + 0.0005 * Math.sin((2 * mpr + m) * dr);

  let deltaT: number;
  if (t < -11) {
    deltaT = 0.001 + 0.000839 * t + 0.0002261 * t2 - 0.00000845 * t3 - 0.000000081 * t * t3;
  } else {
    deltaT = -0.000278 + 0.000265 * t + 0.000262 * t2;
  }

  return jd1 + c1 - deltaT;
}

function sunLongitude(jdn: number) {
  const t = (jdn - 2451545.0) / 36525;
  const t2 = t * t;
  const dr = Math.PI / 180;
  const m = 357.5291 + 35999.0503 * t - 0.0001559 * t2 - 0.00000048 * t * t2;
  const l0 = 280.46645 + 36000.76983 * t + 0.0003032 * t2;
  let dl = (1.9146 - 0.004817 * t - 0.000014 * t2) * Math.sin(dr * m);
  dl += (0.019993 - 0.000101 * t) * Math.sin(2 * dr * m) + 0.00029 * Math.sin(3 * dr * m);
  let l = l0 + dl;
  l *= dr;
  l -= Math.PI * 2 * int(l / (Math.PI * 2));
  return l;
}

function getNewMoonDay(k: number, timeZone: number) {
  return int(newMoon(k) + 0.5 + timeZone / 24);
}

function getSunLongitude(dayNumber: number, timeZone: number) {
  return int((sunLongitude(dayNumber - 0.5 - timeZone / 24) / Math.PI) * 6);
}

function getLunarMonth11(year: number, timeZone: number) {
  const off = jdFromDate(31, 12, year) - 2415021;
  const k = int(off / 29.530588853);
  let nm = getNewMoonDay(k, timeZone);
  const sunLong = getSunLongitude(nm, timeZone);
  if (sunLong >= 9) {
    nm = getNewMoonDay(k - 1, timeZone);
  }
  return nm;
}

function getLeapMonthOffset(a11: number, timeZone: number) {
  const k = int((a11 - 2415021.076998695) / 29.530588853 + 0.5);
  let last = 0;
  let i = 1;
  let arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);

  do {
    last = arc;
    i += 1;
    arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
  } while (arc !== last && i < 14);

  return i - 1;
}

export function solarToLunar(date: Date): LunarDate {
  const dayNumber = jdFromDate(date.getDate(), date.getMonth() + 1, date.getFullYear());
  const k = int((dayNumber - 2415021.076998695) / 29.530588853);
  let monthStart = getNewMoonDay(k + 1, TIME_ZONE);

  if (monthStart > dayNumber) {
    monthStart = getNewMoonDay(k, TIME_ZONE);
  }

  let a11 = getLunarMonth11(date.getFullYear(), TIME_ZONE);
  let b11 = a11;
  let lunarYear: number;

  if (a11 >= monthStart) {
    lunarYear = date.getFullYear();
    a11 = getLunarMonth11(date.getFullYear() - 1, TIME_ZONE);
  } else {
    lunarYear = date.getFullYear() + 1;
    b11 = getLunarMonth11(date.getFullYear() + 1, TIME_ZONE);
  }

  const lunarDay = dayNumber - monthStart + 1;
  const diff = int((monthStart - a11) / 29);
  let lunarLeap = false;
  let lunarMonth = diff + 11;

  if (b11 - a11 > 365) {
    const leapMonthDiff = getLeapMonthOffset(a11, TIME_ZONE);
    if (diff >= leapMonthDiff) {
      lunarMonth = diff + 10;
      if (diff === leapMonthDiff) {
        lunarLeap = true;
      }
    }
  }

  if (lunarMonth > 12) {
    lunarMonth -= 12;
  }

  if (lunarMonth >= 11 && diff < 4) {
    lunarYear -= 1;
  }

  return {
    day: lunarDay,
    month: lunarMonth,
    year: lunarYear,
    isLeap: lunarLeap,
  };
}

export function solarLongitudeDegreesAtVietnamMidnight(date: Date) {
  const dayNumber = jdFromDate(date.getDate(), date.getMonth() + 1, date.getFullYear());
  return (sunLongitude(dayNumber - 0.5 - TIME_ZONE / 24) * 180) / Math.PI;
}

export function lunarToSolar(lunarDay: number, lunarMonth: number, lunarYear: number, isLeap: boolean) {
  let a11: number;
  let b11: number;

  if (lunarMonth < 11) {
    a11 = getLunarMonth11(lunarYear - 1, TIME_ZONE);
    b11 = getLunarMonth11(lunarYear, TIME_ZONE);
  } else {
    a11 = getLunarMonth11(lunarYear, TIME_ZONE);
    b11 = getLunarMonth11(lunarYear + 1, TIME_ZONE);
  }

  let off = lunarMonth - 11;
  if (off < 0) {
    off += 12;
  }

  if (b11 - a11 > 365) {
    const leapOff = getLeapMonthOffset(a11, TIME_ZONE);
    let leapMonth = leapOff - 2;
    if (leapMonth < 0) {
      leapMonth += 12;
    }

    if (isLeap && lunarMonth !== leapMonth) {
      return null;
    }

    if (isLeap || off >= leapOff) {
      off += 1;
    }
  }

  const k = int(0.5 + (a11 - 2415021.076998695) / 29.530588853);
  const monthStart = getNewMoonDay(k + off, TIME_ZONE);
  const solar = jdToDate(monthStart + lunarDay - 1);
  return new Date(solar.year, solar.month - 1, solar.day);
}
