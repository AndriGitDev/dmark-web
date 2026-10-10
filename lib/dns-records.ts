import { Resolver } from "node:dns/promises";
import { lookupAuthenticationRecords } from "./authentication-records";

export async function checkAuthenticationRecords(domain: string, selector: string) {
  const resolver = new Resolver({ timeout: 1500, tries: 1 });
  // A hard deadline also bounds CNAME resolution and cancels outstanding queries.
  const timer = setTimeout(() => resolver.cancel(), 4000);
  try { return await lookupAuthenticationRecords(domain, selector, name => resolver.resolveTxt(name)); }
  finally { clearTimeout(timer); }
}
