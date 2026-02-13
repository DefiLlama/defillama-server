import { parse } from "recast";
import { readFileSync, writeFileSync } from "fs";
import { visit } from "ast-types";
import * as path from "path";

const TS_PARSER = require("recast/parsers/typescript");
const FILES = ["data1.ts", "data2.ts", "data3.ts", "data4.ts", "data5.ts"];
const ROOT = path.join(__dirname, "../../src/protocols");
export const DEDUP_FIELDS = ["twitter", "url", "governanceID", "github", "treasury", "description", "symbol", "referralUrl"];

function extractValue(node: any): any {
    if (!node) return undefined;
    switch (node.type) {
        case "StringLiteral": case "NumericLiteral": case "BooleanLiteral": return node.value;
        case "NullLiteral": return null;
        case "ArrayExpression": return node.elements.map(extractValue);
        case "ObjectExpression":
            const obj: any = {};
            for (const p of node.properties)
                if (p.type === "ObjectProperty") obj[p.key.name || p.key.value] = extractValue(p.value);
            return obj;
        default: return undefined;
    }
}

function valuesEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a == null || b == null) return a === b;
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        return [...a].sort().every((v, i) => valuesEqual(v, [...b].sort()[i]));
    }
    if (typeof a === "object" && typeof b === "object") {
        const ka = Object.keys(a).sort(), kb = Object.keys(b).sort();
        return ka.length === kb.length && ka.every((k, i) => k === kb[i] && valuesEqual(a[k], b[k]));
    }
    return false;
}

// get parent protocols
const parentProtocols = new Map<string, any>();
const parentSource = readFileSync(path.join(ROOT, "parentProtocols.ts"), "utf-8");
visit(parse(parentSource, { parser: TS_PARSER }), {
    visitObjectExpression(p) {
        const data: any = {};
        for (const prop of p.node.properties)
            if (prop.type === "ObjectProperty") data[prop.key.name || prop.key.value] = extractValue(prop.value);
        if (data.id?.startsWith("parent#")) parentProtocols.set(data.id, data);
        this.traverse(p);
    }
});

for (const fileName of FILES) {
    const filePath = path.join(ROOT, fileName);
    const source = readFileSync(filePath, "utf-8");
    const lines = source.split("\n");
    const linesToRemove = new Set<number>();

    visit(parse(source, { parser: TS_PARSER }), {
        visitObjectExpression(nodePath) {
            const data: any = {}, locs = new Map<string, [number, number]>();
            for (const prop of nodePath.node.properties) {
                if (prop.type === "ObjectProperty") {
                    const key = prop.key.name || prop.key.value;
                    data[key] = extractValue(prop.value);
                    if (prop.loc) locs.set(key, [prop.loc.start.line, prop.loc.end.line]);
                }
            }

            if (data.parentProtocol && data.id) {
                const parent = parentProtocols.get(data.parentProtocol);
                if (parent) {
                    for (const field of DEDUP_FIELDS) {
                        if (data[field] !== undefined && parent[field] !== undefined && valuesEqual(data[field], parent[field])) {
                            const loc = locs.get(field);
                            if (loc) {
                                // console.log(`[${data.name}] Removing "${field}" (matches parent "${parent.name}")`);
                                for (let i = loc[0]; i <= loc[1]; i++) linesToRemove.add(i - 1);
                            }
                        }
                    }
                }
            }
            this.traverse(nodePath);
        }
    });

    if (linesToRemove.size > 0) {
        const output = lines.filter((_, i) => !linesToRemove.has(i)).join("\n");
        console.log(`\n${fileName}: ${lines.length} -> ${lines.length - linesToRemove.size} lines`);
        writeFileSync(filePath, output);
    }
}