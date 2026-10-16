import type { ProviderMode, RetrievalProviderConfig } from './retrieval.js';
import type { DatasetDescriptor, ResultViewRef } from './dataset.js';
import type { LegalDatabaseDescriptor, LegalSearchProviderDescriptor } from './provider.js';
/** UI features a manifest can switch on. */
export interface QueryBuilderFeatures {
    showEvaluation?: boolean;
    emitProvenance?: boolean;
    /** Whether users may show/hide and reorder optional fields. */
    allowFieldCustomization?: boolean;
    /** Whether fields marked `advanced` start collapsed. */
    showAdvancedFields?: boolean;
}
export interface QueryBuilderConfig {
    providerMode?: ProviderMode;
    defaultProvider?: string;
    providers?: RetrievalProviderConfig[];
    /** Datasets the form may offer. */
    datasets?: DatasetDescriptor[];
    /** Dataset selected on mount. */
    defaultDataset?: string;
    features?: QueryBuilderFeatures;
}
/** The v1 manifest shape, still accepted. */
export interface QueryBuilderManifestV1 {
    schemaVersion: '1';
    providerMode: ProviderMode;
    defaultProvider: string;
    providers: RetrievalProviderConfig[];
    features?: QueryBuilderFeatures;
}
/** v2 adds datasets. */
export interface QueryBuilderManifestV2 {
    schemaVersion: '2';
    providerMode: ProviderMode;
    defaultProvider: string;
    providers: RetrievalProviderConfig[];
    datasets?: DatasetDescriptor[];
    defaultDataset?: string;
    features?: QueryBuilderFeatures;
}
/**
 * v3 describes providers and the databases they expose directly, so a form can
 * offer a runtime picker and generate each database's fields. Supersedes the
 * dataset-agnostic v1/v2 shapes, which migrate into it losslessly.
 */
export interface QueryBuilderManifestV3 {
    schemaVersion: '3';
    /** Providers the form may search through. */
    providers: LegalSearchProviderDescriptor[];
    /** Databases (corpora) offered across all providers. */
    databases?: LegalDatabaseDescriptor[];
    /** Provider selected on mount. Defaults to the first enabled provider. */
    defaultProvider?: string;
    /** Database selected on mount. Defaults to the provider's default. */
    defaultDatabase?: string;
    /** Result views a database may reference. */
    resultViews?: ResultViewRef[];
    features?: QueryBuilderFeatures;
}
export type QueryBuilderManifest = QueryBuilderManifestV1 | QueryBuilderManifestV2 | QueryBuilderManifestV3;
export interface ValidationIssue {
    path: string;
    message: string;
}
export declare class QueryBuilderManifestValidationError extends Error {
    readonly code = "INVALID_MANIFEST";
    readonly issues: ValidationIssue[];
    constructor(issues: ValidationIssue[]);
}
export interface ResolvedQueryBuilderConfig {
    providerMode: ProviderMode;
    defaultProvider: string;
    providers: RetrievalProviderConfig[];
    datasets: DatasetDescriptor[];
    defaultDataset?: string;
    features: {
        showEvaluation: boolean;
        emitProvenance: boolean;
    };
}
/** The runtime shape a v3 manifest resolves to. */
export interface ResolvedLegalSearchConfig {
    schemaVersion: '3';
    providers: LegalSearchProviderDescriptor[];
    databases: LegalDatabaseDescriptor[];
    defaultProvider: string;
    defaultDatabase?: string;
    resultViews: ResultViewRef[];
    features: {
        showEvaluation: boolean;
        emitProvenance: boolean;
        allowFieldCustomization: boolean;
        showAdvancedFields: boolean;
    };
}
export declare function withProviderTypeDefaults(provider: RetrievalProviderConfig): RetrievalProviderConfig;
export declare function resolveQueryBuilderConfig(input?: QueryBuilderConfig): ResolvedQueryBuilderConfig;
export declare function validateQueryBuilderManifest(manifest: unknown): QueryBuilderManifest;
export declare function resolveQueryBuilderConfigFromManifest(manifest: unknown): ResolvedQueryBuilderConfig;
/**
 * Lifts a v1/v2 manifest into the v3 provider/database shape, losslessly: each
 * retrieval provider becomes a provider descriptor (transport, methods and
 * defaults kept under `metadata`) and each dataset becomes a database assigned
 * to the provider it referenced, or the default provider when it named none.
 * A v3 manifest is returned unchanged.
 */
export declare function migrateManifestToV3(manifest: QueryBuilderManifest): QueryBuilderManifestV3;
/** Resolves a validated v3 manifest into its runtime shape. */
export declare function resolveLegalSearchConfig(manifest: QueryBuilderManifestV3): ResolvedLegalSearchConfig;
/**
 * The one entry point a host uses: accepts a manifest of any supported version,
 * validates it, migrates v1/v2 to v3, and resolves the runtime config.
 */
export declare function resolveLegalSearchConfigFromManifest(manifest: unknown): ResolvedLegalSearchConfig;
//# sourceMappingURL=manifest.d.ts.map