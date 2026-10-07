import { test } from "vitest";
import { buildPlan } from "@/lib/builder";
import { BANK } from "@/lib/content";
test("x", () => {
  const miss = new Map<string, string>();
  for (let k = 0; k < 200; k++) for (const i of buildPlan([], ["i:sante","i:art","i:histoire","i:actualite","i:medecine","i:sciences","i:nature","i:cuisine","i:sport","i:litterature","i:technologie","i:geographie"], 3).items) {
    const all = i.options.length && i.options.every((o) => o.image);
    if (!i.image && !all && i.mode !== "nommer") miss.set(i.id, i.audio);
  }
  console.log("MISS", miss.size, [...miss].slice(0, 40).join("\n"));
});
