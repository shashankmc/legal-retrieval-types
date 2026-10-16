// legal-retrieval-types — shared, dependency-free configuration contracts for
// BlueLab retrieval and dataset-aware forms.
//
// Types + validators only: no Vue, no HTTP client, no credential. Safe to
// import from browser code.
export { FIELD_CONTROLS } from './dataset.js';
export { PROVIDER_OPERATIONS, ProviderOperationError, isKnownProviderOperation } from './provider.js';
export { QueryBuilderManifestValidationError, withProviderTypeDefaults, resolveQueryBuilderConfig, validateQueryBuilderManifest, resolveQueryBuilderConfigFromManifest, migrateManifestToV3, resolveLegalSearchConfig, resolveLegalSearchConfigFromManifest, } from './manifest.js';
export { requiredDependencies, unmetDependencies, dependencyHint, methodsWithDependencies, buildDependencyScaffold, } from './dependencies.js';
//# sourceMappingURL=index.js.map