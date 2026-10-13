// legal-retrieval-types — shared, dependency-free configuration contracts for
// BlueLab retrieval and dataset-aware forms.
//
// Types + validators only: no Vue, no HTTP client, no credential. Safe to
// import from browser code.

export type {
  ProviderMode,
  RetrievalProviderCapabilities,
  RetrievalTransportConfig,
  DependencyDescriptor,
  MethodDescriptor,
  RetrievalProviderConfig,
} from './retrieval.js'

export type {
  FieldBlockType,
  FieldOption,
  FieldDescriptor,
  ResultViewRef,
  DatasetDescriptor,
} from './dataset.js'

export type {
  QueryBuilderConfig,
  QueryBuilderManifestV1,
  QueryBuilderManifestV2,
  QueryBuilderManifest,
  ValidationIssue,
  ResolvedQueryBuilderConfig,
} from './manifest.js'

export {
  QueryBuilderManifestValidationError,
  withProviderTypeDefaults,
  resolveQueryBuilderConfig,
  validateQueryBuilderManifest,
  resolveQueryBuilderConfigFromManifest,
} from './manifest.js'

export {
  requiredDependencies,
  unmetDependencies,
  dependencyHint,
  methodsWithDependencies,
  buildDependencyScaffold,
} from './dependencies.js'
