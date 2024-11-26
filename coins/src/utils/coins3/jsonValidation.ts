import Ajv from "ajv";

type Schema = {
  type: string;
  properties: { [prop: string]: { type: string } };
  required: string[];
  additionalProperties: Boolean;
};

const schemas: { [topic: string]: Schema } = {
  metadata: {
    type: "object",
    properties: {
      decimals: { type: "integer" },
      symbol: { type: "string" },
      address: { type: "string" },
      pid: { type: "string" },
      chain: { type: "string" },
      source: { type: "string" },
    },
    required: ["decimals", "symbol", "address", "pid", "chain"],
    additionalProperties: false,
  },
  current: {
    type: "object",
    properties: {
      pid: { type: "string" },
      price: { type: "number" },
      confidence: { type: "number" },
      source: { type: "string" },
    },
    required: ["pid", "price", "confidence", "source"],
    additionalProperties: false,
  },
  timeseries: {
    type: "object",
    properties: {
      ts: { type: "integer" },
      pid: { type: "string" },
      price: { type: "number" },
      confidence: { type: "number" },
      source: { type: "string" },
    },
    required: ["ts", "pid", "price", "confidence", "source"],
    additionalProperties: false,
  },
};

const ajv = new Ajv();

export function validate(data: object, topic: Topic) {
  const comp = ajv.compile(schemas[topic]);
  const valid = comp(data);
  if (!valid) {
    console.log(comp.errors);
    throw new Error(`${topic} validation error`);
  }
}

export const topics: string[] = Object.keys(schemas);
export type Topic = keyof typeof schemas;
