import { INodeType, INodeTypeDescription } from 'n8n-workflow';

/**
 * Vokaai — declarative-style action node.
 *
 * Consumes the Voka public REST API documented at
 * https://docs.vokaai.com/docs/api. Two resources:
 *
 *   Call:
 *     - List           GET    /api/v1/calls
 *     - Get            GET    /api/v1/calls/{id}
 *     - Get Transcript GET    /api/v1/calls/{id}/transcript
 *     - Place Outbound POST   /api/v1/outbound-calls
 *
 *   Assistant:
 *     - List           GET    /api/v1/assistants
 *     - Get            GET    /api/v1/assistants?id={id}
 *
 * Auth via VokaaiApi credential (bearer token + base URL).
 */
export class Vokaai implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Voka AI',
		name: 'vokaai',
		icon: 'file:vokaai.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Read calls + transcripts and place outbound AI assistant calls via the Voka API',
		defaults: {
			name: 'Voka AI',
		},
		// Literal 'main' rather than NodeConnectionType enum — n8n-workflow 2.x
		// exports NodeConnectionType as type-only, so the runtime value is the
		// raw string. Both forms render identically in the n8n UI.
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'vokaaiApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: '={{$credentials.baseUrl}}',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			// ─── Resource picker ───────────────────────────────────────
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Call', value: 'call' },
					{ name: 'Assistant', value: 'assistant' },
				],
				default: 'call',
			},

			// ─── Call operations ───────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['call'] } },
				options: [
					{
						name: 'List',
						value: 'list',
						action: 'List calls',
						description: 'List calls with optional filters',
						routing: {
							request: { method: 'GET', url: '/api/v1/calls' },
						},
					},
					{
						name: 'Get',
						value: 'get',
						action: 'Get a call',
						description: 'Fetch full detail for one call by ID',
						routing: {
							request: {
								method: 'GET',
								url: '=/api/v1/calls/{{$parameter["callId"]}}',
							},
						},
					},
					{
						name: 'Get Transcript',
						value: 'getTranscript',
						action: 'Get call transcript',
						description: 'Pull the transcript on demand (cached after first fetch)',
						routing: {
							request: {
								method: 'GET',
								url: '=/api/v1/calls/{{$parameter["callId"]}}/transcript',
							},
						},
					},
					{
						name: 'Place Outbound Call',
						value: 'placeOutbound',
						action: 'Place outbound call',
						description: 'Trigger an AI assistant to dial a number',
						routing: {
							request: {
								method: 'POST',
								url: '/api/v1/outbound-calls',
							},
						},
					},
				],
				default: 'list',
			},

			// ─── Assistant operations ──────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['assistant'] } },
				options: [
					{
						name: 'List',
						value: 'list',
						action: 'List assistants',
						description: 'List voice assistants — used to populate dropdowns',
						routing: {
							request: { method: 'GET', url: '/api/v1/assistants' },
						},
					},
					{
						name: 'Get',
						value: 'get',
						action: 'Get an assistant',
						description: 'Fetch one assistant by ID',
						routing: {
							request: {
								method: 'GET',
								url: '/api/v1/assistants',
								qs: { id: '={{$parameter["assistantId"]}}' },
							},
						},
					},
				],
				default: 'list',
			},

			// ─── Call: id parameter (Get + Get Transcript) ─────────────
			{
				displayName: 'Call ID',
				name: 'callId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: { resource: ['call'], operation: ['get', 'getTranscript'] },
				},
				description: 'UUID of the call (from a List Calls result or a webhook payload)',
			},

			// ─── Call: List filters ────────────────────────────────────
			{
				displayName: 'Filters',
				name: 'filters',
				type: 'collection',
				placeholder: 'Add filter',
				default: {},
				displayOptions: {
					show: { resource: ['call'], operation: ['list'] },
				},
				// n8n's linter requires collection items alphabetized by `name`.
				options: [
					{
						displayName: 'Assistant ID',
						name: 'assistantId',
						type: 'string',
						default: '',
						description: 'UUID of the assistant to filter by',
						routing: { send: { type: 'query', property: 'assistant_id' } },
					},
					{
						displayName: 'Cursor',
						name: 'cursor',
						type: 'string',
						default: '',
						description: 'Pagination cursor from a previous response',
						routing: { send: { type: 'query', property: 'cursor' } },
					},
					{
						displayName: 'Direction',
						name: 'direction',
						type: 'options',
						options: [
							{ name: 'Inbound', value: 'inbound' },
							{ name: 'Outbound', value: 'outbound' },
						],
						default: 'inbound',
						routing: { send: { type: 'query', property: 'direction' } },
					},
					{
						displayName: 'From (ISO 8601)',
						name: 'from',
						type: 'string',
						default: '',
						placeholder: '2026-05-01T00:00:00Z',
						description: 'Inclusive lower bound on started_at',
						routing: { send: { type: 'query', property: 'from' } },
					},
					{
						displayName: 'Limit',
						name: 'limit',
						type: 'number',
						typeOptions: { minValue: 1 },
						default: 50,
						description: 'Max number of results to return',
						routing: { send: { type: 'query', property: 'limit' } },
					},
					{
						displayName: 'To (ISO 8601)',
						name: 'to',
						type: 'string',
						default: '',
						placeholder: '2026-05-31T23:59:59Z',
						description: 'Inclusive upper bound on started_at',
						routing: { send: { type: 'query', property: 'to' } },
					},
				],
			},

			// ─── Call: Place Outbound parameters ───────────────────────
			{
				displayName: 'Assistant ID',
				name: 'outboundAssistantId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: { resource: ['call'], operation: ['placeOutbound'] },
				},
				description: 'UUID of the assistant that will place the call',
				routing: { send: { type: 'body', property: 'assistant_id' } },
			},
			{
				displayName: 'To Number',
				name: 'toNumber',
				type: 'string',
				required: true,
				default: '',
				placeholder: '+12025551111',
				displayOptions: {
					show: { resource: ['call'], operation: ['placeOutbound'] },
				},
				description: 'E.164-formatted phone number to dial',
				routing: { send: { type: 'body', property: 'to' } },
			},
			{
				displayName: 'Additional Fields',
				name: 'outboundExtras',
				type: 'collection',
				placeholder: 'Add field',
				default: {},
				displayOptions: {
					show: { resource: ['call'], operation: ['placeOutbound'] },
				},
				options: [
					{
						displayName: 'Callback URL',
						name: 'callbackUrl',
						type: 'string',
						default: '',
						placeholder: 'https://your-app.example.com/voka/callback',
						description: 'URL to POST status updates to as the call progresses',
						routing: { send: { type: 'body', property: 'callback_url' } },
					},
					{
						displayName: 'Variables (JSON)',
						name: 'variables',
						type: 'json',
						default: '{}',
						description:
							'Dynamic variables interpolated into the assistant prompt (e.g. customer name)',
						routing: { send: { type: 'body', property: 'variables' } },
					},
					{
						displayName: 'Metadata (JSON)',
						name: 'metadata',
						type: 'json',
						default: '{}',
						description:
							'Opaque metadata round-tripped through to the call.completed webhook',
						routing: { send: { type: 'body', property: 'metadata' } },
					},
				],
			},

			// ─── Assistant: Get parameter ──────────────────────────────
			{
				displayName: 'Assistant ID',
				name: 'assistantId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: { resource: ['assistant'], operation: ['get'] },
				},
				description: 'UUID of the assistant to fetch',
			},
		],
	};
}
