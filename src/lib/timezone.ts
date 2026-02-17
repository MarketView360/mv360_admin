export interface TimezoneDisplay {
  ist: string;
  est: string;
  pst: string;
  gmt: string;
  utc: string;
  iso: string;
}

export function formatTimezones(isoTimestamp: string | null): TimezoneDisplay | null {
  if (!isoTimestamp) return null;
  
  const date = new Date(isoTimestamp);
  if (isNaN(date.getTime())) return null;

  return {
    ist: new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date) + " IST",
    est: new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date) + " EST",
    pst: new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date) + " PST",
    gmt: new Intl.DateTimeFormat("en-GB", {
      timeZone: "GMT",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date) + " GMT",
    utc: date.toISOString().replace("T", " ").slice(0, 19) + " UTC",
    iso: date.toISOString(),
  };
}

export function localToUTC(localDatetimeString: string): string {
  const date = new Date(localDatetimeString);
  return date.toISOString();
}

export function utcToLocal(utcTimestamp: string | null): string {
  if (!utcTimestamp) return "";
  const date = new Date(utcTimestamp);
  if (isNaN(date.getTime())) return "";
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function formatDateOnly(isoDate: string | null): string {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return "";
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  
  return `${year}-${month}-${day}`;
}

export function formatTimezonesArray(isoTimestamp: string | null): Array<{ zone: string; time: string }> {
  if (!isoTimestamp) return [];
  
  const date = new Date(isoTimestamp);
  if (isNaN(date.getTime())) return [];

  return [
    {
      zone: "IST (India)",
      time: new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date),
    },
    {
      zone: "EST (US East)",
      time: new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date),
    },
    {
      zone: "PST (US West)",
      time: new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Los_Angeles",
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date),
    },
    {
      zone: "GMT",
      time: new Intl.DateTimeFormat("en-GB", {
        timeZone: "GMT",
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date),
    },
    {
      zone: "UTC",
      time: date.toISOString().replace("T", " ").slice(0, 19),
    },
  ];
}
