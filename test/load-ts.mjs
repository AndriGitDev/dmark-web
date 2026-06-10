import { createHmac, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

export const root = dirname(dirname(fileURLToPath(import.meta.url)));

// Minimal NextResponse stand-in for exercising route handlers outside Next.
const nextServerShim = {
  NextResponse: {
    json(body, init = {}) {
      return new Response(JSON.stringify(body), {
        status: init.status || 200,
        headers: { "content-type": "application/json", ...(init.headers || {}) },
      });
    },
    redirect(url, init = {}) {
      const response = new Response(null, {
        status: typeof init === "number" ? init : init.status || 307,
        headers: { location: String(url) },
      });
      return Object.assign(response, { cookies: { set() {}, delete() {} } });
    },
  },
  NextRequest: class {},
};

export function loadTSModule(relativePath, extraRequire = {}) {
  const filename = join(root, relativePath);
  const source = readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename,
  });
  const cjsModule = { exports: {} };
  const sandbox = {
    AbortController,
    Buffer,
    DOMException,
    Error,
    Headers,
    Intl,
    Response,
    URL,
    URLSearchParams,
    clearTimeout,
    console,
    exports: cjsModule.exports,
    fetch,
    module: cjsModule,
    process,
    require: (specifier) => {
      if (specifier in extraRequire) return extraRequire[specifier];
      if (specifier === "server-only") return {};
      if (specifier === "node:crypto") return { createHmac, timingSafeEqual };
      if (specifier === "next/server") return nextServerShim;
      if (specifier === "./authentik-access") return loadTSModule("lib/authentik-access.ts");
      if (specifier === "@/lib/dashboard-access") return loadTSModule("lib/dashboard-access.ts");
      if (specifier === "@/lib/dashboard-authentik-access") return loadTSModule("lib/dashboard-authentik-access.ts");
      if (specifier === "@/lib/dashboard-api") return loadTSModule("lib/dashboard-api.ts");
      if (specifier === "@/lib/dashboard") return loadTSModule("lib/dashboard.ts");
      throw new Error(`Unexpected require: ${specifier}`);
    },
    setTimeout,
  };

  vm.runInNewContext(outputText, sandbox, { filename });
  return cjsModule.exports;
}
