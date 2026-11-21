// Lets the unit tests import application TypeScript modules that use extensionless
// relative imports (the style Next.js expects). Node's type stripping handles the syntax;
// this hook only adds the missing `.ts` suffix.
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
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
