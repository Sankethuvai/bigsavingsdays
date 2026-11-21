// Lets the unit tests import application TypeScript modules that use extensionless
// relative imports (the style Next.js expects). Node's type stripping handles the syntax;
// this hook only adds the missing `.ts` suffix.
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { url: "data:text/javascript,export default {};", format: "module", shortCircuit: true };
    }
    if (specifier === "next/headers") {
      return { url: "data:text/javascript,export const headers = async () => new Map();", format: "module", shortCircuit: true };
    }
    if (specifier === "next/server") {
      return { url: "data:text/javascript,export class NextResponse { static json(d, o) { return { data: d, ...o }; } };", format: "module", shortCircuit: true };
    }
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      const relative = specifier.startsWith("./") || specifier.startsWith("../");
      const hasExtension = /\.[a-z0-9]+$/i.test(specifier);
      if (relative && !hasExtension) {
        return nextResolve(`${specifier}.ts`, context);
      }
      throw error;
    }
  },
});
