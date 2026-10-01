# MCP and browser tools

FortSprite exposes the released Sprite catalog through Streamable HTTP at `/api/mcp`. Personal MCP keys also expose the key owner's collection reads and desired-state writes. The protected `/api/mcp/collection` endpoint supports OAuth sign-in for ChatGPT, Claude, and other remote clients. It also accepts personal keys. Session cookies do not authorize either remote MCP endpoint.

The endpoint uses `@modelcontextprotocol/server` 2.2.0. It supports protocol revisions `2026-07-28` and the SDK's legacy stateless HTTP clients. Modern requests include the `Mcp-Method` header and, for tool calls, the matching `Mcp-Name` header. Modern protocol responses use JSON. Legacy responses can use server-sent events. All responses use `Cache-Control: no-store`.

## Connect a remote client

1. Sign in to FortSprite and open **Account menu**, then **Profile**.
2. In **MCP access**, enter a key name and select **Create MCP key**.
3. Copy the displayed key. FortSprite shows the full key once.
4. Add the remote MCP URL to a client that supports custom request headers.
5. Set the `Authorization` header to `Bearer` followed by a space and your key.

The bearer-key endpoint is `https://fortsprite.net/api/mcp`. Local development uses `http://localhost:3000/api/mcp`. See the [README client setup recipes](../README.md#use-fortsprite-with-an-llm-client) for ChatGPT, Claude, Codex, Cursor, and VS Code Copilot.

Apply the database migrations before deployment. Migration `0009_mcp_account_keys.sql` adds the account-owned key table.

The following example uses the official TypeScript client.

```ts
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client"

const client = new Client({ name: "my-sprite-assistant", version: "1.0.0" })
const transport = new StreamableHTTPClientTransport(
	new URL("https://fortsprite.net/api/mcp"),
	{ authProvider: { token: async () => process.env.FORTSPRITE_MCP_KEY } },
)
await client.connect(transport)
const result = await client.callTool({
	name: "search_sprites",
	arguments: { search: "Birthday", limit: 25 },
})
await client.close()
```

Each key permits collection reads and writes for its owner. Keys expire after 90 days. **Revoke** removes a key's remote access immediately.

## OAuth connections

Use `https://fortsprite.net/api/mcp/collection` with OAuth authentication in hosted clients. Unauthenticated requests receive HTTP 401 and a `WWW-Authenticate` challenge pointing to the protected-resource metadata. This allows clients to discover the authorization server and start sign-in. The base `/api/mcp` endpoint continues to offer public discovery without starting OAuth.

FortSprite uses the official Better Auth OAuth provider. Clients register dynamically, then use the authorization-code flow with S256 PKCE. Users sign in with their existing passkey and approve a signed consent request. Only `collection:read`, `collection:write`, and `offline_access` are supported. Tokens are bound to the exact protected collection endpoint. OAuth tokens do not authorize browser sessions, profile edits, or key management.

Read-only grants expose `get_collection`. Editing collection state requires read and write scopes. `offline_access` permits automatic token refresh. Tokens remain tied to the authorizing account and consent. **Account → Connected assistants → Disconnect** removes the grant and its tokens. The assistant must obtain consent again to reconnect. In-flight writes can finish before a disconnect completes.

Apply migrations `0010` and `0011` before deploying the OAuth routes. They add the provider's storage and bind each authorization family to its consent record. Removing consent invalidates that family even when token refresh is in flight. OAuth uses the existing Better Auth secret and web origin, with no extra deployment credentials.

See the [OAuth client setup in the README](../README.md#chatgpt-and-claude-with-oauth). ChatGPT should use OAuth mode, because the protected endpoint authenticates discovery. Public catalog connections can use No Authentication with `/api/mcp`.

Remote writes persist immediately. An already open FortSprite page reads remote changes after refreshing or reloading.

## Tool reference

| Tool | Remote MCP | Browser WebMCP | Result |
| --- | --- | --- | --- |
| `search_sprites` | Public | Public | Released catalog page, total, next offset, and revision. |
| `get_sprite` | Public | Public | Details for an exact released Sprite ID. |
| `get_collection` | Personal key or OAuth read scope | Signed-in app | Saved collection page and full collection progress. |
| `set_collection_state` | Personal key or OAuth read/write scopes | Signed-in app | Saved entry and updated progress. |
| `get_friends` | Unavailable | Signed-in app | Sharing connections page and refresh time. |
| `compare_friend_collection` | Unavailable | Signed-in app | Sprites each accepted friend can provide to the other. |

All inputs reject unknown fields. Search text is limited to 120 characters. Variant and rarity labels are limited to 80 characters. Pages default to 25 items and accept `limit` from 1 to 100 and `offset` from 0 to 100,000. Sprite IDs are UUIDs from tool results. No tool accepts a user ID or an arbitrary URL.

`set_collection_state` accepts `spriteId` and the complete desired `state`.

```json
{
  "spriteId": "b0e7e940-b2c2-4669-997d-8b72cecb9755",
  "state": { "owned": true, "mastered": false }
}
```

Missing Sprites require `mastered` to be `false`. Repeating the same state preserves the entry timestamp. Collection tools retain the REST API's per-user read and write budgets and released-Sprite validation. An aborted request cannot undo a committed write.

The remote endpoint accepts requests without `Origin`. A supplied `Origin` must exactly match `WEB_ORIGIN`. The URL host and supplied `Host` must match the configured web host. Request bodies are limited to 16 KiB. Invalid supplied credentials receive HTTP 401.

## Browser registration

FortSprite registers tools through `document.modelContext` when the browser exposes that API. Public tools belong to the root layout. Session tools belong to the authenticated app shell. Each registration uses an `AbortSignal`, so leaving the app shell removes its session tools.

Browser reads use same-origin credentials and bypass fetch caching. Writes use the collection Server Action, which invalidates private collection data and refreshes the current view. Successful writes notify other tabs through the existing BroadcastChannel.

Browsers without WebMCP load normally. WebMCP remains an experimental browser API. The native integration suite enables Chromium's `WebMCP`, `WebMCPTesting`, and `DevToolsWebMCPSupport` features. Chromium 153 requires serialized JSON arguments for `executeTool`.

## Verification

`apps/api/tests/mcp.test.ts` exercises initialization, discovery, catalog filtering, pagination, collection isolation, repeated writes, and transport rejection. `apps/web/tests/webmcp.test.ts` exercises registration cleanup and argument validation. `apps/web/tests/webmcp.spec.ts` executes native browser tools against isolated accounts and checks rendered collection state, persistence, navigation, sign-out, and cross-tab refresh.

`apps/api/tests/mcp-keys.test.ts` checks real key ownership, hashing, permissions, expiry, and revocation. `apps/web/tests/mcp-keys.spec.ts` creates a key from Account, copies it, edits collection state through remote MCP, and verifies revoked access.

`apps/api/tests/mcp-oauth.test.ts` exercises OAuth discovery, dynamic registration, signed consent, PKCE, refresh, and disconnection against an isolated database. `apps/web/tests/mcp-oauth.spec.ts` follows passkey sign-in and consent in a real browser, edits collection status through the issued bearer token, and disconnects the assistant from Account.

```bash
TEST_DATABASE_URL=postgresql://localhost/fortsprite_test pnpm --filter @fortsprite/api test
pnpm --filter @fortsprite/web test
TEST_DATABASE_URL=postgresql://localhost/fortsprite_test pnpm --filter @fortsprite/web exec playwright test --config playwright.webmcp.config.ts
```
