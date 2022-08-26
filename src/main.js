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
        const response = "```" + (yield dehydrat(jar.url)) + "```";
        message.channel.send(response);
    }
}));
let totalFiles = 0;
function dehydrat(url) {
    return __awaiter(this, void 0, void 0, function* () {
        totalFiles++;
        return new Promise((resolve, reject) => {
            let result = "";
            let unlinked = false;
            const fileName = `./temp${totalFiles}.jar`;
            downloadFile(url, fileName).then(() => {
                const proc = (0, child_process_1.spawn)(dehydratPath, [fileName]);
                proc.stdin.write("\n");
                proc.stdout.on("data", data => {
                    result += data.toString();
                });
                proc.on("close", code => {
                    resolve(result);
                    if (!unlinked)
                        (0, fs_1.unlinkSync)(fileName);
                    unlinked = true;
                });
                proc.on("exit", code => {
                    resolve(result);
                    if (!unlinked)
                        (0, fs_1.unlinkSync)(fileName);
                    unlinked = true;
                });
            });
        });
    });
}
function downloadFile(url, path) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            (0, child_process_1.spawn)("wget", [url, "-O", path]).on("close", code => {
                if (code === 0) {
                    resolve(null);
                }
                else {
                    reject(new Error("Download failed"));
                }
            });
        });
    });
}
client.login(token);
