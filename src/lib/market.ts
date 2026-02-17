export interface MarketStatus {
  isOpen: boolean;
  nextOpen: Date | null;
  nextClose: Date | null;
  timezone: string;
  reason?: string;
}

export function isMarketHoliday(date: Date): boolean {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  
  const holidays = [
    new Date(year, 0, 1),
    new Date(year, 0, 15),
    new Date(year, 1, 19),
    new Date(year, 4, 27),
    new Date(year, 5, 19),
    new Date(year, 6, 4),
    new Date(year, 8, 2),
    new Date(year, 10, 28),
    new Date(year, 11, 25),
  ];
  
  return holidays.some(
    (h) => h.getFullYear() === year && h.getMonth() === month && h.getDate() === day
  );
}

export function getMarketStatus(now: Date = new Date()): MarketStatus {
  const estTime = new Date(
    now.toLocaleString("en-US", { timeZone: "America/New_York" })
  );
  
  const dayOfWeek = estTime.getDay();
  const hours = estTime.getHours();
  const minutes = estTime.getMinutes();
  const timeInMinutes = hours * 60 + minutes;
  
  const marketOpen = 9 * 60 + 30;
  const marketClose = 16 * 60;
  
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return {
      isOpen: false,
      nextOpen: getNextMarketOpen(estTime),
      nextClose: null,
      timezone: "America/New_York",
      reason: "Weekend",
    };
  }
  
  if (isMarketHoliday(estTime)) {
    return {
      isOpen: false,
      nextOpen: getNextMarketOpen(estTime),
      nextClose: null,
      timezone: "America/New_York",
      reason: "Market Holiday",
    };
  }
  
  if (timeInMinutes >= marketOpen && timeInMinutes < marketClose) {
    const closeTime = new Date(estTime);
    closeTime.setHours(16, 0, 0, 0);
    return {
      isOpen: true,
      nextOpen: null,
      nextClose: closeTime,
      timezone: "America/New_York",
    };
  }
  
  return {
    isOpen: false,
    nextOpen: getNextMarketOpen(estTime),
    nextClose: null,
    timezone: "America/New_York",
    reason: timeInMinutes < marketOpen ? "Pre-market" : "After-hours",
  };
}

function getNextMarketOpen(fromDate: Date): Date {
  const next = new Date(fromDate);
  next.setHours(9, 30, 0, 0);
  
  do {
    next.setDate(next.getDate() + 1);
  } while (next.getDay() === 0 || next.getDay() === 6 || isMarketHoliday(next));
  
  return next;
}

export function formatTimeRemaining(targetDate: Date): string {
  const now = new Date();
  const diff = targetDate.getTime() - now.getTime();
  
  if (diff <= 0) return "Now";
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
