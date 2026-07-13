// Generates docs/dashboard.html as a self-contained local docs browser.
//
// Usage: node scripts/docs-dashboard.mjs   (or: pnpm docs:dashboard)

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { collectSpecRecords, SpecStatusError } from "./spec-status.mjs";

const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
const DOCS_DIR = join(ROOT_DIR, "docs");
const SPECS_DIR = join(DOCS_DIR, "specs");
const OUTPUT_PATH = join(DOCS_DIR, "dashboard.html");

const htmlIds = new Set();

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#96;");
}

function colorValue(value) {
  const clean = value.trim().replace(/^["']|["']$/g, "");
  return /^(#[0-9a-fA-F]{3,8}|oklch\(\s*[\d.]+\s+[\d.]+\s+[\d.]+[^)]*\)|rgb(a)?\(\s*\d+[^)]*\)|hsl(a)?\(\s*\d+[^)]*\))$/.test(
    clean,
  )
    ? clean
    : null;
}

function renderInlineCode(code) {
  const color = colorValue(code);
  if (!color) return `<code>${escapeHtml(code)}</code>`;

  return `<code class="color-code"><span class="color-swatch" style="background: ${escapeAttr(
    color,
  )}"></span>${escapeHtml(code)}</code>`;
}

function slugify(value) {
  const base = value
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return base || "section";
}

function uniqueId(value) {
  const base = slugify(value);
  let id = base;
  let i = 2;
  while (htmlIds.has(id)) id = `${base}-${i++}`;
  htmlIds.add(id);
  return id;
}

function renderInline(value) {
  const codeTokens = [];
  const tokenized = value.replace(/`([^`]+)`/g, (_, code) => {
    const token = `@@CODE${codeTokens.length}@@`;
    codeTokens.push(renderInlineCode(code));
    return token;
  });

  let out = escapeHtml(tokenized);
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
    return `<a href="${escapeAttr(href)}">${label}</a>`;
  });
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");

  for (let i = 0; i < codeTokens.length; i++) out = out.replace(`@@CODE${i}@@`, codeTokens[i]);
  return out;
}

function renderFrontmatter(raw) {
  const lines = raw.split("\n");
  const summary = [];
  const colors = [];
  let section = null;

  for (const line of lines) {
    const top = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (top) {
      section = top[1];
      if (top[2]) summary.push({ key: top[1], value: top[2].replace(/^["']|["']$/g, "") });
      continue;
    }

    if (section === "colors") {
      const color = line.match(/^\s{2}([a-zA-Z0-9_-]+):\s*(.+)$/);
      if (color) {
        const value = colorValue(color[2]);
        if (value) colors.push({ name: color[1], value });
      }
    }
  }

  return `<section class="frontmatter-card">
    <div class="frontmatter-summary">
      ${summary
        .map(
          (item) =>
            `<div><span>${escapeHtml(item.key)}</span><strong>${renderInline(item.value)}</strong></div>`,
        )
        .join("")}
    </div>
    ${
      colors.length
        ? `<div class="color-grid">${colors
            .map(
              (item) => `<div class="color-chip">
                <span class="color-preview" style="background: ${escapeAttr(item.value)}"></span>
                <span><strong>${escapeHtml(item.name)}</strong><code>${escapeHtml(item.value)}</code></span>
              </div>`,
            )
            .join("")}</div>`
        : ""
    }
  </section>`;
}

function splitTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isTableStart(lines, index) {
  return (
    lines[index]?.includes("|") &&
    /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[index + 1] ?? "")
  );
}

function renderTable(lines) {
  const [headLine, , ...bodyLines] = lines;
  const head = splitTableRow(headLine);
  const body = bodyLines.map(splitTableRow);
  return `<div class="md-table-wrap"><table><thead><tr>${head
    .map((cell) => `<th>${renderInline(cell)}</th>`)
    .join("")}</tr></thead><tbody>${body
    .map((row) => `<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join("")}</tr>`)
    .join("")}</tbody></table></div>`;
}

function startsBlock(line, nextLine = "") {
  return (
    line.trim() === "" ||
    /^```/.test(line) ||
    /^#{1,6}\s+/.test(line) ||
    /^-{3,}\s*$/.test(line.trim()) ||
    /^>\s?/.test(line) ||
    /^\s*- \[[ xX]\]\s+/.test(line) ||
    /^\s*-\s+/.test(line) ||
    /^\s*\d+\.\s+/.test(line) ||
    (line.includes("|") && /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(nextLine))
  );
}

function collectListItems(lines, start, kind) {
  const items = [];
  const patterns = {
    checklist: /^\s*- \[([ xX])\]\s+(.*)$/,
    unordered: /^\s*-\s+(.*)$/,
    ordered: /^\s*\d+\.\s+(.*)$/,
  };
  const pattern = patterns[kind];
  let i = start;

  while (i < lines.length) {
    const match = lines[i].match(pattern);
    if (!match) break;

    const item = {
      checked: kind === "checklist" ? match[1].toLowerCase() === "x" : false,
      text: kind === "checklist" ? match[2] : match[1],
    };
    i++;

    while (
      i < lines.length &&
      /^\s{2,}\S/.test(lines[i]) &&
      !/^\s*(- \[[ xX]\]|- |\d+\.)\s+/.test(lines[i])
    ) {
      item.text += ` ${lines[i].trim()}`;
      i++;
    }

    items.push(item);
  }

  return { items, next: i };
}

function renderList(items, ordered = false, checklist = false) {
  const tag = ordered ? "ol" : "ul";
  const className = checklist ? ' class="task-list"' : "";
  const renderedItems = items
    .map((item) => {
      if (checklist) {
        return `<li><input type="checkbox" disabled${item.checked ? " checked" : ""}> <span>${renderInline(item.text)}</span></li>`;
      }
      return `<li>${renderInline(item.text)}</li>`;
    })
    .join("");
  return `<${tag}${className}>${renderedItems}</${tag}>`;
}

function markdownToHtml(markdown, sourceLabel) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let i = 0;

  if (lines[0]?.trim() === "---") {
    const frontmatter = [];
    i = 1;
    while (i < lines.length && lines[i].trim() !== "---") frontmatter.push(lines[i++]);
    if (i < lines.length) i++;
    out.push(renderFrontmatter(frontmatter.join("\n")));
  }

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === "") {
      i++;
      continue;
    }

    const fence = line.match(/^```([A-Za-z0-9_-]+)?\s*$/);
    if (fence) {
      const lang = fence[1] ? ` data-lang="${escapeAttr(fence[1])}"` : "";
      const code = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) code.push(lines[i++]);
      if (i < lines.length) i++;
      out.push(`<pre${lang}><code>${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }

    if (isTableStart(lines, i)) {
      const tableLines = [lines[i], lines[i + 1]];
      i += 2;
      while (i < lines.length && lines[i].includes("|") && lines[i].trim() !== "")
        tableLines.push(lines[i++]);
      out.push(renderTable(tableLines));
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2].replace(/\s+#+$/, "");
      const id = uniqueId(`${sourceLabel}-${text}`);
      out.push(`<h${level} id="${id}">${renderInline(text)}</h${level}>`);
      i++;
      continue;
    }

    if (/^-{3,}\s*$/.test(trimmed)) {
      out.push("<hr>");
      i++;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote = [];
      while (i < lines.length && /^>\s?/.test(lines[i]))
        quote.push(lines[i++].replace(/^>\s?/, ""));
      out.push(
        `<blockquote>${quote.map((part) => `<p>${renderInline(part)}</p>`).join("")}</blockquote>`,
      );
      continue;
    }

    if (/^\s*- \[[ xX]\]\s+/.test(line)) {
      const { items, next } = collectListItems(lines, i, "checklist");
      i = next;
      out.push(renderList(items, false, true));
      continue;
    }

    if (/^\s*-\s+/.test(line)) {
      const { items, next } = collectListItems(lines, i, "unordered");
      i = next;
      out.push(renderList(items));
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const { items, next } = collectListItems(lines, i, "ordered");
      i = next;
      out.push(renderList(items, true));
      continue;
    }

    const para = [trimmed];
    i++;
    while (i < lines.length && !startsBlock(lines[i], lines[i + 1])) para.push(lines[i++].trim());
    out.push(`<p>${renderInline(para.join(" "))}</p>`);
  }

  return out.join("\n");
}

function readMarkdown(path) {
  return readFileSync(path, "utf8");
}

function prettyTitle(slug) {
  return slug
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function searchText(parts) {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

function navButton(id, title, meta = "") {
  return `<button class="nav-link" type="button" data-target="${escapeAttr(id)}" data-search="${escapeAttr(
    `${title} ${meta}`.toLowerCase(),
  )}"><span>${escapeHtml(title)}</span>${meta ? `<small>${escapeHtml(meta)}</small>` : ""}</button>`;
}

function docSection({ id, title, group, path, bodyHtml, search }) {
  return `<section class="doc-section" id="${escapeAttr(id)}" data-search="${escapeAttr(search)}">
    <header class="doc-header">
      <p>${escapeHtml(group)}</p>
      <h2>${escapeHtml(title)}</h2>
      <span>${escapeHtml(path)}</span>
    </header>
    <article class="markdown-body">${bodyHtml}</article>
  </section>`;
}

function specSection(slug) {
  const title = prettyTitle(slug);
  const planPath = join(SPECS_DIR, slug, "PLAN.md");
  const execPath = join(SPECS_DIR, slug, "EXECUTION.md");
  const planHtml = markdownToHtml(readMarkdown(planPath), `${slug}-plan`);
  const hasExecution = existsSync(execPath);
  const executionHtml = hasExecution
    ? markdownToHtml(readMarkdown(execPath), `${slug}-execution`)
    : "";
  const id = `spec-${slug}`;
  const relPlan = relative(ROOT_DIR, planPath);

  const tabs = hasExecution
    ? `<div class="tabs" role="tablist" aria-label="${escapeAttr(title)} documents">
        <button type="button" class="tab is-active" data-tab-target="${escapeAttr(id)}-plan">Plan</button>
        <button type="button" class="tab" data-tab-target="${escapeAttr(id)}-execution">Execution</button>
      </div>`
    : "";

  const executionPanel = hasExecution
    ? `<article class="markdown-body tab-panel" id="${escapeAttr(id)}-execution" hidden>${executionHtml}</article>`
    : "";

  return `<section class="doc-section spec-doc" id="${escapeAttr(id)}" data-search="${escapeAttr(
    searchText([
      slug,
      title,
      readMarkdown(planPath).slice(0, 500),
      hasExecution ? readMarkdown(execPath).slice(0, 500) : "",
    ]),
  )}">
    <header class="doc-header">
      <p>Spec</p>
      <h2>${escapeHtml(title)}</h2>
      <span>${escapeHtml(relPlan)}${hasExecution ? " + EXECUTION.md" : ""}</span>
    </header>
    ${tabs}
    <article class="markdown-body tab-panel" id="${escapeAttr(id)}-plan">${planHtml}</article>
    ${executionPanel}
  </section>`;
}

function loadDocGroup(dirName, group) {
  const dir = join(DOCS_DIR, dirName);
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter((file) => file.endsWith(".md"))
    .sort()
    .map((file) => {
      const path = join(dir, file);
      const title = file.replace(/\.md$/, "").replace(/^\d+-/, "");
      const text = readMarkdown(path);
      return {
        id: `${dirName}-${slugify(file.replace(/\.md$/, ""))}`,
        title: prettyTitle(title),
        group,
        path: relative(ROOT_DIR, path),
        bodyHtml: markdownToHtml(text, `${dirName}-${file}`),
        search: searchText([group, title, text.slice(0, 700)]),
      };
    });
}

function renderBoard(rows) {
  return `<section class="doc-section is-active" id="board" data-search="board specs status phase debt">
    <header class="board-hero">
      <div>
        <p>Task overview</p>
        <h1>Docs Dashboard</h1>
      </div>
      <div class="board-stats" aria-label="Spec summary">
        <span><strong>${rows.length}</strong> specs</span>
        <span><strong>${rows.filter((row) => row.status === "Done").length}</strong> done</span>
        <span><strong>${rows.filter((row) => row.status !== "Done").length}</strong> open</span>
      </div>
    </header>
    <div class="board-table">
      <table>
        <thead>
          <tr>
            <th>Spec</th>
            <th>Status</th>
            <th>Phases</th>
            <th>Debt</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (
                row,
              ) => `<tr data-search="${escapeAttr(searchText([row.slug, row.status, row.phases, row.debt, row.description]))}">
                <td><button type="button" class="board-link" data-target="spec-${escapeAttr(row.slug)}">${escapeHtml(row.slug)}</button></td>
                <td><span class="status status-${escapeAttr(slugify(row.status))}">${escapeHtml(row.status)}</span></td>
                <td>${escapeHtml(row.phases)}</td>
                <td>${escapeHtml(row.debt)}</td>
                <td>${escapeHtml(row.description)}</td>
              </tr>`,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  </section>`;
}

function buildHtml() {
  let specRecords;
  try {
    specRecords = collectSpecRecords(SPECS_DIR);
  } catch (err) {
    if (err instanceof SpecStatusError) {
      console.error(`docs-dashboard: ${err.message}`);
      process.exit(1);
    }
    throw err;
  }

  const { rows, referenceRows } = specRecords;
  const specs = [...rows.map((row) => row.slug), ...referenceRows.map((row) => row.slug)].sort();
  const adrDocs = loadDocGroup("adr", "ADR");
  const designDocs = loadDocGroup("design", "Design");
  const standaloneDocs = [
    {
      id: "backlog",
      title: "Backlog",
      group: "Backlog",
      path: "docs/BACKLOG.md",
      bodyHtml: markdownToHtml(readMarkdown(join(DOCS_DIR, "BACKLOG.md")), "backlog"),
      search: searchText(["backlog", readMarkdown(join(DOCS_DIR, "BACKLOG.md")).slice(0, 700)]),
    },
    {
      id: "product-plan",
      title: "Product Plan",
      group: "Product Plan",
      path: "docs/PLAN.md",
      bodyHtml: markdownToHtml(readMarkdown(join(DOCS_DIR, "PLAN.md")), "product-plan"),
      search: searchText(["product plan", readMarkdown(join(DOCS_DIR, "PLAN.md")).slice(0, 700)]),
    },
    {
      id: "context",
      title: "Context",
      group: "Context",
      path: "CONTEXT.md",
      bodyHtml: markdownToHtml(readMarkdown(join(ROOT_DIR, "CONTEXT.md")), "context"),
      search: searchText(["context", readMarkdown(join(ROOT_DIR, "CONTEXT.md")).slice(0, 700)]),
    },
  ].filter((doc) => existsSync(join(ROOT_DIR, doc.path)));

  const nav = [
    ["Board", navButton("board", "Specs Board", `${rows.length} specs`)],
    [
      "Specs",
      specs
        .map((slug) =>
          navButton(
            `spec-${slug}`,
            slug,
            rows.find((row) => row.slug === slug)?.status ?? "Reference",
          ),
        )
        .join(""),
    ],
    ["ADRs", adrDocs.map((doc) => navButton(doc.id, doc.title)).join("")],
    ["Design", designDocs.map((doc) => navButton(doc.id, doc.title)).join("")],
    ["Backlog", navButton("backlog", "Backlog")],
    ["Context", navButton("context", "Context")],
    ["Product Plan", navButton("product-plan", "Product Plan")],
  ]
    .filter(([, links]) => links)
    .map(
      ([group, links]) =>
        `<section class="nav-group"><h2>${escapeHtml(group)}</h2>${links}</section>`,
    )
    .join("");

  const sections = [
    renderBoard(rows),
    ...specs.map(specSection),
    ...adrDocs.map(docSection),
    ...designDocs.map(docSection),
    ...standaloneDocs.map(docSection),
  ].join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Docs Dashboard</title>
  <style>
    :root {
      color-scheme: light;
      --paper: #f6f3ea;
      --paper-2: #ece8dc;
      --surface: #fffdf7;
      --surface-soft: #faf7ee;
      --ink: #25302b;
      --muted: #69756d;
      --line: #ddd6c7;
      --line-strong: #bbb09c;
      --blue: #386f7a;
      --green: #4f7d5b;
      --red: #a45a4d;
      --amber: #b5843d;
      --white: #fffdf7;
      --shadow: 0 18px 44px rgba(65, 58, 43, 0.11);
      --display: "Avenir Next", "Gill Sans", "Trebuchet MS", sans-serif;
      --body: "Iowan Old Style", "Charter", "Palatino Linotype", Georgia, serif;
      --mono: "SFMono-Regular", "Cascadia Code", "Liberation Mono", monospace;
    }

    * { box-sizing: border-box; }

    html { scroll-behavior: smooth; }

    body {
      margin: 0;
      min-height: 100vh;
      color: var(--ink);
      font-family: var(--body);
      background:
        linear-gradient(120deg, rgba(79, 125, 91, 0.08), transparent 36%),
        linear-gradient(90deg, rgba(37, 48, 43, 0.035) 1px, transparent 1px) 0 0 / 42px 42px,
        linear-gradient(rgba(37, 48, 43, 0.026) 1px, transparent 1px) 0 0 / 42px 42px,
        linear-gradient(135deg, var(--paper), var(--paper-2));
    }

    button, input {
      font: inherit;
    }

    a {
      color: var(--blue);
      text-decoration-thickness: 0.08em;
      text-underline-offset: 0.18em;
    }

    .shell {
      display: grid;
      grid-template-columns: minmax(260px, 304px) minmax(0, 1fr);
      min-height: 100vh;
    }

    .sidebar {
      position: sticky;
      top: 0;
      height: 100vh;
      overflow: auto;
      padding: 20px;
      border-right: 1px solid var(--line);
      background: rgba(255, 253, 247, 0.82);
      backdrop-filter: blur(16px);
    }

    .brand {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 15px;
      background: var(--white);
      box-shadow: var(--shadow);
    }

    .brand p,
    .board-hero p,
    .doc-header p {
      margin: 0 0 6px;
      color: var(--green);
      font-family: var(--display);
      font-size: 0.76rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0;
    }

    .brand h1 {
      margin: 0;
      font-family: var(--display);
      font-size: 1.5rem;
      line-height: 1.05;
    }

    .filter {
      width: 100%;
      margin: 18px 0 22px;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 12px 14px;
      color: var(--ink);
      background: rgba(255, 253, 247, 0.9);
      outline: none;
    }

    .filter:focus {
      border-color: var(--blue);
      box-shadow: 0 0 0 3px rgba(39, 95, 126, 0.18);
    }

    .nav-group {
      margin: 0 0 22px;
    }

    .nav-group h2 {
      margin: 0 0 8px;
      color: var(--muted);
      font-family: var(--display);
      font-size: 0.74rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0;
    }

    .nav-link {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 8px;
      width: 100%;
      margin: 2px 0;
      border: 0;
      border-radius: 7px;
      padding: 8px 10px;
      color: var(--ink);
      text-align: left;
      background: transparent;
      cursor: pointer;
    }

    .nav-link:hover,
    .nav-link.is-active {
      color: var(--ink);
      background: rgba(79, 125, 91, 0.1);
    }

    .nav-link span {
      overflow-wrap: anywhere;
    }

    .nav-link small {
      color: var(--muted);
      font-size: 0.74rem;
    }

    .nav-link[hidden],
    .board-table tr[hidden] {
      display: none;
    }

    .content {
      min-width: 0;
      padding: 30px clamp(18px, 4vw, 56px);
    }

    .doc-section {
      display: none;
      animation: reveal 360ms ease-out both;
    }

    .doc-section.is-active {
      display: block;
      width: min(100%, 1180px);
      margin-inline: auto;
    }

    @keyframes reveal {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .board-hero {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 24px;
      align-items: end;
      margin: 0 0 22px;
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 22px;
      background: rgba(255, 253, 247, 0.72);
      box-shadow: var(--shadow);
    }

    .board-hero h1 {
      margin: 0;
      font-family: var(--display);
      font-size: clamp(2rem, 5vw, 4rem);
      line-height: 0.96;
    }

    .board-stats {
      display: grid;
      grid-template-columns: repeat(3, minmax(74px, 1fr));
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--white);
      overflow: hidden;
    }

    .board-stats span {
      padding: 14px;
      border-left: 1px solid var(--line);
      color: var(--muted);
      font-size: 0.78rem;
      text-transform: uppercase;
    }

    .board-stats span:first-child {
      border-left: 0;
    }

    .board-stats strong {
      display: block;
      color: var(--ink);
      font-family: var(--display);
      font-size: 1.55rem;
      line-height: 1;
    }

    .board-table,
    .md-table-wrap {
      overflow: auto;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: rgba(255, 253, 247, 0.86);
      box-shadow: var(--shadow);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      min-width: 760px;
    }

    th,
    td {
      border-bottom: 1px solid var(--line);
      padding: 11px 13px;
      text-align: left;
      vertical-align: top;
    }

    tbody tr:hover {
      background: rgba(79, 125, 91, 0.065);
    }

    th {
      position: sticky;
      top: 0;
      z-index: 1;
      color: var(--muted);
      font-family: var(--display);
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      background: #f3efe4;
    }

    .board-link {
      border: 0;
      padding: 0;
      color: var(--blue);
      font-weight: 700;
      text-align: left;
      text-decoration: underline;
      text-decoration-thickness: 0.08em;
      text-underline-offset: 0.18em;
      background: transparent;
      cursor: pointer;
    }

    .status {
      display: inline-block;
      min-width: 6.6rem;
      border: 1px solid transparent;
      border-radius: 999px;
      padding: 4px 9px;
      font-family: var(--display);
      font-size: 0.76rem;
      font-weight: 700;
      text-align: center;
      text-transform: uppercase;
    }

    .status-done {
      color: #365f43;
      background: rgba(79, 125, 91, 0.14);
      border-color: rgba(79, 125, 91, 0.25);
    }

    .status-in-progress {
      color: #2f626d;
      background: rgba(56, 111, 122, 0.14);
      border-color: rgba(56, 111, 122, 0.25);
    }

    .status-not-started,
    .status-pending {
      color: #835f2c;
      background: rgba(181, 132, 61, 0.15);
      border-color: rgba(181, 132, 61, 0.24);
    }

    .doc-header {
      margin: 0 0 18px;
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 18px 20px;
      background: rgba(255, 253, 247, 0.72);
    }

    .doc-header h2 {
      margin: 0 0 6px;
      font-family: var(--display);
      font-size: clamp(1.7rem, 3.6vw, 3.1rem);
      line-height: 1;
    }

    .doc-header span {
      color: var(--muted);
      font-family: var(--mono);
      font-size: 0.82rem;
    }

    .tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 0 0 18px;
      max-width: 1060px;
      margin-inline: auto;
    }

    .tab {
      border: 1px solid var(--line-strong);
      border-radius: 999px;
      padding: 7px 13px;
      color: var(--ink);
      background: rgba(255, 253, 247, 0.84);
      cursor: pointer;
    }

    .tab.is-active {
      color: var(--white);
      border-color: var(--green);
      background: var(--green);
    }

    .markdown-body {
      max-width: 1060px;
      margin-inline: auto;
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 24px clamp(16px, 3vw, 34px) 36px;
      font-size: 1.02rem;
      line-height: 1.64;
      background: rgba(255, 253, 247, 0.78);
    }

    .markdown-body h1,
    .markdown-body h2,
    .markdown-body h3,
    .markdown-body h4,
    .markdown-body h5,
    .markdown-body h6 {
      margin: 1.35em 0 0.45em;
      font-family: var(--display);
      line-height: 1.1;
    }

    .markdown-body h1 { font-size: 2.35rem; }
    .markdown-body h2 { font-size: 1.85rem; }
    .markdown-body h3 { font-size: 1.35rem; }

    .markdown-body p,
    .markdown-body ul,
    .markdown-body ol,
    .markdown-body blockquote,
    .markdown-body pre,
    .markdown-body .md-table-wrap {
      margin: 0 0 1rem;
    }

    .markdown-body code {
      font-family: var(--mono);
      font-size: 0.9em;
      background: rgba(37, 48, 43, 0.08);
      padding: 0.12em 0.28em;
    }

    .color-code {
      display: inline-flex;
      gap: 0.35em;
      align-items: center;
      white-space: nowrap;
    }

    .color-swatch {
      width: 0.9em;
      height: 0.9em;
      border: 1px solid rgba(37, 48, 43, 0.22);
      border-radius: 999px;
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.34);
    }

    .frontmatter-card {
      margin: 0 0 1.5rem;
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 18px;
      background:
        linear-gradient(135deg, rgba(79, 125, 91, 0.08), transparent 42%),
        var(--surface);
    }

    .frontmatter-summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }

    .frontmatter-summary div {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 10px 12px;
      background: rgba(250, 247, 238, 0.7);
    }

    .frontmatter-summary span {
      display: block;
      margin-bottom: 3px;
      color: var(--muted);
      font-family: var(--display);
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
    }

    .frontmatter-summary strong {
      font-weight: 700;
    }

    .color-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 10px;
    }

    .color-chip {
      display: grid;
      grid-template-columns: 38px minmax(0, 1fr);
      gap: 10px;
      align-items: center;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 9px;
      background: rgba(255, 253, 247, 0.72);
    }

    .color-preview {
      width: 38px;
      height: 38px;
      border: 1px solid rgba(37, 48, 43, 0.18);
      border-radius: 8px;
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.34);
    }

    .color-chip strong,
    .color-chip code {
      display: block;
      overflow-wrap: anywhere;
    }

    .color-chip strong {
      margin-bottom: 2px;
      font-family: var(--display);
      font-size: 0.88rem;
    }

    .markdown-body pre {
      overflow: auto;
      border: 1px solid #314039;
      border-radius: 8px;
      padding: 16px;
      color: #f8f5ec;
      background: #25302b;
    }

    .markdown-body pre code {
      padding: 0;
      color: inherit;
      background: transparent;
    }

    .markdown-body blockquote {
      border-left: 4px solid var(--green);
      margin-left: 0;
      padding-left: 16px;
      color: var(--muted);
    }

    .markdown-body hr {
      border: 0;
      border-top: 1px solid var(--line);
      margin: 2rem 0;
    }

    .task-list {
      list-style: none;
      padding-left: 0;
    }

    .task-list li {
      display: grid;
      grid-template-columns: 18px minmax(0, 1fr);
      gap: 8px;
      align-items: start;
    }

    .task-list input {
      margin-top: 0.35em;
      accent-color: var(--green);
    }

    @media (max-width: 860px) {
      .shell {
        grid-template-columns: 1fr;
      }

      .sidebar {
        position: relative;
        height: auto;
        border-right: 0;
        border-bottom: 1px solid var(--line);
      }

      .brand {
        box-shadow: var(--shadow);
      }

      .board-hero {
        grid-template-columns: 1fr;
      }

      .board-stats {
        grid-template-columns: 1fr 1fr 1fr;
      }

      .content {
        padding: 24px 16px 44px;
      }

      .markdown-body {
        padding: 18px 14px 28px;
      }
    }
  </style>
</head>
<body>
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">
        <p>Task docs</p>
        <h1>Wallet Docs</h1>
      </div>
      <input id="filter" class="filter" type="search" placeholder="Filter docs and specs" autocomplete="off">
      <nav aria-label="Docs navigation">${nav}</nav>
    </aside>
    <main class="content">${sections}</main>
  </div>
  <script>
    const filter = document.querySelector('#filter')
    const navLinks = Array.from(document.querySelectorAll('.nav-link'))
    const sections = Array.from(document.querySelectorAll('.doc-section'))
    const boardRows = Array.from(document.querySelectorAll('.board-table tbody tr'))

    function showSection(id) {
      sections.forEach((section) => section.classList.toggle('is-active', section.id === id))
      navLinks.forEach((link) => link.classList.toggle('is-active', link.dataset.target === id))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    document.addEventListener('click', (event) => {
      const target = event.target.closest('[data-target]')
      if (!target) return
      const id = target.dataset.target
      if (!document.getElementById(id)) return
      showSection(id)
    })

    document.addEventListener('click', (event) => {
      const tab = event.target.closest('[data-tab-target]')
      if (!tab) return
      const panel = document.getElementById(tab.dataset.tabTarget)
      if (!panel) return
      const wrapper = tab.closest('.spec-doc')
      wrapper.querySelectorAll('.tab').forEach((item) => item.classList.toggle('is-active', item === tab))
      wrapper.querySelectorAll('.tab-panel').forEach((item) => { item.hidden = item !== panel })
    })

    filter.addEventListener('input', () => {
      const query = filter.value.trim().toLowerCase()
      navLinks.forEach((link) => { link.hidden = query && !link.dataset.search.includes(query) })
      boardRows.forEach((row) => { row.hidden = query && !row.dataset.search.includes(query) })
    })

    showSection('board')
  </script>
</body>
</html>`;
}

writeFileSync(OUTPUT_PATH, buildHtml());
console.log(`docs-dashboard: wrote ${relative(ROOT_DIR, OUTPUT_PATH)}`);

const opened =
  process.platform === "darwin" ? spawnSync("open", [OUTPUT_PATH], { stdio: "ignore" }) : null;
if (!opened || opened.status !== 0) {
  console.log(`docs-dashboard: open ${OUTPUT_PATH}`);
}
