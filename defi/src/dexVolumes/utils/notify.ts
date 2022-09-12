import { sendMessage } from "../../utils/discord";

const sendDiscordAlert = (message: string) => sendMessage(message, process.env.VOLUMES_WEBHOOK!)