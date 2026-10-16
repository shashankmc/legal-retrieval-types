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

import type { FieldDescriptor, ResultViewRef } from './dataset.js'
import type {
  MethodDescriptor,
  RetrievalProviderCapabilities,
  RetrievalTransportConfig,
} from './retrieval.js'

/** One operation a provider adapter can perform. */
export type ProviderOperation =
  | 'search'
  | 'getDocument'
  | 'resolveReference'
  | 'reportSourceIssue'
  | 'discoverCountries'
  | 'discoverSources'
  | 'getFilters'

/** The operations a renderer is expected to understand out of the box. */
export const PROVIDER_OPERATIONS: ProviderOperation[] = [
  'search',
  'getDocument',
  'resolveReference',
  'reportSourceIssue',
  'discoverCountries',
  'discoverSources',
  'getFilters',
]

/** What a provider says it can do, so the UI can hide what it cannot. */
export interface ProviderCapabilities extends RetrievalProviderCapabilities {
  /** Operations this provider implements. Omitted = unknown, offer all. */
  operations?: ProviderOperation[]
  /** Whether search supports cursor/offset pagination. */
  supportsPagination?: boolean
  /** Whether full document text can be fetched. */
  supportsFullText?: boolean
  /** Whether the provider exposes discovery (countries/sources/filters). */
  supportsDiscovery?: boolean
}

/** One selectable value from provider discovery (country, source, court, …). */
export interface DiscoveryOption {
  value: string
  label: string
  description?: string
  /** Document or source count when the provider reports one. */
  count?: number
  /** Shown but not selectable. */
  disabled?: boolean
  metadata?: Record<string, unknown>
}

/**
 * A corpus a provider exposes: case law, legislation, doctrine, or another
 * provider-defined namespace.
 */
export interface LegalDatabaseDescriptor {
  id: string
  label: string
  /** Id of the provider that serves this database. */
  provider: string
  /** Coarse family, e.g. "case-law" | "legislation" | "doctrine" | string. */
  kind?: string
  description?: string
  /** Shown but not selectable. */
  disabled?: boolean
  /** Namespaces this database maps to at the provider, when it has them. */
  namespaces?: string[]
  /** Declarative field schema: which controls the form renders and what they collect. */
  fields?: FieldDescriptor[]
  /** Result view used for this database unless the user picks another. */
  defaultResultView?: ResultViewRef
}

/**
 * A provider the form can search through. Carries the retrieval configuration a
 * transport-backed host needs (`transport` / `methods`) as well as the discovery
 * capabilities a provider-driven host advertises.
 */
export interface LegalSearchProviderDescriptor {
  id: string
  label: string
  /** Provider family, e.g. "legal-data-hunter" | "case-law" | string. */
  type: string
  description?: string
  /** Shown but not selectable. */
  disabled?: boolean
  /** Why the provider cannot be used, when known. */
  unavailableReason?: string
  capabilities?: ProviderCapabilities
  /** Database selected when this provider becomes active. */
  defaultDatabase?: string
  /** Transport endpoints for a transport-backed host. */
  transport?: RetrievalTransportConfig
  /** Retrieval methods this provider offers, with their backend dependencies. */
  methods?: MethodDescriptor[]
  metadata?: Record<string, unknown>
}

/** A single result from a provider search, normalized to one shape. */
export interface NormalizedSearchHit {
  /** Stable id within the provider's result set. */
  id: string
  provider: string
  database: string
  /** Source registry, e.g. "FR/Judilibre". */
  source: string
  /** Document id within the source. */
  sourceId: string
  title: string
  snippet?: string
  score?: number
  /** Link to the official text. */
  url?: string
  date?: string
  country?: string
  language?: string
  /** Source-specific fields (court, ecli, case number, …). */
  metadata: Record<string, unknown>
  /** The provider's untouched hit, for advanced host views. */
  raw?: unknown
}

/** A provider search response, normalized. */
export interface NormalizedSearchResult {
  provider: string
  database: string
  query?: string
  hits: NormalizedSearchHit[]
  totalHits?: number
  /** True when the provider reported the result set was truncated or partial. */
  partial?: boolean
  warnings?: string[]
  cursor?: string
  nextCursor?: string
  elapsedMs?: number
  raw?: unknown
}

/** A full document, normalized. */
export interface NormalizedLegalDocument {
  provider: string
  database: string
  source: string
  sourceId: string
  title: string
  text?: string
  /** Set when full text was requested but could not be loaded. */
  textUnavailable?: boolean
  /** Set when the returned text was truncated. */
  textTruncated?: boolean
  /** Original text length when the text is bounded. */
  fullTextSize?: number
  url?: string
  date?: string
  country?: string
  language?: string
  metadata: Record<string, unknown>
  raw?: unknown
}

/** How confidently a loose citation matched a document. */
export type ReferenceMatchType =
  | 'exact'
  | 'ambiguous'
  | 'pattern'
  | 'title_search'
  | 'fallback_search'
  | (string & {})

/** The outcome of resolving one loose legal citation. */
export interface ResolvedLegalReference {
  reference: string
  matchType: ReferenceMatchType
  /** Matching documents, best first. More than one means ambiguous. */
  hits: NormalizedSearchHit[]
  raw?: unknown
}

/** The issue kinds a host can report back to a provider. */
export type SourceIssueType =
  | 'unavailable'
  | 'indexing'
  | 'invalid_url'
  | 'data_quality'
  | 'other'

/** The filter values a provider reports for one source. */
export interface ProviderFilterSet {
  /** Source these filters describe, when scoped to one. */
  source?: string
  courts?: DiscoveryOption[]
  jurisdictions?: DiscoveryOption[]
  chambers?: DiscoveryOption[]
  decisionTypes?: DiscoveryOption[]
  languages?: DiscoveryOption[]
  courtTiers?: DiscoveryOption[]
  subdivisions?: DiscoveryOption[]
  /** Date bounds the source accepts, as ISO `YYYY-MM-DD`. */
  dateRange?: { min?: string; max?: string }
  raw?: unknown
}

/** Stable error codes a host maps provider failures onto. */
export type ProviderOperationErrorCode =
  | 'AUTH_REQUIRED'
  | 'PERMISSION_DENIED'
  | 'RATE_LIMITED'
  | 'PROVIDER_UNAVAILABLE'
  | 'INVALID_CONFIGURATION'
  | 'INVALID_REQUEST'
  | 'OPERATION_UNSUPPORTED'
  | 'NETWORK_ERROR'
  | (string & {})

/**
 * A normalized provider failure. Adapters throw this so the form can render a
 * stable message without knowing the provider's transport details.
 */
export class ProviderOperationError extends Error {
  readonly code: ProviderOperationErrorCode
  readonly operation?: ProviderOperation
  readonly provider?: string
  /** Seconds to wait before retrying, when the provider reported it. */
  readonly retryAfterSeconds?: number
  readonly details?: Record<string, unknown>

  constructor(
    code: ProviderOperationErrorCode,
    message: string,
    options: {
      operation?: ProviderOperation
      provider?: string
      retryAfterSeconds?: number
      details?: Record<string, unknown>
    } = {},
  ) {
    super(message)
    this.name = 'ProviderOperationError'
    this.code = code
    this.operation = options.operation
    this.provider = options.provider
    this.retryAfterSeconds = options.retryAfterSeconds
    this.details = options.details
  }
}

/** Fields every adapter request carries. */
export interface ProviderRequestBase {
  provider: string
  database: string
}

export interface DiscoverSourcesRequest extends ProviderRequestBase {
  /** Country code to scope sources to, when the provider supports it. */
  country?: string
}

export interface GetFiltersRequest extends ProviderRequestBase {
  source: string
}

export interface ProviderSearchRequest extends ProviderRequestBase {
  /** Collected field values, keyed by `FieldDescriptor.key`. */
  params: Record<string, unknown>
  cursor?: string
}

export interface GetDocumentRequest extends ProviderRequestBase {
  source: string
  sourceId: string
}

export interface ResolveReferenceRequest extends ProviderRequestBase {
  reference: string
  hintCountry?: string
  hintType?: string
}

export interface ReportSourceIssueRequest extends ProviderRequestBase {
  source: string
  issueType: SourceIssueType
  description?: string
}

/**
 * The one contract a host implements to make a provider searchable. The form
 * never calls a provider itself; it calls this adapter, which is normally backed
 * by a server-side MCP bridge that holds the credential.
 */
export interface LegalSearchAdapter {
  /** Optional: fetch the manifest the form should render. */
  loadManifest?(): Promise<unknown>
  discoverCountries?(request: DiscoverSourcesRequest): Promise<DiscoveryOption[]>
  discoverSources?(request: DiscoverSourcesRequest): Promise<DiscoveryOption[]>
  getFilters?(request: GetFiltersRequest): Promise<ProviderFilterSet>
  search(request: ProviderSearchRequest): Promise<NormalizedSearchResult>
  getDocument?(request: GetDocumentRequest): Promise<NormalizedLegalDocument>
  resolveReference?(request: ResolveReferenceRequest): Promise<ResolvedLegalReference[]>
  reportSourceIssue?(request: ReportSourceIssueRequest): Promise<void>
}

/** Whether a value is one of the known provider operations. */
export function isKnownProviderOperation(value: unknown): value is ProviderOperation {
  return typeof value === 'string' && (PROVIDER_OPERATIONS as string[]).includes(value)
}
