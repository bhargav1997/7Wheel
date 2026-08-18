/**
 * Helper to safely format credit values cleanly (rounds floating point inaccuracies like 25.149999999999977 to 25.15)
 */
export const formatCredits = (val) => {
  const num = Number(val) || 0;
  const rounded = Math.round(num * 100) / 100;
  if (Math.abs(rounded - Math.round(rounded)) < 0.001) {
    return Math.round(rounded).toLocaleString();
  }
  return rounded.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};
