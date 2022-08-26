import { Client, ClientOptions, GatewayIntentBits, Message, Snowflake } from "discord.js";
import { existsSync, writeFileSync, createWriteStream, unlinkSync } from "fs";
import { spawn } from "child_process";

if (!existsSync("../config.json")) {
    throw new Error("Config file not found");
}

const { token, dehydratPath } = require("../config.json");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ],
} as ClientOptions);

client.once("ready", () => {
    console.log("Bot is ready");
});

client.on("messageCreate", async (message: Message) => {
    if (message.attachments.size === 0) return;
    const jars = message.attachments.filter(attachment => attachment.url.endsWith(".jar"));
    if (jars.size === 0) return;
    for (const [_, jar] of jars) {
        const response = "```" + await dehydrat(jar.url) + "```";
        message.channel.send(response);
    }
});

let totalFiles = 0;

async function dehydrat(url: string) {
    totalFiles++;
    return new Promise<string>((resolve, reject) => {
        let result = "";
        let unlinked = false;
        const fileName = `./temp${totalFiles}.jar`;
        downloadFile(url, fileName).then(() => {

            const proc = spawn(dehydratPath, [fileName]);
            proc.stdin.write("\n");
            proc.stdout.on("data", data => {
                result += data.toString();
            })
            proc.on("close", code => {
                resolve(result);
                if (!unlinked) unlinkSync(fileName);
                unlinked = true;
            });
            proc.on("exit", code => {
                resolve(result);
                if (!unlinked) unlinkSync(fileName);
                unlinked = true;
            });
        });
    });

}


async function downloadFile(url: string, path: string) {
    return new Promise((resolve, reject) => {
        spawn("wget", [url, "-O", path]).on("close", code => {
            if (code === 0) {
                resolve(null);
            } else {
                reject(new Error("Download failed"));
            }
        });
    });

}


client.login(token);
