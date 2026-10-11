import { Resolver } from "node:dns/promises";
import { flattenSpf } from "./spf-flatten";

export async function generateFlattenedSpf(domain: string) {
  const resolver = new Resolver({ timeout: 1500, tries: 1 });
  const timer = setTimeout(() => resolver.cancel(), 12000);
  try {
    return await flattenSpf(domain, (name) => resolver.resolveTxt(name));
  } finally {
    clearTimeout(timer);
  }
}
