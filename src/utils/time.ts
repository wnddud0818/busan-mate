import { addMinutes, format, parseISO } from "date-fns";

export const createIsoDate = (baseDate: string, hour: number, minute: number) => {
  const date = parseISO(`${baseDate}T00:00:00.000Z`);
  return format(addMinutes(date, hour * 60 + minute), "yyyy-MM-dd'T'HH:mm:ssxxx");
};

export const clockLabel = (iso: string) => format(parseISO(iso), "HH:mm");
