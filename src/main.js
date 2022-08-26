"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const fs_1 = require("fs");
const child_process_1 = require("child_process");
if (!(0, fs_1.existsSync)("../config.json")) {
    throw new Error("Config file not found");
}
const { token, dehydratPath } = require("../config.json");
const client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.GuildMembers,
        discord_js_1.GatewayIntentBits.MessageContent
    ],
});
client.once("ready", () => {
    console.log("Bot is ready");
});
client.on("messageCreate", (message) => __awaiter(void 0, void 0, void 0, function* () {
    if (message.attachments.size === 0)
        return;
    const jars = message.attachments.filter(attachment => attachment.url.endsWith(".jar"));
    if (jars.size === 0)
        return;
    for (const [_, jar] of jars) {
        const response = yield dehydrat(jar.url);
        const parsed = dehydratParse(response);
        let fields = [];
        for (const [key, value] of parsed) {
            fields.push({ name: key, value: value.join(", ") });
        }
        message.channel.send({
            embeds: [
                {
                    "title": `DehydRAT Scan Result`,
                    "color": parsed.size ? 0xcc4444 : 0x44cc44,
                    fields,
                }
            ]
        });
    }
}));
function dehydratParse(data) {
    let lines = data.split("\n");
    if (lines.length % 2 !== 0) {
        lines.pop();
    }
    const result = new Map();
    for (let i = 0; i < lines.length; i += 2) {
        result.set(lines[i], JSON.parse(lines[i + 1]));
    }
    return result;
}
function dehydrat(url) {
    return __awaiter(this, void 0, void 0, function* () {
        const proc = (0, child_process_1.spawn)(dehydratPath, [url]);
        return new Promise((resolve, reject) => {
            const chunks = [];
            proc.stdout.on("data", (chunk) => {
                chunks.push(chunk.toString());
            });
            proc.on("exit", (code) => {
                resolve(chunks.join(""));
            }).on("error", (err) => {
                reject(err);
            }).on("close", (code) => {
                resolve(chunks.join(""));
            });
        });
    });
}
client.login(token);
