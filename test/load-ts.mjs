import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

export const root = dirname(dirname(fileURLToPath(import.meta.url)));

export function loadTSModule(relativePath, imports = {}) {
  const filename = join(root, relativePath);
  const source = readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename,
  });
  const cjsModule = { exports: {} };
  const sandbox = {
    console,
    Response, Request, URL, URLSearchParams, TextDecoder, AbortController, AbortSignal, Buffer,
    process: {env: {}},
    fetch: (...args) => imports.fetch(...args),
    exports: cjsModule.exports,
    module: cjsModule,
    require: (specifier) => {
      if (specifier in imports) return imports[specifier];
      throw new Error(`Unexpected require: ${specifier}`);
    },
    setTimeout,
    clearTimeout,
  };

  vm.runInNewContext(outputText, sandbox, { filename });
  return cjsModule.exports;
}


