export function get_key_h(time: number, movesCount: number): string {
  return String(time + movesCount * import.meta.env.VITE_GAME_KEY);
}
