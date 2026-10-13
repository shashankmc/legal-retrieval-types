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

## Development

```bash
npm install
npm run build   # tsc -> dist/
npm test        # build + node --test
```
