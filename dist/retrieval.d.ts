export type ProviderMode = 'single' | 'multi';
export interface RetrievalProviderCapabilities {
    supportsMethodListing?: boolean;
    supportsThreshold?: boolean;
    supportsEvaluation?: boolean;
}
export interface RetrievalTransportConfig {
    searchEndpoint: string;
    searchMethod?: 'GET' | 'POST';
    methodsEndpoint?: string;
    methodsMethod?: 'GET' | 'POST';
}
/**
 * One thing the backend must have before a method can run — a service, a model,
 * a resource or a credential. Carried so a host can show the operator what to
 * configure and disable the method until it is available.
 */
export interface DependencyDescriptor {
    /** Stable id, e.g. "sbert-model". */
    id: string;
    /** Human label, e.g. "Sentence-BERT embeddings". */
    label: string;
    /** Kind of dependency. Kept open so hosts can add their own. */
    kind: 'service' | 'model' | 'resource' | 'credential' | (string & {});
    /** Whether the method can still run without it. Default false. */
    optional?: boolean;
    /** What the operator must configure, shown as a setup hint. */
    description?: string;
    /** Config/env keys the backend expects, for scaffold generation. */
    configKeys?: string[];
}
/** One retrieval method a provider offers (tfidf, bm25, embeddings, …). */
export interface MethodDescriptor {
    id: string;
    label: string;
    /** Backend dependencies required to run this method. */
    dependencies?: DependencyDescriptor[];
    /** Live availability, when a host probe has answered. Undefined = unknown. */
    available?: boolean;
    /** Why it is unavailable, when known. */
    unavailableReason?: string;
}
export interface RetrievalProviderConfig {
    id: string;
    label: string;
    type: string;
    transport: RetrievalTransportConfig;
    defaults?: {
        method?: string;
        threshold?: number;
    };
    capabilities?: RetrievalProviderCapabilities;
    /** Methods this provider offers, with their backend dependencies. */
    methods?: MethodDescriptor[];
    metadata?: Record<string, unknown>;
}
//# sourceMappingURL=retrieval.d.ts.map