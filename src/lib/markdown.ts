import TurndownService from "turndown";
// Clean markdown from an essay's sanitised HTML (for llms-full.txt).
const td = new TurndownService({ headingStyle: "atx", bulletListMarker: "-", codeBlockStyle: "fenced", emDelimiter: "*" });
// Keep citation brackets like [1] readable (Turndown escapes them by default).
td.escape = (t: string) => t.replace(/^(\s*)([-+*]|\d+\.)(\s)/gm, "$1\\$2$3").replace(/^(\s*)#/gm, "$1\\#");
td.remove(["figure", "picture", "img", "source"] as any);
td.addRule("plainLinks", {
  filter: (n: any) => n.nodeName === "A" && !n.getAttribute("href"),
  replacement: (c: string) => c,
});
export const toMarkdown = (html = "") =>
  td.turndown(html).replace(/\n{3,}/g, "\n\n").replace(/[ \t]+\n/g, "\n").trim();
// Shift markdown headings down so the essay title can be "##" in a combined file.
export const demote = (md: string, by = 1) => md.replace(/^(#{1,5}) /gm, (m, h) => "#".repeat(Math.min(6, h.length + by)) + " ");
