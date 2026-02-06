import { parse } from "recast";
import { readFileSync, writeFileSync } from "fs";
import { visit } from "ast-types";
import * as path from "path";

const TS_PARSER = require("recast/parsers/typescript");
const FILES = ["data1.ts", "data2.ts", "data3.ts", "data4.ts", "data5.ts"];
const ROOT = path.join(__dirname, "../../src/protocols");

// Fields that are often null/undefined 
const REMOVABLE_FIELDS = new Set([
    "gecko_id",
    "cmcId",
    "address",
    "symbol",
    "forkedFrom",
]);

// Returns bool indicating if the value/line should be removed
function shouldRemoveValue(valueNode: any): boolean {
    if (valueNode.type === "NullLiteral") {
        return true;
    }
    if (valueNode.type === "StringLiteral" && valueNode.value === "-") {
        return true;
    }
    if (valueNode.type === "ArrayExpression" && valueNode.elements.length === 0) {
        return true;
    }
    return false;
}

// Returns bool indicating if property could be removed (if null/undefined/"-"/empty array) 
function shouldRemoveProperty(prop: any): boolean {
    return REMOVABLE_FIELDS.has(prop.key.name) && shouldRemoveValue(prop.value);
}

function main() {
    for (const fileName of FILES) {
        const filePath = path.join(ROOT, fileName);
        console.log(`\nProcessing: ${fileName}`);

        const source = readFileSync(filePath, "utf-8");
        const lines = source.split("\n");

        // Parse to find which lines to remove
        const ast = parse(source, { parser: TS_PARSER });
        const linesToRemove = new Set<number>();

        visit(ast, {
            visitObjectExpression(path) {
                const properties = path.node.properties;

                for (const prop of properties) {
                    if (prop.type === "ObjectProperty" && shouldRemoveProperty(prop)) {
                        // Get the line number (1-indexed in loc, convert to 0-indexed)
                        const startLine = prop.loc?.start.line;
                        const endLine = prop.loc?.end.line;

                        if (startLine && endLine) {
                            for (let i = startLine; i <= endLine; i++) {
                                linesToRemove.add(i - 1); // Convert to 0-indexed
                                // console.log(`  Will remove line ${i}: ${lines[i - 1].trim()}`);
                            }
                        }
                    }
                }

                this.traverse(path);
            }
        });

        console.log(`\n--- ${fileName} Summary ---`);
        console.log(`  Lines to remove: ${linesToRemove.size}`);

        // Filter out the lines we want to remove
        const outputLines = lines.filter((_, index) => !linesToRemove.has(index));
        const output = outputLines.join("\n");

        console.log(`  Before: ${lines.length} lines\n  After: ${outputLines.length} lines`);

        // Write the file
        writeFileSync(filePath, output);
        console.log(`  File saved.`);
    }
}

main();