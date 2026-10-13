// legal-retrieval-types — shared, dependency-free configuration contracts for
// BlueLab retrieval and dataset-aware forms.
//
// Types + validators only: no Vue, no HTTP client, no credential. Safe to
// import from browser code.
export { QueryBuilderManifestValidationError, withProviderTypeDefaults, resolveQueryBuilderConfig, validateQueryBuilderManifest, resolveQueryBuilderConfigFromManifest, } from './manifest.js';
export { requiredDependencies, unmetDependencies, dependencyHint, methodsWithDependencies, buildDependencyScaffold, } from './dependencies.js';
//# sourceMappingURL=index.js.map