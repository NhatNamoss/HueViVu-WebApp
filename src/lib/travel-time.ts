export function estimateTravelMinutes(distanceKm: number) {
  const movingMinutes = distanceKm < 2
    ? distanceKm / 4.5 * 60
    : distanceKm / 25 * 60;
  return Math.ceil(movingMinutes + 8);
}
