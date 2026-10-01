<img src="apps/web/public/brand/fortsprite.svg" alt="FortSprite logo" width="128" height="128" />

# FortSprite

A friend-first Fortnite Sprite collection tracker.

Production: [fortsprite.net](https://fortsprite.net). See [deployment setup](docs/vercel.md) for passkey configuration.

## Workspace

- `apps/web` owns the Next.js UI and mounts the Hono API at `/api`.
- `apps/api` owns Better Auth, application services, PostgreSQL, and Drizzle migrations.
- `packages/contracts` owns public API types.
- `packages/ui` owns shared shadcn components and theme tokens.

See [Code quality and organization](docs/code-quality.md) for module ownership, design decisions and verification findings.

See [Next.js rendering and navigation](docs/nextjs-optimization.md) for private data boundaries, Server Actions, optimistic updates, and the production navigation test rig.

## Use FortSprite with an LLM client

FortSprite provides two Streamable HTTP MCP endpoints.

| Endpoint | Use |
| --- | --- |
| `https://fortsprite.net/api/mcp/collection` | Personal collection access through OAuth sign-in. Recommended for ChatGPT and Claude connectors. Also accepts personal bearer keys. |
| `https://fortsprite.net/api/mcp` | Public catalog access without authentication, or personal collection access with a bearer key. |

Both provide `search_sprites` and `get_sprite`. Collection access adds `get_collection` and, when write access is granted, `set_collection_state` for your own ownership and mastery.

### ChatGPT and Claude with OAuth

For [ChatGPT developer mode](https://developers.openai.com/api/docs/guides/developer-mode), create a custom app with **`https://fortsprite.net/api/mcp/collection`** and select **OAuth** authentication. Use Dynamic Client Registration (DCR) when the client offers a registration choice. FortSprite registers the client automatically, so you do not need to supply a client ID or secret. Availability depends on your plan and workspace settings.

For [Claude web and desktop connectors](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp), add the same protected URL in connector settings, then choose **Connect**. Leave optional OAuth client ID and secret fields empty.

The client opens FortSprite for passkey sign-in and shows a consent screen with the assistant name, your username, requested permissions, and return host. Review the request, then choose **Allow access**. Enable the connected app in your conversation. Disconnect it from **Account → Connected assistants** to revoke collection access and refresh tokens.

Choose OAuth rather than Mixed Authentication in ChatGPT. The protected endpoint requires authentication during tool discovery. Personal keys remain useful for clients with custom bearer headers.

### Create a personal bearer key

Sign in at [fortsprite.net/account](https://fortsprite.net/account), then create a named key in **MCP access** and copy it before hiding it. Keys expire after 90 days and can be revoked there. For the environment variable examples below, set `FORTSPRITE_MCP_KEY` in the environment of the process that launches your client. Keep the real key out of committed configuration files.

### Codex

With `FORTSPRITE_MCP_KEY` set, register the server through the CLI.

```bash
codex mcp add fortsprite --url https://fortsprite.net/api/mcp \
  --bearer-token-env-var FORTSPRITE_MCP_KEY
```

Alternatively, add this to `~/.codex/config.toml`. Restart the client after changing its environment. Desktop clients must receive the variable too; exporting it in an unrelated terminal does not update an already running app.

```toml
[mcp_servers.fortsprite]
url = "https://fortsprite.net/api/mcp"
bearer_token_env_var = "FORTSPRITE_MCP_KEY"
```

For public catalog access, omit `bearer_token_env_var` or the CLI bearer option. See [Codex MCP configuration](https://developers.openai.com/codex/mcp).

### Claude Code

Merge this server into `.mcp.json` at your project root. Claude Code expands `${FORTSPRITE_MCP_KEY}` from its environment. Start Claude Code in that project and approve the server when prompted. Use `/mcp` to check its connection.

```json
{
  "mcpServers": {
    "fortsprite": {
      "type": "http",
      "url": "https://fortsprite.net/api/mcp",
      "headers": { "Authorization": "Bearer ${FORTSPRITE_MCP_KEY}" }
    }
  }
}
```

See [Claude Code MCP configuration](https://code.claude.com/docs/en/mcp#environment-variable-expansion-in-mcp-json).

### Cursor

Merge this into `~/.cursor/mcp.json` for personal use or `.cursor/mcp.json` for a project. Cursor uses `${env:NAME}` for environment variables. Restart Cursor with the variable available, then enable FortSprite in its MCP settings.

```json
{
  "mcpServers": {
    "fortsprite": {
      "url": "https://fortsprite.net/api/mcp",
      "headers": { "Authorization": "Bearer ${env:FORTSPRITE_MCP_KEY}" }
    }
  }
}
```

See [Cursor MCP configuration](https://cursor.com/docs/mcp#config-interpolation).

### VS Code with GitHub Copilot

Merge this into `.vscode/mcp.json`. Start the server from that file, enter your key in the hidden input prompt, and enable its tools in Copilot Chat's Agent mode. This example uses the VS Code extension host; Agent Host sessions do not forward servers that require interactive input.

```json
{
  "servers": {
    "fortsprite": {
      "type": "http",
      "url": "https://fortsprite.net/api/mcp",
      "headers": { "Authorization": "Bearer ${input:fortsprite-key}" }
    }
  },
  "inputs": [
    {
      "id": "fortsprite-key",
      "type": "promptString",
      "description": "FortSprite MCP key",
      "password": true
    }
  ]
}
```

See [VS Code MCP configuration](https://code.visualstudio.com/docs/agents/reference/mcp-configuration) for other configuration locations and Agent Host setup.

### Public catalog only

Use **`https://fortsprite.net/api/mcp`** without an Authorization header for public catalog tools. In ChatGPT choose **No Authentication**. In Claude add that URL without OAuth credentials. This connection exposes catalog tools only.

OAuth connects each person to their own collection. Claude's limited organization [request header beta](https://claude.com/docs/connectors/building/authentication#static-credentials-in-request-headers) shares one credential across members. A shared FortSprite key would make everyone act on its owner's collection.

### Try the tools

Ask your client to “Use FortSprite to find Birthday Sprites.” With a personal key, try “Show my missing Sprites” or “Mark the exact Sprite I select as owned, but not mastered.” Let it find the Sprite ID through the catalog before writing. Missing Sprites cannot be mastered. Refresh an already open FortSprite page to see remote changes.

FortSprite also registers WebMCP tools directly in supported browsers through `document.modelContext`. They use the signed-in browser session and need no remote key. WebMCP is experimental and requires browser support. See [MCP and browser tools](docs/mcp.md) for tool arguments, protocol details, browser support, and verification.

## Run locally

Use Node.js 22 and pnpm 10.28.2.

```bash
pnpm install
cp apps/web/.env.example apps/web/.env
```

Fill in the database, Better Auth, and passkey settings. `BETTER_AUTH_URL`, `WEB_ORIGIN`, and `PASSKEY_ORIGIN` are `http://localhost:3000` for local development, with `PASSKEY_RP_ID=localhost`.

Migration and import commands run in the API package. Supply those commands with the same server environment or copy the local settings to `apps/api/.env`.

```bash
pnpm --filter @fortsprite/api db:migrate
pnpm --filter @fortsprite/api catalog:import
pnpm dev
```

Open `http://localhost:3000`. Check `http://localhost:3000/api/v1/health` if the app cannot reach PostgreSQL.

Collection ownership and mastery are stored in PostgreSQL. Missing items cannot remain mastered. Friend availability derives from ownership and mutually accepted FortSprite sharing, with no per-item opt-in. The collection page and dashboard read saved counts.

Friends connect through exact FortSprite usernames, can accept collection sharing, compare both directions, and block or remove sharing. New accounts require a case-insensitively unique username and are created and accessed with passkeys only. Account settings support profile editing, additional passkeys, and confirmed deletion after a recent sign-in. The final passkey cannot be removed without deleting the account.

## Verify changes

```bash
pnpm lint
pnpm typecheck
pnpm build
```

Create a separate database whose name contains `test`, apply migrations to it, and supply its URL to the integration tests. Tests reject a missing test URL. They create their own fixtures and never use the normal app database.

```bash
DATABASE_URL="$TEST_DATABASE_URL" pnpm --filter @fortsprite/api db:migrate
TEST_DATABASE_URL="$TEST_DATABASE_URL" pnpm test
```

The automated suite verifies passkey-first account creation, local account behavior, and WebAuthn with a virtual authenticator. Platform passkeys still require verification on the deployed origin and supported production browsers.

## Catalog

The checked-in snapshot in `apps/web/public/sprites` records source URLs, verification dates, seasons, variants, exact drop chances, and local artwork paths. Runtime reads use PostgreSQL and do not scrape Fortnite.GG.

```bash
pnpm --filter @fortsprite/web catalog:validate
pnpm --filter @fortsprite/web catalog:sync-assets
```

Pass `--rarities=path/to/rarities.json` to approve a changed rarity vocabulary without an application release. The file is a JSON array of unique, nonempty labels. Unlisted values are rejected.

Catalog import is transactional and preserves database IDs on repeated imports. It rejects conflicting identities and does not delete missing records. Builds publish the source images referenced by the catalog in both development and production.

See [Deploy FortSprite to Vercel](docs/vercel.md) for deployment configuration and catalog artwork.

Browser tests use a separate authenticated fixture and an isolated Next build directory. Install Chromium once, then run them against the migrated test database.

```bash
pnpm --filter @fortsprite/web exec playwright install chromium
TEST_DATABASE_URL="$TEST_DATABASE_URL" pnpm --filter @fortsprite/web test:e2e
```
