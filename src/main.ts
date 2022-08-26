import { Client, ClientOptions, GatewayIntentBits, Message, Snowflake } from "discord.js";
import { existsSync, writeFileSync, createWriteStream, unlinkSync, readFileSync } from "fs";
import { join } from "path";
import { spawn } from "child_process";
import betterLogging from "better-logging";
betterLogging(console);

if (!existsSync(join(__dirname, "./config.json"))) {
    throw new Error("No config.json found");
}

const { token, dehydratPath } = JSON.parse(readFileSync(join(__dirname, "./config.json"), "utf8"));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
    ],
} as ClientOptions);

client.once("ready", () => {
    console.info("DehydBot is online");
});

client.on("messageCreate", async (message: Message) => {
    if (message.attachments.size === 0) return;
    const jars = message.attachments.filter(attachment => attachment.url.endsWith(".jar"));
    if (jars.size === 0) return;
    console.log(`Found ${jars.size} jar${jars.size === 1 ? "" : "s"}`);
    for (const [_, jar] of jars) {
        const response = await dehydrat(jar.url);
        const parsed = dehydratParse(response);

        let fields: { name: string, value: string }[] = [];
        for (const [key, value] of parsed) {
            fields.push({ name: key, value: value.join(", ") });
        }

        message.reply({
            embeds: [
                {
                    title: `DehydRAT Scan Result`,
                    description: `${parsed.size} suspicious item${parsed.size === 1 ? "" : "s"} found`,
                    color: parsed.size ? 0xcc4444 : 0x44cc44,
                    fields,
                }
            ]
        });
    }
});

function dehydratParse(data: string) {
    let lines = data.split("\n");
    if (lines.length % 2 !== 0) {
        lines.pop();
    }
    const result = new Map<string, string[]>();
    for (let i = 0; i < lines.length; i += 2) {
        result.set(lines[i], JSON.parse(lines[i + 1]));
    }
    return result;
}




async function dehydrat(url: string) {
    const proc = spawn(join(__dirname, dehydratPath), [url]);
    return new Promise<string>((resolve, reject) => {
        const chunks: string[] = [];
        proc.stdout.on("data", (chunk) => {
            chunks.push(chunk.toString());
        })
        proc.on("exit", (code) => {
            resolve(chunks.join(""));
        }).on("error", (err) => {
            reject(err);
        }).on("close", (code) => {
            resolve(chunks.join(""));
        });
    });
}


client.login(token);
