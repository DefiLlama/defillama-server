import dayjs from "dayjs";

export function readableToSeconds(readableDate: string): number {
  // format YYYY-MM-DDTHH:mm:ss.sssZ
  const date = new Date(readableDate);
  return Math.floor(date.getTime() / 1000);
}

export function secondsToReadable(
  datetime: number,
  format: string = "DD MM YYYY",
  locale: string = "en-US",
): string {
  return dayjs(datetime).locale(locale).format(format);
}
export function secondsDifference(end: Date, start = new Date()): number {
  const date1 = dayjs(end).startOf("day");
  const date2 = dayjs(start).startOf("day");
  return date1.diff(date2, "second");
}
export const periodToSeconds = {
  year: 31556926,
  month: 2629743,
  week: 604800,
  day: 86400,
  hour: 3600,
  minute: 60,
};
export function parseDateString(inputDate: string): number {
  const year = inputDate.substring(6, 10);
  const month = inputDate.substring(3, 5);
  const day = inputDate.substring(0, 2);
  return Math.floor(
    new Date(`${year}-${month}-${day}T00:00:00`).getTime() / 1000,
  );
}
