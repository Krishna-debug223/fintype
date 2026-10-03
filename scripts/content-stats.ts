import {
  CONTENT_POOLS,
  CONTENT_VERSION,
  getContentStats,
  getModeWords,
} from "@/content";

const stats = getContentStats();
console.log(`FinType content v${CONTENT_VERSION}`);
for (const [mode, pool] of Object.entries(CONTENT_POOLS))
  console.log(`${mode}: ${pool.length}`);
console.log(`tickers: ${stats.tickers}`);
console.log(`mixed: ${stats.mixed}`);
for (const mode of ["terms", "office", "numbers", "excel", "mixed"] as const) {
  let repeats = 0;
  let total = 0;
  for (let seed = 0; seed < 100; seed += 1) {
    const items = getModeWords(mode, 120, `stats-${seed}`);
    total += items.length;
    repeats += items.length - new Set(items).size;
  }
  console.log(
    `${mode} average repeat rate: ${((repeats / Math.max(1, total)) * 100).toFixed(2)}%`,
  );
}
