/**
 * Runs once when a Next.js server instance starts. Used for fail-fast configuration
 * checks and small, bounded startup maintenance. Keep this file dependency-light.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Never run maintenance during the build phase (prevents build-time crashes on Vercel)
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const { envProblems, isProduction } = await import("./lib/env");
  const problems = envProblems();
  if (problems.length > 0) {
    const detail = problems.map((p) => `  - ${p.key}: ${p.problem}`).join("\n");
    const message = `BigSavingsDays configuration note:\n${detail}`;
    console.warn(message);
    // Don't kill process on Vercel or serverless environments
    if (typeof process !== "undefined" && typeof process.exit === "function" && isProduction && !process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
      process.exit(1);
    }
  }

  try {
    const { getDb } = await import("./lib/db");
    const db = getDb();
    const now = Date.now();
    db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(now);
    db.prepare("DELETE FROM rate_limits WHERE reset_at < ?").run(now);
    try {
      db.pragma("wal_checkpoint(TRUNCATE)");
    } catch {
      // Ignore WAL checkpoint errors on tmp or in-memory databases
    }
  } catch (err) {
    console.warn("Startup cleanup skipped:", err);
  }
}
