import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  QueryBuilderManifestValidationError,
  resolveQueryBuilderConfig,
  resolveQueryBuilderConfigFromManifest,
  validateQueryBuilderManifest,
  withProviderTypeDefaults,
  unmetDependencies,
  requiredDependencies,
  dependencyHint,
  methodsWithDependencies,
  buildDependencyScaffold,
} from '../dist/index.js'

test('backward-compatible defaults with provenance enabled', () => {
  const config = resolveQueryBuilderConfig()

  assert.equal(config.providerMode, 'single')
  assert.equal(config.defaultProvider, 'case-law')
  assert.equal(config.features.emitProvenance, true)
  assert.equal(config.providers.length, 1)
  assert.equal(config.providers[0].type, 'case-law')
  assert.equal(config.providers[0].capabilities?.supportsMethodListing, false)
  assert.equal(config.providers[0].capabilities?.supportsThreshold, false)
  assert.deepEqual(config.datasets, [])
})

test('case-law capability defaults apply unless explicitly overridden', () => {
  const withDefaults = withProviderTypeDefaults({
    id: 'case-law',
    label: 'Case Law',
    type: 'case-law',
    transport: { searchEndpoint: '/api/case-law/search' },
  })
  assert.equal(withDefaults.capabilities?.supportsMethodListing, false)

  const overridden = withProviderTypeDefaults({
    id: 'case-law',
    label: 'Case Law',
    type: 'case-law',
    transport: { searchEndpoint: '/api/case-law/search' },
    capabilities: { supportsMethodListing: true },
  })
  assert.equal(overridden.capabilities?.supportsMethodListing, true)
  assert.equal(overridden.capabilities?.supportsThreshold, false)
})

test('throws when defaultProvider is not present', () => {
  assert.throws(
    () =>
      resolveQueryBuilderConfig({
        providers: [
          {
            id: 'provisions',
            label: 'Provisions',
            type: 'provision-retriever',
            transport: { searchEndpoint: '/api/provisions/search' },
          },
        ],
        defaultProvider: 'missing',
      }),
    /defaultProvider "missing" does not exist in providers\[\]/,
  )
})

test('throws when defaultDataset is not present', () => {
  assert.throws(
    () =>
      resolveQueryBuilderConfig({
        datasets: [{ id: 'bluelab', label: 'BlueLab', kind: 'provisions' }],
        defaultDataset: 'missing',
      }),
    /defaultDataset "missing" does not exist in datasets\[\]/,
  )
})

test('accepts a v1 manifest unchanged', () => {
  const manifest = validateQueryBuilderManifest({
    schemaVersion: '1',
    providerMode: 'single',
    defaultProvider: 'case-law',
    providers: [
      {
        id: 'case-law',
        label: 'Case Law',
        type: 'case-law',
        transport: { searchEndpoint: '/api/case-law/search' },
      },
    ],
    features: { emitProvenance: true },
  })

  assert.equal(manifest.schemaVersion, '1')
  const resolved = resolveQueryBuilderConfigFromManifest(manifest)
  assert.equal(resolved.defaultProvider, 'case-law')
  assert.equal(resolved.features.emitProvenance, true)
  assert.equal(resolved.providers[0].capabilities?.supportsThreshold, false)
})

test('accepts a v2 manifest with datasets and method dependencies', () => {
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
        transport: {
          searchEndpoint: '/api/provisions/search',
          methodsEndpoint: '/api/provisions/methods',
        },
        methods: [
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

  assert.equal(manifest.schemaVersion, '2')
  if (manifest.schemaVersion !== '2') throw new Error('expected v2')

  assert.equal(manifest.providers[0].methods?.[0].dependencies?.[0].configKeys?.[0], 'SBERT_MODEL_PATH')
  assert.equal(manifest.datasets?.[0].fields?.[0].key, 'facts')

  const resolved = resolveQueryBuilderConfigFromManifest(manifest)
  assert.equal(resolved.defaultDataset, 'bluelab')
  assert.equal(resolved.datasets[0].kind, 'provisions')
})

test('throws structured manifest validation errors', () => {
  assert.throws(
    () =>
      validateQueryBuilderManifest({
        schemaVersion: '9',
        providerMode: 'many',
        defaultProvider: '',
        providers: [],
      }),
    (error) => {
      assert.ok(error instanceof QueryBuilderManifestValidationError)
      assert.equal(error.code, 'INVALID_MANIFEST')
      const paths = error.issues.map((issue) => issue.path)
      for (const expected of ['schemaVersion', 'providerMode', 'defaultProvider', 'providers']) {
        assert.ok(paths.includes(expected), `expected issue path ${expected}`)
      }
      return true
    },
  )
})

test('reports invalid dataset field paths', () => {
  assert.throws(
    () =>
      validateQueryBuilderManifest({
        schemaVersion: '2',
        providerMode: 'single',
        defaultProvider: 'case-law',
        providers: [
          {
            id: 'case-law',
            label: 'Case Law',
            type: 'case-law',
            transport: { searchEndpoint: '/api/case-law/search' },
          },
        ],
        datasets: [{ id: 'bluelab', label: 'BlueLab', kind: 'provisions', fields: [{ block: 'FactsInput' }] }],
      }),
    (error) => {
      assert.ok(error instanceof QueryBuilderManifestValidationError)
      const paths = error.issues.map((issue) => issue.path)
      assert.ok(paths.includes('datasets[0].fields[0].key'), `expected field key issue, got ${paths.join(', ')}`)
      assert.ok(paths.includes('datasets[0].fields[0].label'))
      return true
    },
  )
})

const sbert = {
  id: 'sbert',
  label: 'SBERT embeddings',
  available: false,
  unavailableReason: 'model not configured',
  dependencies: [
    { id: 'sbert-model', label: 'Sentence-BERT model', kind: 'model', configKeys: ['SBERT_MODEL_PATH'] },
    { id: 'telemetry', label: 'Telemetry', kind: 'service', optional: true },
  ],
}

test('requiredDependencies excludes optional dependencies', () => {
  assert.deepEqual(requiredDependencies(sbert).map((d) => d.id), ['sbert-model'])
})

test('unmetDependencies only reports blockers for an unavailable method', () => {
  assert.deepEqual(unmetDependencies(sbert).map((d) => d.id), ['sbert-model'])
  assert.deepEqual(unmetDependencies({ id: 'bm25', label: 'BM25' }), [])
  assert.deepEqual(unmetDependencies({ ...sbert, available: true }), [])
})

test('dependencyHint names the declared dependencies', () => {
  assert.equal(dependencyHint(sbert), 'Sentence-BERT model, Telemetry')
})

test('methodsWithDependencies filters methods without dependencies', () => {
  assert.deepEqual(methodsWithDependencies([{ id: 'bm25', label: 'BM25' }, sbert]).map((m) => m.id), ['sbert'])
})

test('buildDependencyScaffold emits an env template with config keys', () => {
  const scaffold = buildDependencyScaffold([sbert])
  assert.match(scaffold, /Method: SBERT embeddings \(sbert\)/)
  assert.match(scaffold, /SBERT_MODEL_PATH=/)
  // A dependency without configKeys falls back to a derived env key.
  assert.match(scaffold, /TELEMETRY=/)
  assert.match(scaffold, /\(optional\)/)
})

test('buildDependencyScaffold says so when nothing is needed', () => {
  assert.match(buildDependencyScaffold([{ id: 'bm25', label: 'BM25' }]), /No method declares backend dependencies/)
})
