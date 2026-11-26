/**
 * PawsCura Local-Time Operating Hours Evaluator
 *
 * Evaluates veterinary clinic open/closed status using the device's local clock
 * and timezone (Date.getDay(), Date.getHours(), Date.getMinutes()) rather than UTC,
 * supporting:
 *  - 24/7 / 24-hour clinics
 *  - Admin structured schedules (startDay..endDay, openTime..closeTime, closedDaysList)
 *  - Optional secondary/weekend schedules (secondaryStartDay..secondaryCloseTime)
 *  - Freeform operating hours strings ("Mon - Sat (8:00 AM – 5:00 PM)", "20:00 - 02:00", etc.)
 *  - Overnight schedules that cross midnight (e.g., 8:00 PM - 2:00 AM)
 */

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const DAY_ALIASES = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  weds: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
};

function normalizeDayIndex(dayStr) {
  if (typeof dayStr === 'number' && dayStr >= 0 && dayStr <= 6) return dayStr;
  if (!dayStr) return null;
  const key = String(dayStr).trim().toLowerCase().replace(/[^a-z]/g, '');
  return DAY_ALIASES[key] !== undefined ? DAY_ALIASES[key] : null;
}

/**
 * Parses a time string ("08:00", "8:00 AM", "5:30 PM", "17:00", "8am", "12pm")
 * into minutes since midnight (0..1439). Returns null if unparseable.
 */
export function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  const s = String(timeStr).trim().toLowerCase();
  const match = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return null;

  let hour = parseInt(match[1], 10);
  const minute = match[2] ? parseInt(match[2], 10) : 0;
  const meridiem = match[3] ? match[3].toLowerCase() : null;

  if (isNaN(hour) || isNaN(minute) || minute < 0 || minute > 59) return null;

  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
    if (meridiem === 'pm') {
      if (hour <= 11) hour += 12;
    } else if (meridiem === 'am') {
      if (hour === 12) hour = 0;
    }
  }

  if (hour === 24 && minute === 0) return 1440;
  if (hour < 0 || hour > 23) return null;
  return hour * 60 + minute;
}

function getDaySetFromRange(startIdx, endIdx, closedSet = new Set()) {
  const active = new Set();
  if (startIdx === null) return active;
  const effectiveEnd = endIdx === null ? startIdx : endIdx;

  let cur = startIdx;
  for (let steps = 0; steps < 7; steps++) {
    if (!closedSet.has(cur)) active.add(cur);
    if (cur === effectiveEnd) break;
    cur = (cur + 1) % 7;
  }
  return active;
}

function checkScheduleWindow(activeDays, openMins, closeMins, now) {
  if (openMins === null || closeMins === null || !activeDays || activeDays.size === 0) {
    return null;
  }

  const today = now.getDay(); // Local day of week (0 = Sunday .. 6 = Saturday)
  const yesterday = (today + 6) % 7;
  const nowMins = now.getHours() * 60 + now.getMinutes(); // Local minutes since midnight

  // Same open & close time (e.g., 00:00 - 24:00 or 08:00 - 08:00) on an active day means 24h
  if (openMins === closeMins || (openMins === 0 && closeMins === 1440)) {
    return activeDays.has(today);
  }

  if (closeMins > openMins) {
    // Standard daytime window
    return activeDays.has(today) && nowMins >= openMins && nowMins < closeMins;
  }

  // Overnight / crosses midnight (e.g., 20:00 - 02:00)
  if (activeDays.has(today) && nowMins >= openMins) return true;
  if (activeDays.has(yesterday) && nowMins < closeMins) return true;
  return false;
}

function parseDaysExpression(text) {
  const s = String(text || '').toLowerCase();
  if (!s) return new Set([0, 1, 2, 3, 4, 5, 6]);

  if (/\bevery\s*day\b|\bdaily\b|\b24\s*\/\s*7\b|\ball\s*days\b/.test(s)) {
    const days = new Set([0, 1, 2, 3, 4, 5, 6]);
    applyClosedMatches(s, days);
    return days;
  }

  // Extract explicit "(Closed ...)" exclusions first
  const closedSet = new Set();
  applyClosedMatches(s, null, closedSet);
  const cleaned = s.replace(/\(?\s*closed[^)]*\)?/gi, ' ');

  const activeDays = new Set();

  // Check day ranges like "monday to friday", "mon - sat", "fri-sun"
  const rangeRe = /\b(sun(?:day)?|mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:rs?(?:day)?)?|fri(?:day)?|sat(?:urday)?)\s*(?:to|-|–|—|thru|through)\s*(sun(?:day)?|mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:rs?(?:day)?)?|fri(?:day)?|sat(?:urday)?)\b/gi;
  let match;
  while ((match = rangeRe.exec(cleaned)) !== null) {
    const startIdx = normalizeDayIndex(match[1]);
    const endIdx = normalizeDayIndex(match[2]);
    if (startIdx !== null && endIdx !== null) {
      const rangeDays = getDaySetFromRange(startIdx, endIdx, closedSet);
      rangeDays.forEach((d) => activeDays.add(d));
    }
  }

  // Also capture standalone day names (e.g. "Saturday", "Mon, Wed, Fri")
  const singleRe = /\b(sun(?:day)?|mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:rs?(?:day)?)?|fri(?:day)?|sat(?:urday)?)\b/gi;
  while ((match = singleRe.exec(cleaned)) !== null) {
    const idx = normalizeDayIndex(match[1]);
    if (idx !== null && !closedSet.has(idx)) {
      activeDays.add(idx);
    }
  }

  if (activeDays.size === 0) {
    const fallback = new Set([0, 1, 2, 3, 4, 5, 6]);
    closedSet.forEach((d) => fallback.delete(d));
    return fallback;
  }

  return activeDays;
}

function applyClosedMatches(text, targetSet, closedOutSet) {
  const closedMatch = text.match(/closed\s+([^()]+)/i);
  if (!closedMatch) return;
  const singleRe = /\b(sun(?:day)?|mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:rs?(?:day)?)?|fri(?:day)?|sat(?:urday)?)\b/gi;
  let m;
  while ((m = singleRe.exec(closedMatch[1])) !== null) {
    const idx = normalizeDayIndex(m[1]);
    if (idx !== null) {
      if (targetSet) targetSet.delete(idx);
      if (closedOutSet) closedOutSet.add(idx);
    }
  }
}

function evaluateSegmentString(segment, defaultDays, now) {
  const s = String(segment || '').trim();
  if (!s) return null;

  if (/\b24\s*hours?\b|\b24\s*\/\s*7\b|\bopen\s*24\b/i.test(s)) {
    return true;
  }
  if (/^\s*closed\b/i.test(s)) {
    return false;
  }

  const timeRangeMatch = s.match(
    /(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:-|–|—|to)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i
  );
  if (!timeRangeMatch) return null;

  const openMins = parseTimeToMinutes(timeRangeMatch[1]);
  const closeMins = parseTimeToMinutes(timeRangeMatch[2]);
  if (openMins === null || closeMins === null) return null;

  // Determine which days apply to this segment
  const beforeTime = s.slice(0, timeRangeMatch.index).trim();
  const hasExplicitDays = /\b(sun|mon|tue|wed|thu|fri|sat|every\s*day|daily)/i.test(s);
  const daysSet = hasExplicitDays
    ? parseDaysExpression(beforeTime || s)
    : defaultDays || new Set([0, 1, 2, 3, 4, 5, 6]);

  return checkScheduleWindow(daysSet, openMins, closeMins, now);
}

/**
 * Evaluates whether a clinic is open RIGHT NOW according to the phone's local timezone.
 *
 * @param {object} clinicData - Raw Firestore or formatted clinic object
 * @param {Date} [now=new Date()] - Current local Date (overrideable for unit tests)
 * @returns {boolean}
 */
export function isClinicOpenNow(clinicData = {}, now = new Date()) {
  if (!clinicData || typeof clinicData !== 'object') return false;

  // 1. Structured Admin Portal fields (highest precision)
  if (clinicData.startDay && (clinicData.openTime || clinicData.closeTime)) {
    const closedSet = new Set(
      (Array.isArray(clinicData.closedDaysList) ? clinicData.closedDaysList : [])
        .map(normalizeDayIndex)
        .filter((d) => d !== null)
    );
    const primaryDays = getDaySetFromRange(
      normalizeDayIndex(clinicData.startDay),
      normalizeDayIndex(clinicData.endDay || clinicData.startDay),
      closedSet
    );
    const openMins = parseTimeToMinutes(clinicData.openTime);
    const closeMins = parseTimeToMinutes(clinicData.closeTime);
    const primaryRes = checkScheduleWindow(primaryDays, openMins, closeMins, now);

    let secondaryRes = null;
    if (
      clinicData.hasSecondarySchedule &&
      clinicData.secondaryStartDay &&
      clinicData.secondaryOpenTime &&
      clinicData.secondaryCloseTime
    ) {
      const secDays = getDaySetFromRange(
        normalizeDayIndex(clinicData.secondaryStartDay),
        normalizeDayIndex(clinicData.secondaryEndDay || clinicData.secondaryStartDay)
      );
      const secOpen = parseTimeToMinutes(clinicData.secondaryOpenTime);
      const secClose = parseTimeToMinutes(clinicData.secondaryCloseTime);
      secondaryRes = checkScheduleWindow(secDays, secOpen, secClose, now);
    }

    if (primaryRes === true || secondaryRes === true) return true;
    if (primaryRes !== null || secondaryRes !== null) return false;
  }

  // 2. Freeform hours / operatingHours / openDays strings
  const hoursRaw = String(
    clinicData.hours || clinicData.openingHours || clinicData.operatingHours || ''
  ).trim();
  const openDaysRaw = String(clinicData.openDays || clinicData.days || '').trim();
  const defaultDays = openDaysRaw ? parseDaysExpression(openDaysRaw) : new Set([0, 1, 2, 3, 4, 5, 6]);

  if (hoursRaw) {
    // Mask parenthesized expressions like "(Closed Sun, Wed)" while splitting multi-schedule strings
    const parens = [];
    const masked = hoursRaw.replace(/\([^)]*\)/g, (m) => {
      parens.push(m);
      return `__PAREN_${parens.length - 1}__`;
    });
    const rawSegments = masked
      .split(/\s*[;\n|]\s*|\s*,\s*(?=(?:sun|mon|tue|wed|thu|fri|sat|closed|daily|every|24)\b)/i)
      .filter(Boolean);
    const segments = rawSegments.map((seg) =>
      seg.replace(/__PAREN_(\d+)__/g, (_, i) => parens[Number(i)] || '')
    );

    let sawParseable = false;
    for (const seg of segments) {
      const res = evaluateSegmentString(seg, defaultDays, now);
      if (res === true) return true;
      if (res === false) sawParseable = true;
    }
    if (sawParseable) return false;
  }

  // 3. Schedule array ([{ days, hours }])
  if (Array.isArray(clinicData.schedule) && clinicData.schedule.length > 0) {
    let sawParseable = false;
    for (const entry of clinicData.schedule) {
      const combined = `${entry?.days || ''} ${entry?.hours || ''}`.trim();
      const res = evaluateSegmentString(combined, defaultDays, now);
      if (res === true) return true;
      if (res === false) sawParseable = true;
    }
    if (sawParseable) return false;
  }

  // 4. Never assume missing or malformed schedules are open
  return false;
}
