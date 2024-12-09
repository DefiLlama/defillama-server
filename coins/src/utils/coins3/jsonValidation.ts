import Ajv from "ajv";

type Schema = {
  type: string;
  properties: { [prop: string]: { type: string } };
  required: string[];
  additionalProperties: Boolean;
};

const schemas: { [topic: string]: Schema } = {
  "coins-metadata": {
    type: "object",
    properties: {
      decimals: { type: "integer" },
      symbol: { type: "string" },
      address: { type: "string" },
      pid: { type: "string" },
      chain: { type: "string" },
      source: { type: "string" },
      redirect: { type: "string" },
    },
    required: ["decimals", "symbol", "address", "pid"],
    additionalProperties: false,
  },
  "coins-current": {
    type: "object",
    properties: {
      pid: { type: "string" },
      price: { type: "number" },
      confidence: { type: "number" },
      source: { type: "string" },
      mcap: { type: "number" },
    },
    required: ["pid", "price"],
    additionalProperties: false,
  },
  "coins-timeseries": {
    type: "object",
    properties: {
      ts: { type: "integer" },
      pid: { type: "string" },
      price: { type: "number" },
      confidence: { type: "number" },
      source: { type: "string" },
      mcap: { type: "number" },
    },
    required: ["ts", "pid", "price"],
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
