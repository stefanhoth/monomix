import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (p: string) => readFileSync(resolve(root, p), "utf8");

describe("SEO / agent-discovery assets", () => {
  const html = read("index.html");

  it("index.html carries title, description, canonical, OG and Twitter tags", () => {
    expect(html).toMatch(/<title>[^<]{10,}<\/title>/);
    expect(html).toMatch(/name="description"/);
    expect(html).toMatch(/rel="canonical" href="https:\/\/[^"]+\/"/);
    expect(html).toMatch(/property="og:image"\s+content="https:\/\//);
    expect(html).toMatch(/name="twitter:card"/);
  });

  it("index.html JSON-LD parses as a WebApplication", () => {
    const m = html.match(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
    );
    expect(m).not.toBeNull();
    const data = JSON.parse(m![1]!);
    expect(data["@type"]).toBe("WebApplication");
    expect(data.name).toBe("MonoMix");
  });

  it("static discovery files exist and reference each other", () => {
    for (const f of ["robots.txt", "sitemap.xml", "llms.txt"]) {
      expect(existsSync(resolve(root, "public", f))).toBe(true);
    }
    expect(read("public/robots.txt")).toContain("Sitemap: https://");
    expect(read("public/sitemap.xml")).toContain("<loc>https://");
    expect(read("public/llms.txt")).toMatch(/^# MonoMix\n\n> /);
  });
});
