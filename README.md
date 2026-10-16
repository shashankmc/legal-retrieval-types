# legal-retrieval-types

Shared, dependency-free configuration contracts for BlueLab retrieval and
dataset-aware forms: dataset descriptors, retrieval providers, the methods each
provider offers and the backend dependencies those methods need, plus the
manifest schema and its validators.

Types and validators only. No Vue, no HTTP client, no credential — safe to
import from browser code.

## Consumers

- `vue-legal-query-builder` — renders dataset fields, methods and dependency hints.
- `vue-legal-provision-retriever` — re-exports these contracts; keeps its runtime
  provider adapters (`createTransportProvider`, …).
- `legal-blocks` — loads and resolves JSON manifests.

## Provider-neutral contracts

`provider.ts` describes the runtime shape of a configurable search form:

- **Provider** — a service a form can search through (`LegalSearchProviderDescriptor`).
- **Database** — a corpus a provider exposes, e.g. case law or legislation
  (`LegalDatabaseDescriptor`), carrying its own `fields`.
- **Source** — a concrete registry inside a database, e.g. `FR/Judilibre`.
- **Adapter** — `LegalSearchAdapter`, the one contract a host implements. It is
  normally backed by a server-side MCP bridge that holds the credential; the
  browser never reaches a provider directly.

Results, documents and resolved citations normalize to `NormalizedSearchResult`,
`NormalizedLegalDocument` and `ResolvedLegalReference`, and provider failures to
`ProviderOperationError` with a stable `code`.

## Field controls

`FieldDescriptor` can declare a generic `control` (`text`, `textarea`, `number`,
`range`, `boolean`, `date`, `select`, `multiselect`, `remote-select`) instead of
a specialised `block`, so a provider field needs no dedicated component. It also
carries `defaultValue`, `min` / `max` / `step`, `multiple`, `advanced`,
`userConfigurable` and `dependencies`.

## Manifest

```ts
import {
  validateQueryBuilderManifest,
  resolveQueryBuilderConfigFromManifest,
} from 'legal-retrieval-types'

const manifest = validateQueryBuilderManifest({
  schemaVersion: '2',
  providerMode: 'single',
  defaultProvider: 'provisions',
  defaultDataset: 'bluelab',
  providers: [
    {
      id: 'provisions',
      label: 'Provisions',
      type: 'provision-retriever',
      transport: { searchEndpoint: '/api/provisions/search', methodsEndpoint: '/api/provisions/methods' },
      methods: [
        {
          id: 'bm25',
          label: 'BM25',
          dependencies: [{ id: 'corpus-index', label: 'Corpus index', kind: 'resource' }],
        },
        {
          id: 'sbert',
          label: 'SBERT embeddings',
          dependencies: [
            { id: 'sbert-model', label: 'Sentence-BERT model', kind: 'model', configKeys: ['SBERT_MODEL_PATH'] },
          ],
        },
      ],
    },
  ],
  datasets: [
    {
      id: 'bluelab',
      label: 'BlueLab provisions',
      kind: 'provisions',
      paramsMapper: 'provisions',
      retrieval: { provider: 'provisions', defaultMethod: 'bm25' },
      resultView: { kind: 'ranked-list' },
      fields: [{ key: 'facts', block: 'FactsInput', label: 'Facts', required: true }],
    },
  ],
})

const resolved = resolveQueryBuilderConfigFromManifest(manifest)
```

`schemaVersion: '1'` is still accepted unchanged; `'2'` adds `datasets` and
`defaultDataset`.

### v3: providers and databases

`'3'` describes providers and the databases they expose directly, so a form can
offer a runtime picker and generate each database's fields:

```ts
import { resolveLegalSearchConfigFromManifest } from 'legal-retrieval-types'

const resolved = resolveLegalSearchConfigFromManifest({
  schemaVersion: '3',
  defaultProvider: 'ldh',
  defaultDatabase: 'case-law',
  providers: [
    {
      id: 'ldh',
      label: 'Legal Data Hunter',
      type: 'legal-data-hunter',
      defaultDatabase: 'case-law',
      capabilities: {
        operations: ['search', 'getDocument', 'discoverCountries', 'discoverSources', 'getFilters'],
        supportsFullText: true,
        supportsDiscovery: true,
      },
    },
  ],
  databases: [
    {
      id: 'case-law',
      label: 'Case law',
      provider: 'ldh',
      kind: 'case-law',
      namespaces: ['case_law'],
      defaultResultView: { kind: 'ranked-list' },
      fields: [
        { key: 'query', control: 'text', label: 'Query', required: true },
        { key: 'country', control: 'multiselect', label: 'Countries', userConfigurable: true },
        { key: 'court', control: 'remote-select', label: 'Court', advanced: true, dependencies: [{ key: 'country', operator: 'truthy' }] },
      ],
    },
  ],
  resultViews: [{ kind: 'ranked-list' }],
  features: { allowFieldCustomization: true },
})
```

Validation rejects duplicate provider/database/field ids, a database pointing at
an unknown provider, unknown defaults, a provider default database owned by
another provider, a required field marked `userConfigurable`, unsupported
controls, broken field dependencies, unknown result views and unknown provider
operations.

A v1/v2 manifest still resolves through `resolveQueryBuilderConfigFromManifest`
and can be lifted to v3 with `migrateManifestToV3` (lossless) or resolved
directly with `resolveLegalSearchConfigFromManifest`.

## Development

```bash
npm install
npm run build   # tsc -> dist/
npm test        # build + node --test
```
