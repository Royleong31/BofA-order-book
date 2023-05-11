// a is greater/same/less than b
export const compareTime = (a: string, b: string): boolean => {
  const aMinute = a.slice(0, 2);
  const aSecond = a.slice(3, 5);
  const aMillisecond = a.slice(6, 7);

  const bMinute = b.slice(0, 2);
  const bSecond = b.slice(3, 5);
  const bMillisecond = b.slice(6, 7);

  if (aMinute > bMinute) return true;
  if (aSecond > bSecond) return true;
  if (aMillisecond > bMillisecond) return true;
  return false;
};
