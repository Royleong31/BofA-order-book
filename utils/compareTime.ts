// a is greater/same/less than b
export const compareTime = (a: string, b: string): boolean => {
  const aHour = a.slice(0, 2);
  const aMinute = a.slice(3, 5);
  const aSecond = a.slice(6, 8);
  const aMillisecond = a.slice(9, 12);

  const bHour = a.slice(0, 2);
  const bMinute = b.slice(3, 5);
  const bSecond = b.slice(6, 8);
  const bMillisecond = b.slice(9, 10);

  if (aHour > bHour) {
    return true;
  }

  if (aMinute > bMinute) {
    return true;
  }
  if (aSecond > bSecond) {
    return true;
  }
  if (aMillisecond > bMillisecond) {
    return true;
  }
  return false;
};
