import { sendMessage } from "../../utils/discord";
import { IJSON } from "../data/types";

const webhooks = {
    dexs: process.env.VOLUMES_WEBHOOK,
    fees: process.env.FEES_WEBHOOK,
    derivatives: process.env.DERIVATIVES_WEBHOOK,
    aggregators: process.env.AGGREGATORS_WEBHOOK,
    options: process.env.OPTIONS_WEBHOOK,
} as IJSON<string>

export const sendDiscordAlert = async (message: string, type: string, formatted?: boolean) => sendMessage(message, webhooks[type], formatted)