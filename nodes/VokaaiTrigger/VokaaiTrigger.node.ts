import {
	IDataObject,
	IHookFunctions,
	IWebhookFunctions,
	IWebhookResponseData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Convert the X-Voka-Timestamp header value into a millisecond UTC time.
 * Voka currently sends 10-digit Unix SECONDS (Stripe-style); fallbacks
 * handle 13-digit Unix ms and ISO-8601 in case the contract evolves.
 * Returns null when the value isn't recognized.
 */
function parseVokaTimestamp(raw: string | undefined): number | null {
	if (typeof raw !== 'string' || raw.length === 0) return null;
	if (/^\d{10}$/.test(raw)) return parseInt(raw, 10) * 1000;
	if (/^\d{13}$/.test(raw)) return parseInt(raw, 10);
	const parsed = Date.parse(raw);
	return Number.isNaN(parsed) ? null : parsed;
}

/**
 * VokaaiTrigger — REST Hook trigger that subscribes to Voka webhook events
 * via POST /api/v1/webhook-subscriptions and emits events into the n8n
 * workflow as they arrive.
 *
 * Lifecycle:
 *   - checkExists: GET /api/v1/webhook-subscriptions; match on URL + events
 *     to make subscription creation idempotent across workflow restarts
 *   - create: POST /api/v1/webhook-subscriptions; persist returned id +
 *     secret on the workflow's static data so we can unsubscribe + verify
 *     signatures later
 *   - delete: DELETE /api/v1/webhook-subscriptions/{id}
 *
 * Every incoming webhook is HMAC-SHA256-verified over `${timestamp}.${rawBody}`
 * before being emitted into the workflow. Replays older than 5 minutes are
 * rejected.
 */
export class VokaaiTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Voka AI Trigger',
		name: 'vokaaiTrigger',
		icon: 'file:vokaai.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].join(", ")}}',
		description: 'Receive Voka AI call events (completed, insight received, transcript ready)',
		defaults: {
			name: 'Voka AI Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'vokaaiApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: ['call.completed'],
				description: 'Voka events that will fire this trigger',
				options: [
					{
						name: 'Call Completed',
						value: 'call.completed',
						description: 'Fires after a call ends and post-processing is complete',
					},
					{
						name: 'Call Insight Received',
						value: 'call.insight.received',
						description: 'Fires when AI insights for a call are processed',
					},
					{
						name: 'Call Transcript Ready',
						value: 'call.transcript.ready',
						description:
							'Fires once the full transcript is ready (typically within ~30s of call.completed)',
					},
				],
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				placeholder: 'n8n production receiver',
				description: 'Optional label shown alongside the subscription on voice.vokaai.com',
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const events = this.getNodeParameter('events') as string[];
				const credentials = await this.getCredentials('vokaaiApi');

				const response = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					'vokaaiApi',
					{
						method: 'GET',
						url: `${credentials.baseUrl}/api/v1/webhook-subscriptions`,
						json: true,
					},
				)) as { data?: Array<{ id: string; url: string; events: string[] }> };

				const subscriptions = response.data ?? [];
				const eventsSorted = [...events].sort().join(',');
				const match = subscriptions.find(
					(sub) =>
						sub.url === webhookUrl &&
						[...sub.events].sort().join(',') === eventsSorted,
				);

				if (match) {
					const webhookData = this.getWorkflowStaticData('node');
					webhookData.subscriptionId = match.id;
					return true;
				}
				return false;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const events = this.getNodeParameter('events') as string[];
				const description = this.getNodeParameter('description') as string;
				const credentials = await this.getCredentials('vokaaiApi');

				if (!webhookUrl) {
					throw new NodeOperationError(
						this.getNode(),
						'Could not determine webhook URL — n8n must expose the webhook publicly for Voka to reach it.',
					);
				}

				const body: IDataObject = { url: webhookUrl, events };
				if (description) body.description = description;

				const postSubscribe = async () =>
					(await this.helpers.httpRequestWithAuthentication.call(this, 'vokaaiApi', {
						method: 'POST',
						url: `${credentials.baseUrl}/api/v1/webhook-subscriptions`,
						body,
						json: true,
					})) as { id: string; secret?: string };

				let response = await postSubscribe();

				// Idempotent-replay recovery: Voka returns the existing row WITHOUT
				// `secret` when (customer_id, url, events) already matches an active
				// subscription. Without a secret we can't HMAC-verify deliveries, so
				// tear down + recreate to force a fresh secret. Safe because the same
				// API key controls both sides.
				if (response.id && !response.secret) {
					try {
						await this.helpers.httpRequestWithAuthentication.call(this, 'vokaaiApi', {
							method: 'DELETE',
							url: `${credentials.baseUrl}/api/v1/webhook-subscriptions/${response.id}`,
							json: true,
						});
					} catch {
						/* fall through — re-POST will surface any real error */
					}
					response = await postSubscribe();
				}

				if (!response.id || !response.secret) {
					throw new NodeOperationError(
						this.getNode(),
						'Voka did not return a subscription id + secret. Check that your API key has the manage_webhooks scope.',
					);
				}

				const webhookData = this.getWorkflowStaticData('node');
				webhookData.subscriptionId = response.id;
				// Secret is returned exactly once — persist it for HMAC verification
				// on every incoming delivery.
				webhookData.signingSecret = response.secret;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const subscriptionId = webhookData.subscriptionId as string | undefined;
				if (!subscriptionId) return true;

				const credentials = await this.getCredentials('vokaaiApi');
				try {
					await this.helpers.httpRequestWithAuthentication.call(this, 'vokaaiApi', {
						method: 'DELETE',
						url: `${credentials.baseUrl}/api/v1/webhook-subscriptions/${subscriptionId}`,
						json: true,
					});
				} catch {
					// Best-effort delete: if the subscription is already gone (e.g. user
					// removed it from the dashboard) we still want to succeed locally.
				}

				delete webhookData.subscriptionId;
				delete webhookData.signingSecret;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const headers = this.getHeaderData() as Record<string, string | undefined>;
		const webhookData = this.getWorkflowStaticData('node');
		const signingSecret = webhookData.signingSecret as string | undefined;

		if (!signingSecret) {
			throw new NodeOperationError(
				this.getNode(),
				'No signing secret on file — re-activate the trigger to re-subscribe and capture a fresh secret.',
			);
		}

		const timestamp = headers['x-voka-timestamp'];
		const signature = headers['x-voka-signature-256'];
		if (!timestamp || !signature) {
			throw new NodeOperationError(
				this.getNode(),
				'Missing X-Voka-Timestamp or X-Voka-Signature-256 header. Did the request come from Voka?',
			);
		}

		// Replay protection: reject deliveries older than 5 minutes.
		// Voka sends Unix SECONDS in the header (per lib/webhooks/deliver.ts
		// on the platform); new Date(unixSecondsString) returns Invalid Date
		// and silently breaks the age check. parseVokaTimestamp handles all
		// three forms (seconds / ms / ISO) defensively.
		const tsMs = parseVokaTimestamp(timestamp);
		if (tsMs === null) {
			throw new NodeOperationError(
				this.getNode(),
				`Could not parse X-Voka-Timestamp header value "${timestamp}".`,
			);
		}
		const ageSeconds = Math.abs(Date.now() - tsMs) / 1000;
		if (ageSeconds > 300) {
			throw new NodeOperationError(
				this.getNode(),
				`X-Voka-Timestamp outside the 5-minute replay window (age=${ageSeconds.toFixed(0)}s).`,
			);
		}

		// Compute HMAC over `${timestamp}.${rawBody}`. n8n exposes the raw body
		// on the request object — we MUST hash the raw bytes, not a re-serialized
		// JSON, or whitespace differences invalidate the signature.
		const rawBody =
			(req as unknown as { rawBody?: Buffer }).rawBody?.toString('utf8') ??
			JSON.stringify(this.getBodyData());
		const baseString = `${timestamp}.${rawBody}`;
		const expectedHex = createHmac('sha256', signingSecret).update(baseString).digest('hex');

		const provided = Buffer.from(signature, 'hex');
		const computed = Buffer.from(expectedHex, 'hex');
		if (
			provided.length !== computed.length ||
			!timingSafeEqual(provided, computed)
		) {
			throw new NodeOperationError(this.getNode(), 'HMAC signature mismatch.');
		}

		const event = JSON.parse(rawBody);

		return {
			workflowData: [this.helpers.returnJsonArray([event as IDataObject])],
		};
	}
}
