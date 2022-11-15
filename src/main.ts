import betterLogging from "better-logging";
import {spawn} from "child_process";
import {
  Client,
  ClientOptions,
  GatewayIntentBits,
  Message,
  Snowflake,
  ActivityType
} from "discord.js";
import {
  createWriteStream,
  existsSync,
  readFileSync,
  unlinkSync,
  writeFileSync
} from "fs";
import {join} from "path";

betterLogging(console);

if (!existsSync(join(__dirname, "./config.json"))) {
  throw new Error("No config.json found");
}
const target_list: Map<string, [number, string]> = new Map([
    ["func_148254_d", [75, "Gets your session ID"]],
    ["awt/Robot", [15, "Takes a screenshot"]],
    ["squareup/okhttp", [80, "Sends data to an external server"]],
    ["launcher_accounts.json", [100, "Gets your hashed account credentials"]],
    [".minecraft/versions", [90, "Modifies vanilla minecraft"]],
    [".minecraft\\versions", [90, "Modifies vanilla minecraft"]],
    [".minecraft/mods", [15, "Adds mods to your mods folder"]],
    [".minecraft\\mods", [15, "Adds mods to your mods folder"]],
    ["Local Storage", [100, "Looks at your browser's cookies"]],
    ["leveldb", [100, "Looks at your browser's cookies"]],
    ["APPDATA", [80, "Accesses data from your computer programs"]],
    ["Google\\Chrome", [100, "Accesses your saved passwords from Chrome"]],
    ["Login Data", [100, "Accesses your saved passwords from your browsers"]],
    ["user.home", [10, "Gets your operating system"]],
    ["checkip.amazonaws", [100, "Gets your IP address"]],
    ["discord.com/api", [20, "Sends data through Discord"]],
    ["discordapp.com/api", [20, "Sends data through Discord"]],
    ["dropboxusercontent", [85, "Downloads files from Dropbox"]],
    ["drive.google", [85, "Downloads files from Google Drive"]],
]);

const {token, dehydratPath} =
    JSON.parse(readFileSync(join(__dirname, "./config.json"), "utf8"));

const client = new Client({
  intents : [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
} as ClientOptions);

client.once("ready", () => { 
    console.info("DehydBot is online");
    client.user?.setActivity(`${client.guilds.cache.size} servers for RATs`, {type: ActivityType.Watching});
});

client.on("messageCreate", async (message: Message) => {
  if (message.attachments.size === 0)
    return;
  const jars =
      message.attachments.filter(attachment => attachment.url.endsWith(".jar"));
  if (jars.size === 0)
    return;
  console.log(`Found ${jars.size} jar${jars.size === 1 ? "" : "s"}`);
  for (const [_, jar] of jars) {
    const name = new URL(jar.url).pathname.split("/").pop();
    const reply = message.reply({
      embeds : [ {
        title : `Scanning **${name}** for RATs...`,
        color : 0xcccc44,
      } ],
    });
    const response = await dehydrat(jar.url);
    const parsed: Map<string,string[]> = dehydratParse(response);

    let detections: string[] = [];
    let files: string[] = [];
    for (const [file, detections] of parsed) {
        for (const detection of detections) {
            if (!detections.includes(detection)) {
                detections.push(detection);
            }
        }
        files.push(file);
    }

    let permissions: string[] = [];
    for (let detection of detections) {
        if (target_list.has(detection) && !permissions.includes(detection)) {
            permissions.push(target_list.get(detection)![1]);
        }
    }

    const scores = detections.map(detection => target_list.get(detection)![0]);
    const score = Math.max(...scores);


    (await reply).edit({
            "embeds": [
                {
                    "title": `DehydRAT Scan Result`,
                    "description": `${parsed.size} suspicious item${parsed.size === 1 ? "" : "s"} found in **${name}**`,
                    "color": parsed.size ? 0xcc4444 : 0x44cc44,
                    "fields": parsed.size ? [
                        {
                            "name": `RAT-Score™`,
                            "value": `${score}%`
                        },
                        {
                            "name": `Permissions`,
                            "value": permissions.join("\n")
                        },
                        {
                            "name": `Detections`,
                            "value": detections.join("\n")
                        },
                        {
                            "name": `Files`,
                            "value": files.join("\n")
                        }
                    ] : []
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
  const proc = spawn(join(__dirname, dehydratPath), [ url ]);
  return new Promise<string>((resolve, reject) => {
    const chunks: string[] = [];
    proc.stdout.on("data", (chunk) => { chunks.push(chunk.toString()); })
    proc.on("exit", (code) => { resolve(chunks.join("")); })
        .on("error", (err) => { reject(err); })
        .on("close", (code) => { resolve(chunks.join("")); });
  });
}

client.login(token);
