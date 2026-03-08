const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { spawn } = require("child_process");

const repoRoot = path.resolve(__dirname, "../../..");
const outputAll = path.join(repoRoot, "defi/protocol-name-history-all.json");
const outputChangedJson = path.join(repoRoot, "defi/protocol-name-history-changed.json");
const outputChangedJs = path.join(repoRoot, "defi/protocol-name-history-changed.js");

const files = [
  "defi/src/protocols/data1.ts",
  "defi/src/protocols/data2.ts",
  "defi/src/protocols/data3.ts",
  "defi/src/protocols/data4.ts",
  "defi/src/protocols/data5.ts",
];

function unescapeString(rawValue) {
  return JSON.parse(`"${rawValue}"`);
}

function sortObjectEntries(entries) {
  return Object.fromEntries(
    [...entries].sort((a, b) => {
      const aNum = Number(a[0]);
      const bNum = Number(b[0]);
      if (Number.isFinite(aNum) && Number.isFinite(bNum)) return aNum - bNum;
      return a[0].localeCompare(b[0]);
    }),
  );
}

function addName(history, id, name) {
  if (!history.has(id)) history.set(id, []);
  const names = history.get(id);
  if (!names.includes(name)) names.push(name);
}

function processGitHistory(file, history) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "git",
      ["log", "--follow", "-p", "--reverse", "--unified=3", "--format=commit %H", "--", file],
      {
        cwd: repoRoot,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    const stderrChunks = [];
    const resetIds = () => {
      lastIds[" "] = null;
      lastIds["+"] = null;
      lastIds["-"] = null;
    };

    const lastIds = { " ": null, "+": null, "-": null };
    const rl = readline.createInterface({
      input: child.stdout,
      crlfDelay: Infinity,
    });

    rl.on("line", (line) => {
      if (
        line.startsWith("commit ") ||
        line.startsWith("diff --git ") ||
        line.startsWith("@@ ") ||
        line === "@@" ||
        line.startsWith("--- ") ||
        line.startsWith("+++ ") ||
        line.startsWith("index ")
      ) {
        resetIds();
        return;
      }

      const idMatch = line.match(/^([ +-]) {4}id:\s*(?:"((?:\\.|[^"\\])*)"|([0-9]+))\s*,/);
      if (idMatch) {
        const prefix = idMatch[1];
        lastIds[prefix] = idMatch[2] ? unescapeString(idMatch[2]) : idMatch[3];
        return;
      }

      const nameMatch = line.match(/^([ +-]) {4}name:\s*"((?:\\.|[^"\\])*)"\s*,/);
      if (!nameMatch) return;

      const prefix = nameMatch[1];
      const id = lastIds[prefix] ?? lastIds[" "];
      if (!id) return;

      addName(history, id, unescapeString(nameMatch[2]));
    });

    child.stderr.on("data", (chunk) => stderrChunks.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      rl.close();
      if (code !== 0) {
        reject(new Error(Buffer.concat(stderrChunks).toString("utf8")));
        return;
      }
      resolve();
    });
  });
}

async function buildHistory() {
  const history = new Map();

  for (const file of files) {
    await processGitHistory(file, history);
  }

  return history;
}

function writeOutputs(history) {
  const all = sortObjectEntries([...history.entries()]);
  const changed = sortObjectEntries(Object.entries(all).filter(([, names]) => names.length > 1));

  fs.writeFileSync(outputAll, `${JSON.stringify(all, null, 2)}\n`);
  fs.writeFileSync(outputChangedJson, `${JSON.stringify(changed, null, 2)}\n`);

  const jsLines = [
    "module.exports = {",
    ...Object.entries(changed).map(
      ([id, names]) => `  ${JSON.stringify(id)}: new Set(${JSON.stringify(names)}),`,
    ),
    "};",
    "",
  ];
  fs.writeFileSync(outputChangedJs, jsLines.join("\n"));

  return {
    allCount: Object.keys(all).length,
    changedCount: Object.keys(changed).length,
  };
}

async function main() {
  const startedAt = Date.now();
  const history = await buildHistory();
  const summary = writeOutputs(history);
  const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);

  console.log(
    JSON.stringify(
      {
        ...summary,
        outputAll,
        outputChangedJson,
        outputChangedJs,
        elapsedSeconds,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
