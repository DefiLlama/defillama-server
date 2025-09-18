import { parse, print, types as R } from "recast";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import * as path from "path";
import { visit } from "ast-types";
import loadAdaptorsData from "../../src/adaptors/data";
import { ADAPTER_TYPES } from "../../src/adaptors/data/types";

const TS_PARSER = require("recast/parsers/typescript");
const b = R.builders;
const WRITE_OUTPUT = true;

const ROOT = path.join(__dirname, "../../src");
const SRC_DIR = path.join(ROOT, "protocols");
const OUT_DIR = path.join(ROOT, "protocols");
const FILES = ["data1.ts", "data2.ts", "data3.ts", "data4.ts"];
// const FILES = ["data1.ts"];
const protocolConfigMap: any = {};
const chainConfigMap: any = {};
initData();
console.log('protocol count #', Object.keys(protocolConfigMap).length);
console.log('chain count #', Object.keys(chainConfigMap).length);

// console.log('protocolConfigMap', JSON.stringify({ protocolConfigMap, chainConfigMap }))

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });


// update chain data
let matchingChainCount = 0;
let matchingProtocolCount = 0;
transformChainSource()
for (const fileName of FILES) {
  const filePath = path.join(SRC_DIR, fileName);
  if (!existsSync(filePath)) continue;
  console.log(`processing ${path.relative(ROOT, filePath)}`);
  const src = readFileSync(filePath, "utf8");
  const out = transformSource(src)
  writeFile(path.join(OUT_DIR, fileName), out);
}

console.log('Found matching chain data for', matchingChainCount, 'chains')
console.log('Found matching protocol data for', matchingProtocolCount, 'protocols')


function initData() {

  ADAPTER_TYPES.forEach((adapterType: any) => {
    const { config, protocolAdaptors } = loadAdaptorsData(adapterType);
    const chainModuleMap: any = {}
    const chainModuleNameMap: any = {}
    protocolAdaptors.forEach(p => {
      if (p.protocolType === 'chain') {
        chainModuleMap[p.module] = p
        chainModuleNameMap[p.module] = { id: p.id, id2: p.id2, displayName: p.displayName }
      }
    })
    // add chain logic
    Object.entries(config).forEach(([key, config]: any) => {
      if (!config.id) {
        console.info('Skipping', key, 'no id found'); return;
      }

      let { id, ...otherConfig } = config;
      const otherKeys = Object.keys(otherConfig)
      const rest: any = {}
      otherKeys.forEach(k => {
        switch (k) {
          case 'defaultChartView':
            rest[k] = otherConfig[k]
            break;
          case 'cleanRecordsConfig':
            const genuineSpikes = otherConfig.cleanRecordsConfig.genuineSpikes
            if (!genuineSpikes) break;
            const spikes: any = []
            Object.entries(genuineSpikes).forEach(([ts, bool]) => {
              if (bool) {
                spikes.push(ts)
              }
            })
            if (spikes.length)
              rest.genuineSpikes = spikes
            break;
          case 'category':
          case 'name':
          case 'displayName': break;
          default:
            console.log(adapterType, 'ignoring key: ' + k + ' in config for protocol ' + key)
        }
      })

      let metricData = key
      if (Object.keys(rest).length) metricData = { ...rest, adapter: key }


      const isChain = config.isChain || chainModuleMap[key]
      const configMap = isChain ? chainConfigMap : protocolConfigMap
      if (isChain) {
        id = chainModuleNameMap[key].displayName
        if (!id) {
          console.error('No chain name found for module', key, 'skipping')
          return;
        }
      }
      if (!configMap[id])
        configMap[id] = {}
      configMap[id][adapterType] = metricData
    })

  })

}

function transformChainSource() {

  const CHAIN_FILE = path.join(ROOT, "utils/normalizeChain.ts");
  console.log(`processing ${path.relative(ROOT, CHAIN_FILE)}`);
  const chainData = readFileSync(CHAIN_FILE, "utf8");
  const ast = parse(chainData, { parser: TS_PARSER });
  visit(ast, {
    visitVariableDeclaration(p) {
      const isChainCoingeckoIds = p.node.declarations?.find(d => d.id.name === 'chainCoingeckoIds');
      const init = isChainCoingeckoIds?.init.expression.expression;
      if (init?.type !== "ObjectExpression") return false;
      console.log(`Found chainCoingeckoIds with ${init.properties?.length} chains`);

      init.properties?.forEach((prop: any) => {
        if (isObjectProperty(prop) && prop.key && prop.value) {
          const chainLabel = isIdentifier(prop.key) ? prop.key.name :
            (isStringLiteral(prop.key) ? prop.key.value : null);

          if (chainLabel !== null && prop.value.type === "ObjectExpression") {
            // console.log(`Checking chain: ${chainLabel}`);

            // Check if we have data for this chain in chainConfigMap
            if (chainConfigMap[chainLabel]) {
              // console.log(`Found dimension data for ${chainLabel}`);
              matchingChainCount++;


              // Add dimensions field with chainConfigMap data
              addDimensionsField(prop, chainConfigMap[chainLabel]);
            }
          }
        }
      });
      return false;
    },
  });

  const chainDataOutput = print(ast).code;
  writeFile(CHAIN_FILE, chainDataOutput);
}


function injectDimensionsConfig(obj: R.namedTypes.ObjectExpression) {
  const protocolId = (obj.properties.find((p: any) => isObjectProperty(p, "id"))!.value as any).value;
  const protocolName = (obj.properties.find((p: any) => isObjectProperty(p, "name"))!.value as any).value;
  const protocolConfig = protocolConfigMap[protocolId];
  if (!protocolConfig) return;
  matchingProtocolCount++;
  // console.log('add dimensions config to', protocolName, protocolId,)
  addDimensionsField(obj, protocolConfig);
}


function addDimensionsField(prop: any, value: any) {
  const pValue = !prop?.value?.properties ? prop : prop.value;
  pValue.properties.push(
    b.objectProperty(
      b.identifier("dimensions"),
      valueToNode(value)
    )
  );
}

// Function to convert JS values to AST nodes
function valueToNode(val: any): any {
  if (typeof val === 'string') return b.stringLiteral(val);
  if (typeof val === 'number') return b.numericLiteral(val);
  if (typeof val === 'boolean') return b.booleanLiteral(val);
  if (val === null || val === undefined) return false
  if (Array.isArray(val)) return b.arrayExpression(val.map(item => valueToNode(item)));
  if (typeof val === 'object') {
    return b.objectExpression(
      Object.entries(val).map(([k, v]) =>
        b.objectProperty(toValidKeyNode(k), valueToNode(v))
      )
    );
  }
  return false
}


function isIdentifier(node: any, name?: string): node is R.namedTypes.Identifier {
  return node?.type === "Identifier" && (name ? node.name === name : true);
}

function isStringLiteral(node: any): node is R.namedTypes.StringLiteral {
  return node?.type === "StringLiteral";
}

function isObjectProperty(node: any, keyName?: string): node is R.namedTypes.ObjectProperty {
  return (
    node?.type === "ObjectProperty" &&
    (keyName
      ? (isIdentifier(node.key, keyName) || (isStringLiteral(node.key) && node.key.value === keyName))
      : true)
  );
}

function isArrayOfProtocol(node: any): boolean {
  const ann = node?.id?.typeAnnotation?.typeAnnotation;
  return (
    ann?.type === "TSArrayType" &&
    ann.elementType?.type === "TSTypeReference" &&
    ann.elementType.typeName?.type === "Identifier" &&
    ann.elementType.typeName.name === "Protocol"
  );
}


function transformSource(source: string): string {
  const ast = parse(source, { parser: TS_PARSER });

  visit(ast, {
    visitVariableDeclaration(p) {
      p.node.declarations?.forEach((d: any) => {
        if (!isArrayOfProtocol(d)) return;
        if (d.init?.type === "ArrayExpression") processProtocolArray(d.init);
      });
      return false;
    },
  });

  return print(ast).code;
}


function processProtocolArray(arr: R.namedTypes.ArrayExpression) {
  console.log("Processing array with", arr.elements?.length, "elements");
  arr.elements?.forEach((el: any) => {
    injectDimensionsConfig(el);
  });
}

function toValidKeyNode(name: string): R.namedTypes.Identifier | R.namedTypes.StringLiteral {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name) ? b.identifier(name) : b.stringLiteral(name);
}

function writeFile(filePath: string, content: string) {
  content = content.replace(/,\n+/g, ',\n')
  console.log('Writing to', path.relative(ROOT, filePath));
  if (WRITE_OUTPUT) writeFileSync(filePath, content, "utf8");
}