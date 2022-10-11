import { sendMessage } from "../../utils/discord";

export const sendDiscordAlert = async (message: string) => sendMessage(message, process.env.VOLUMES_WEBHOOK!)