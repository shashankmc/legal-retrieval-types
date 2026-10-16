// Provider-neutral runtime contracts for a configurable legal search form.
//
// A *provider* is a service a form can search through (Legal Data Hunter, Case
// Law Explorer, a BlueLab service, …). A *database* is a corpus that provider
// exposes (case law, legislation, doctrine, …). A *source* is a concrete
// registry inside a database (e.g. "FR/Judilibre").
//
// These are contracts only: no client, no request, no credential. The browser
// never reaches a provider directly — a host adapter (typically a server-side
// MCP bridge) implements `LegalSearchAdapter` and the form calls that.
/** The operations a renderer is expected to understand out of the box. */
export const PROVIDER_OPERATIONS = [
    'search',
    'getDocument',
    'resolveReference',
    'reportSourceIssue',
    'discoverCountries',
    'discoverSources',
    'getFilters',
];
/**
 * A normalized provider failure. Adapters throw this so the form can render a
 * stable message without knowing the provider's transport details.
 */
export class ProviderOperationError extends Error {
    constructor(code, message, options = {}) {
        super(message);
        this.name = 'ProviderOperationError';
        this.code = code;
        this.operation = options.operation;
        this.provider = options.provider;
        this.retryAfterSeconds = options.retryAfterSeconds;
        this.details = options.details;
    }
}
/** Whether a value is one of the known provider operations. */
export function isKnownProviderOperation(value) {
    return typeof value === 'string' && PROVIDER_OPERATIONS.includes(value);
}
//# sourceMappingURL=provider.js.map