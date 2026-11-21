/**
 * Runs once when a Next.js server instance starts. Used for fail-fast configuration
 * checks and small, bounded startup maintenance. Keep this file dependency-light.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { envProblems, isProduction } = await import("./lib/env");
  const problems = envProblems();
  if (problems.length > 0) {
    const detail = problems.map((p) => `  - ${p.key}: ${p.problem}`).join("\n");
    const message = `BigSavingsDays cannot start with an invalid production configuration:\n${detail}`;
    console.error(message);
    if (isProduction) {
      // Next.js logs instrumentation errors but keeps serving; a production instance
      // with missing secrets must never accept traffic, so fail the process.
      process.exit(1);
    }
    console.warn("Continuing because this is not a production build.");
  }

  const { getDb } = await import("./lib/db");
  const db = getDb();
  const now = Date.now();
  db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(now);
  db.prepare("DELETE FROM rate_limits WHERE reset_at < ?").run(now);
  db.pragma("wal_checkpoint(TRUNCATE)");
}
