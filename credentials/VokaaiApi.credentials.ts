import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

/**
 * Voka AI bearer-key credential.
 *
 * Used by both the Vokaai action node and the VokaaiTrigger webhook node.
 * The credential test hits /api/v1/auth/whoami — the canonical connection-
 * test endpoint — which requires no scope, so any valid key passes.
 */
export class VokaaiApi implements ICredentialType {
	name = 'vokaaiApi';

	displayName = 'Voka AI API';

	documentationUrl = 'https://docs.vokaai.com/docs/api/authentication';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description:
				'Mint a key at voice.vokaai.com → Integrations → API Keys. The key starts with voka_live_ for production or voka_test_ for sandbox.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://voice.vokaai.com',
			description:
				'Override only if you are testing against a Voka staging environment. Most users should leave this default.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/api/v1/auth/whoami',
			method: 'GET',
		},
	};
}
