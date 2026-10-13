import type { ProviderMode, RetrievalProviderConfig } from './retrieval.js';
import type { DatasetDescriptor } from './dataset.js';
export interface QueryBuilderConfig {
    providerMode?: ProviderMode;
    defaultProvider?: string;
    providers?: RetrievalProviderConfig[];
    /** Datasets the form may offer. */
    datasets?: DatasetDescriptor[];
    /** Dataset selected on mount. */
    defaultDataset?: string;
    features?: {
        showEvaluation?: boolean;
        emitProvenance?: boolean;
    };
}
/** The v1 manifest shape, still accepted. */
export interface QueryBuilderManifestV1 {
    schemaVersion: '1';
    providerMode: ProviderMode;
    defaultProvider: string;
    providers: RetrievalProviderConfig[];
    features?: {
        showEvaluation?: boolean;
        emitProvenance?: boolean;
    };
}
/** v2 adds datasets. */
export interface QueryBuilderManifestV2 {
    schemaVersion: '2';
    providerMode: ProviderMode;
    defaultProvider: string;
    providers: RetrievalProviderConfig[];
    datasets?: DatasetDescriptor[];
    defaultDataset?: string;
    features?: {
        showEvaluation?: boolean;
        emitProvenance?: boolean;
    };
}
export type QueryBuilderManifest = QueryBuilderManifestV1 | QueryBuilderManifestV2;
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
export declare function withProviderTypeDefaults(provider: RetrievalProviderConfig): RetrievalProviderConfig;
export declare function resolveQueryBuilderConfig(input?: QueryBuilderConfig): ResolvedQueryBuilderConfig;
export declare function validateQueryBuilderManifest(manifest: unknown): QueryBuilderManifest;
export declare function resolveQueryBuilderConfigFromManifest(manifest: unknown): ResolvedQueryBuilderConfig;
//# sourceMappingURL=manifest.d.ts.map