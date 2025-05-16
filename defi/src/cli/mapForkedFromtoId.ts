import fs from "fs";
import path from "path";
import { Protocol } from "../protocols/types";
import parentProtocols from "../protocols/parentProtocols";

const dataFiles = ["data.ts", "data2.ts", "data3.ts", "data4.ts"];
const sourceDir = path.join(__dirname, "../protocols");
const outputDir = path.join(__dirname, "../protocols/updated");

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const buildNameToIdMappings = () => {
  const globalNameToId: Record<string, string> = {};
  const parentNameToId: Record<string, string> = {};
  
  for (const parent of parentProtocols) {
    parentNameToId[parent.name] = parent.id;
  }
  
  for (const file of dataFiles) {
    try {
      const filePath = path.join(sourceDir, file);
      if (fs.existsSync(filePath)) {
        const protocols = require(filePath.replace(/\.ts$/, "")).default as Protocol[];
        for (const protocol of protocols) {
          globalNameToId[protocol.name] = protocol.id;
        }
      }
    } catch (error) {
      console.error(`Error loading protocols from ${file}:`, error);
    }
  }
  
  return { globalNameToId, parentNameToId };
};

const processFile = (file: string, globalNameToId: Record<string, string>, parentNameToId: Record<string, string>) => {
  const filePath = path.join(sourceDir, file);
  const outputPath = path.join(outputDir, file);
  
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return { processed: false, missingMappings: [] };
  }
  
  let content = fs.readFileSync(filePath, "utf-8");
  const missingMappings: Array<{ protocol: string; missingName: string }> = [];
  
  const allKnownIds = new Set<string>([
    ...Object.values(globalNameToId),
    ...Object.values(parentNameToId),
  ]);
  
  const forkedFromRegex = /forkedFrom:\s*\[(.*?)\]/gs;
  let match;
  
  while ((match = forkedFromRegex.exec(content)) !== null) {
    const originalForkedFrom = match[0];
    const forkedFromContent = match[1].trim();
    
    if (!forkedFromContent) continue;
    
    let protocolName = "Unknown";
    
    const fullContentBeforeMatch = content.substring(0, match.index);
    const lastOpenBraceIndex = fullContentBeforeMatch.lastIndexOf("{");
    
    if (lastOpenBraceIndex >= 0) {
      const currentObjectContent = content.substring(lastOpenBraceIndex, match.index);
      const nameMatch = /name:\s*"([^"]+)"/.exec(currentObjectContent);
      
      if (nameMatch) {
        protocolName = nameMatch[1];
      } else {
        const extendedContextStart = Math.max(0, match.index - 500);
        const extendedContext = content.substring(extendedContextStart, match.index);
        const nameMatchExtended = /name:\s*"([^"]+)"/.exec(extendedContext);
        
        if (nameMatchExtended) {
          protocolName = nameMatchExtended[1];
        } else {
          const idMatch = /id:\s*"([^"]+)"/.exec(currentObjectContent);
          if (idMatch) {
            protocolName = `Protocol with ID: ${idMatch[1]}`;
          }
        }
      }
    }
    
    if (protocolName === "Unknown") {
      const arrayContext = content.substring(0, match.index).split("\n").slice(-3).join("\n");
      const indexMatch = /\[\s*(\d+)\s*\]/.exec(arrayContext);
      if (indexMatch) {
        protocolName = `Protocol at index ${indexMatch[1]}`;
      }
    }
    
    const names = forkedFromContent
      .split(",")
      .map(item => item.trim())
      .filter(Boolean)
      .map(item => {
        const nameMatch = /"([^"]+)"/.exec(item);
        return nameMatch ? nameMatch[1] : item;
      });
    
    const updatedNames = names.map(nameOrId => {
      if (allKnownIds.has(nameOrId)) {
        return `"${nameOrId}"`;
      }
      
      const id = globalNameToId[nameOrId] ?? parentNameToId[nameOrId];
      if (!id) {
        missingMappings.push({ protocol: protocolName, missingName: nameOrId });
        return `"${nameOrId}"`;
      }
      
      return `"${id}"`;
    });
    
    let updatedForkedFromIds;
    if (originalForkedFrom.includes("\n")) {
      const indentMatch = /forkedFrom:\s*\[\s*\n(\s+)/.exec(originalForkedFrom);
      const indent = indentMatch ? indentMatch[1] : "    ";
      updatedForkedFromIds = `forkedFromIds: [\n${indent}${updatedNames.join(`,\n${indent}`)}\n${indent.slice(0, -2)}]`;
    } else {
      updatedForkedFromIds = `forkedFromIds: [${updatedNames.join(", ")}]`;
    }
    
    content = content.substring(0, match.index) + updatedForkedFromIds + content.substring(match.index + originalForkedFrom.length);
    
    forkedFromRegex.lastIndex = match.index + updatedForkedFromIds.length;
  }
  
  fs.writeFileSync(outputPath, content);
  
  return {
    processed: true,
    missingMappings,
  };
};

const main = () => {
  console.log("building mappings");
  const { globalNameToId, parentNameToId } = buildNameToIdMappings();
  
  console.log(`found ${Object.keys(globalNameToId).length} protocols and ${Object.keys(parentNameToId).length} parent protocols`);
  
  const allMissingMappings: Array<{
    file: string;
    protocol: string;
    missingName: string;
  }> = [];
  
  for (const file of dataFiles) {
    console.log(`process ${file}`);
    const { processed, missingMappings } = processFile(file, globalNameToId, parentNameToId);
    
    if (processed) {
      console.log(`${file} ok`);
      if (missingMappings.length > 0) {
        missingMappings.forEach(({ protocol, missingName }) => {
          allMissingMappings.push({ file, protocol, missingName });
        });
      }
    } else {
      console.log(`fail ${file}`);
    }
  }
  
  if (allMissingMappings.length > 0) {
    console.log("\nmissing:");
    for (const { file, protocol, missingName } of allMissingMappings) {
      console.log(`${file} | protocol: ${protocol} | forkedFrom: ${missingName}`);
    }
    console.log(`\ntotal missing mappings: ${allMissingMappings.length}`);
  }
  console.log(`\nupdated files are saved in ${outputDir}`);
};

main();