# n8n-nodes-vokaai

[![npm version](https://img.shields.io/npm/v/n8n-nodes-vokaai.svg)](https://www.npmjs.com/package/n8n-nodes-vokaai)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Official **n8n community node** for the [Voka AI](https://vokaai.com) voice platform.

Trigger workflows on call events, pull call details and transcripts, and place outbound AI assistant calls — all without writing code.

---

## What's inside

### `Voka AI` — Action node

| Resource | Operation | What it does |
|---|---|---|
| Call | List | Page through calls with filters (direction, assistant, date range) |
| Call | Get | Fetch full detail for one call |
| Call | Get Transcript | Pull the transcript on demand (cached after first fetch) |
| Call | Place Outbound Call | Trigger an AI assistant to dial a number |
| Assistant | List | List voice assistants — drives dropdowns |
| Assistant | Get | Fetch one assistant by ID |

### `Voka AI Trigger` — Trigger node

REST Hook trigger. Subscribes to one or more events on activation, signs every incoming delivery with HMAC-SHA256, and emits the event into your workflow.

| Event | When it fires |
|---|---|
| `call.completed` | After a call ends and post-processing is complete |
| `call.insight.received` | When AI insights for a call have been processed |
| `call.transcript.ready` | Once the full transcript is ready (~30s after call end) |

---

## Installation

### Recommended: install via the n8n UI

1. In your n8n instance, go to **Settings → Community Nodes**
2. Click **Install**
3. Enter package name: `n8n-nodes-vokaai`
4. Confirm risks and click **Install**

The Voka AI node + Voka AI Trigger appear in the node panel after a brief reload.

### Manual install (self-hosted)

```bash
cd ~/.n8n/nodes
npm install n8n-nodes-vokaai
```

Restart n8n.

---

## Setup

### 1. Mint a Voka API key

In your Voka dashboard: **Integrations → API Keys → Create new key**.

Click the **Integration preset** button — it pre-checks the scopes n8n triggers and actions need (`read_assistants`, `read_calls`, `manage_webhooks`). Add `outbound_calls` if you'll be placing calls from n8n.

The full key is shown **once**. Copy it now.

### 2. Create the n8n credential

In any Voka AI node, click **Credential to connect with** → **Create new** → **Voka AI API**:

- **API Key** — paste the key you just minted
- **Base URL** — leave default (`https://voice.vokaai.com`)

n8n's connection test calls `GET /api/v1/auth/whoami` and labels the credential with your business name.

### 3. Use the nodes

**Action example — list recent inbound calls:**

1. Add a **Voka AI** node
2. Resource: `Call`, Operation: `List`
3. Open **Filters**, set Direction = `inbound`, Limit = `25`
4. Execute — returns the latest 25 inbound calls

**Trigger example — react to every completed call:**

1. Add a **Voka AI Trigger** node as the workflow start
2. Events: check `Call Completed`
3. Activate the workflow — n8n registers the webhook with Voka automatically
4. The next completed call fires the trigger; the event payload appears as input to downstream nodes

The trigger handles HMAC verification and replay protection automatically — you don't need to verify signatures yourself.

---

## Documentation

Full Voka API reference, event payloads, error codes, and changelog: **[docs.vokaai.com/docs/api](https://docs.vokaai.com/docs/api/intro)**

---

## Compatibility

- **Node.js:** 20.15+
- **n8n:** 1.x
- **Tested against:** n8n cloud + self-hosted, Voka API v1

---

## Support

- Bug reports + feature requests: [GitHub Issues](https://github.com/edryan04/n8n-nodes-vokaai/issues)
- Voka platform support: [support@vokaai.com](mailto:support@vokaai.com)
- Documentation: [docs.vokaai.com](https://docs.vokaai.com)

---

## Contributing

PRs welcome. Run locally:

```bash
git clone https://github.com/edryan04/n8n-nodes-vokaai.git
cd n8n-nodes-vokaai
npm install
npm run build
```

To test against a local n8n instance, link the package:

```bash
cd ~/.n8n/nodes
npm link n8n-nodes-vokaai
```

Restart n8n and your local changes appear in the node panel.

---

## License

[MIT](LICENSE)
