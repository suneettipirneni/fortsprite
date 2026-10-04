# FortSprite plugin

This private plugin connects to FortSprite's existing hosted MCP server. It includes the FortSprite icon, catalog and collection workflow instructions, and one Streamable HTTP connection with OAuth discovery.

## Use it

Open the saved FortSprite plugin, install it, and connect your FortSprite account through the host's OAuth flow. Sign in with your existing FortSprite passkey and approve the requested collection access. Read-only consent supports collection reads; updating ownership and mastery requires read and write consent. Each person connects their own account.

Try these prompts:

- “Show my collection progress and the Sprites I am missing.”
- “Find Birthday Sprites and show their details.”
- “Mark this Sprite as mastered.”

The endpoint is `https://fortsprite.net/api/mcp/collection`. It provides `search_sprites` and `get_sprite`, plus `get_collection` with read access and `set_collection_state` with read/write access. Collection access is bound to the consenting account. The plugin does not include credentials or manage friend sharing, profiles, or MCP keys.

Saved collection updates persist immediately. Refresh an already open FortSprite page to see remote changes. To revoke access, open **Account → Connected assistants → Disconnect** in FortSprite.

## Package

The directory uses Agent Plugins 1.0: `plugin.json`, `mcp.json`, `skills/`, and the referenced `assets/icon.png`. Create an archive containing this single `fortsprite/` directory; keep the archive outside the source directory. Save it as a private plugin with Plugin Creator. Public directory submission is a separate workflow.

The public catalog-only endpoint, `https://fortsprite.net/api/mcp`, remains available for clients that need anonymous catalog access. This package uses the OAuth endpoint so one connection can also access the user's collection.
