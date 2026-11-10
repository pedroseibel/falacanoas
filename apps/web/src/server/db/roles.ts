import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { Client } from "pg";
import { devVar, VAULT_DEV_VARS, WEB_DEV_VARS } from "@fala/dev-vars";

/**
 * `bun run db:roles`, after the migrations: lets the app (fala_app), the vault (fala_cofre) and the
 * open-data API (fala_dados, which reads only the `dados` views) log in, each with the password in its
 * own connection string. In development, missing connection strings
 * are created first, with fresh random passwords, in the gitignored .dev.vars files: the old
 * `postgres` URL becomes DATABASE_ADMIN_URL. Nothing secret is printed.
 */
const WEB = WEB_DEV_VARS;
const VAULT = VAULT_DEV_VARS;

const read = (path: string) => (existsSync(path) ? readFileSync(path, "utf8") : "");
const setVar = (text: string, name: string, value: string) =>
  new RegExp(`^${name}=`, "m").test(text)
    ? text.replace(new RegExp(`^${name}=.*$`, "m"), `${name}=${value}`)
    : `${text}${text && !text.endsWith("\n") ? "\n" : ""}${name}=${value}\n`;

/** The same server and database, as another role ("role.projectref" on Supabase's pooler). */
function asRole(admin: string, role: string): string {
  const u = new URL(admin);
  const ref = u.username.split(".")[1];
  u.username = ref ? `${role}.${ref}` : role;
  u.password = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
  return u.toString();
}

let web = read(WEB);
let vault = read(VAULT);
const notes: string[] = [];

// Read DATABASE_ADMIN_URL itself here, not adminDatabaseUrl(): its fallback to a `postgres`
// DATABASE_URL would hide that the admin URL hasn't been saved yet, and DATABASE_URL is replaced below.
let admin = devVar("DATABASE_ADMIN_URL");
const appUrl = devVar("DATABASE_URL");
if (!admin && appUrl && new URL(appUrl).username.startsWith("postgres")) {
  admin = appUrl;
  web = setVar(web, "DATABASE_ADMIN_URL", admin);
  notes.push("apps/web/.dev.vars: DATABASE_ADMIN_URL (a antiga DATABASE_URL)");
}
if (!admin) throw new Error("Defina DATABASE_ADMIN_URL (o papel postgres) em apps/web/.dev.vars.");

const roles: { role: string; file: "web" | "vault"; name: string }[] = [
  { role: "fala_app", file: "web", name: "DATABASE_URL" },
  { role: "fala_cofre", file: "vault", name: "VAULT_DATABASE_URL" },
  { role: "fala_dados", file: "web", name: "DADOS_DATABASE_URL" },
];

const urls = new Map<string, string>();
for (const r of roles) {
  const current = devVar(r.name, r.file === "web" ? WEB : VAULT);
  if (current && new URL(current).username.startsWith(r.role)) {
    urls.set(r.role, current);
    continue;
  }
  const url = asRole(admin, r.role);
  urls.set(r.role, url);
  if (r.file === "web") web = setVar(web, r.name, url);
  else vault = setVar(vault, r.name, url);
  notes.push(`apps/${r.file}/.dev.vars: ${r.name} (${r.role})`);
}

const client = new Client({ connectionString: admin });
await client.connect();
await Promise.all(
  [...urls].map(async ([role, url]) => {
    // Identifiers are fixed above; the password is passed as a literal through format().
    const password = decodeURIComponent(new URL(url).password);
    const { rows } = await client.query<{ sql: string }>(
      "select format('alter role %I login password %L', $1::text, $2::text) as sql",
      [role, password],
    );
    const stmt = rows[0]?.sql;
    if (!stmt) throw new Error(`Não deu para preparar a senha de ${role}.`);
    await client.query(stmt);
  }),
);
await client.end();

writeFileSync(WEB, web, { mode: 0o600 });
if (vault) writeFileSync(VAULT, vault, { mode: 0o600 });
console.log(
  `Papéis com login: ${[...urls.keys()].join(", ")}.${notes.length ? `\nEscrito:\n- ${notes.join("\n- ")}` : ""}`,
);
