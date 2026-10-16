// Provider-neutral contracts + manifest v3: validation, cross-checks,
// migration from v1/v2, and runtime resolution.
//
// Run: npm test (builds, then node --test)

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  QueryBuilderManifestValidationError,
  ProviderOperationError,
  FIELD_CONTROLS,
  PROVIDER_OPERATIONS,
  isKnownProviderOperation,
  migrateManifestToV3,
  resolveLegalSearchConfig,
  resolveLegalSearchConfigFromManifest,
  validateQueryBuilderManifest,
} from '../dist/index.js'

/** A minimal Legal-Data-Hunter-shaped v3 manifest. */
function ldhManifest() {
  return {
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
      {
        id: 'caselawexplorer',
        label: 'Case Law Explorer',
        type: 'case-law',
        transport: { searchEndpoint: '/api/case-law/search' },
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
          {
            key: 'country',
            control: 'multiselect',
            label: 'Countries',
            userConfigurable: true,
            options: [{ value: 'FR', label: 'France' }],
          },
          {
            key: 'court',
            control: 'remote-select',
            label: 'Court',
            advanced: true,
            dependencies: [{ key: 'country', operator: 'truthy' }],
          },
        ],
      },
      {
        id: 'legislation',
        label: 'Legislation',
        provider: 'ldh',
        kind: 'legislation',
        fields: [{ key: 'query', block: 'KeywordsInput', label: 'Query', required: true }],
      },
    ],
    resultViews: [{ kind: 'ranked-list' }, { kind: 'table' }],
    features: { allowFieldCustomization: true, showAdvancedFields: false },
  }
}

test('accepts a v3 provider/database manifest', () => {
  const manifest = validateQueryBuilderManifest(ldhManifest())
  assert.equal(manifest.schemaVersion, '3')
  if (manifest.schemaVersion !== '3') throw new Error('expected v3')

  assert.equal(manifest.providers.length, 2)
  assert.equal(manifest.databases?.[0].fields?.[0].control, 'text')
  assert.equal(manifest.databases?.[0].fields?.[2].advanced, true)
})

test('resolves a v3 manifest to its runtime shape', () => {
  const resolved = resolveLegalSearchConfigFromManifest(ldhManifest())

  assert.equal(resolved.schemaVersion, '3')
  assert.equal(resolved.defaultProvider, 'ldh')
  assert.equal(resolved.defaultDatabase, 'case-law')
  assert.equal(resolved.features.allowFieldCustomization, true)
  assert.equal(resolved.features.emitProvenance, true)
  assert.equal(resolved.resultViews.length, 2)
})

test('defaults the provider and database when omitted', () => {
  const manifest = validateQueryBuilderManifest({
    schemaVersion: '3',
    providers: [
      { id: 'disabled', label: 'Off', type: 'x', disabled: true },
      { id: 'live', label: 'Live', type: 'x' },
    ],
    databases: [
      { id: 'b1', label: 'B1', provider: 'live' },
      { id: 'b2', label: 'B2', provider: 'live', disabled: true },
    ],
  })
  if (manifest.schemaVersion !== '3') throw new Error('expected v3')
  const resolved = resolveLegalSearchConfig(manifest)

  assert.equal(resolved.defaultProvider, 'live')
  assert.equal(resolved.defaultDatabase, 'b1')
})

test('rejects a database that references an unknown provider', () => {
  assert.throws(
    () =>
      validateQueryBuilderManifest({
        schemaVersion: '3',
        providers: [{ id: 'ldh', label: 'LDH', type: 'x' }],
        databases: [{ id: 'b', label: 'B', provider: 'ghost' }],
      }),
    (error) => {
      assert.ok(error instanceof QueryBuilderManifestValidationError)
      assert.ok(error.issues.some((issue) => issue.path === 'databases[0].provider'))
      return true
    },
  )
})

test('rejects duplicate provider, database and field ids', () => {
  assert.throws(
    () =>
      validateQueryBuilderManifest({
        schemaVersion: '3',
        providers: [
          { id: 'ldh', label: 'A', type: 'x' },
          { id: 'ldh', label: 'B', type: 'x' },
        ],
        databases: [
          { id: 'db', label: 'A', provider: 'ldh', fields: [{ key: 'q', control: 'text', label: 'Q' }] },
          { id: 'db', label: 'B', provider: 'ldh', fields: [
            { key: 'q', control: 'text', label: 'Q' },
            { key: 'q', control: 'text', label: 'Q2' },
          ] },
        ],
      }),
    (error) => {
      assert.ok(error instanceof QueryBuilderManifestValidationError)
      const paths = error.issues.map((issue) => issue.path)
      assert.ok(paths.includes('providers[1].id'))
      assert.ok(paths.includes('databases[1].id'))
      assert.ok(paths.includes('databases[1].fields[1].key'))
      return true
    },
  )
})

test('rejects unknown default provider and database', () => {
  assert.throws(
    () =>
      validateQueryBuilderManifest({
        schemaVersion: '3',
        defaultProvider: 'ghost',
        defaultDatabase: 'ghost',
        providers: [{ id: 'ldh', label: 'LDH', type: 'x' }],
        databases: [{ id: 'db', label: 'DB', provider: 'ldh' }],
      }),
    (error) => {
      assert.ok(error instanceof QueryBuilderManifestValidationError)
      const paths = error.issues.map((issue) => issue.path)
      assert.ok(paths.includes('defaultProvider'))
      assert.ok(paths.includes('defaultDatabase'))
      return true
    },
  )
})

test('rejects a provider default database that belongs to another provider', () => {
  assert.throws(
    () =>
      validateQueryBuilderManifest({
        schemaVersion: '3',
        providers: [
          { id: 'a', label: 'A', type: 'x', defaultDatabase: 'db-b' },
          { id: 'b', label: 'B', type: 'x' },
        ],
        databases: [
          { id: 'db-a', label: 'A', provider: 'a' },
          { id: 'db-b', label: 'B', provider: 'b' },
        ],
      }),
    (error) => {
      assert.ok(error instanceof QueryBuilderManifestValidationError)
      assert.ok(error.issues.some((issue) => issue.path === 'providers[0].defaultDatabase'))
      return true
    },
  )
})

test('rejects a required field marked user-configurable', () => {
  assert.throws(
    () =>
      validateQueryBuilderManifest({
        schemaVersion: '3',
        providers: [{ id: 'ldh', label: 'LDH', type: 'x' }],
        databases: [
          {
            id: 'db',
            label: 'DB',
            provider: 'ldh',
            fields: [{ key: 'query', control: 'text', label: 'Query', required: true, userConfigurable: true }],
          },
        ],
      }),
    (error) => {
      assert.ok(error instanceof QueryBuilderManifestValidationError)
      assert.ok(
        error.issues.some((issue) => issue.path === 'databases[0].fields[0].userConfigurable'),
      )
      return true
    },
  )
})

test('rejects an unsupported field control and a broken dependency', () => {
  assert.throws(
    () =>
      validateQueryBuilderManifest({
        schemaVersion: '3',
        providers: [{ id: 'ldh', label: 'LDH', type: 'x' }],
        databases: [
          {
            id: 'db',
            label: 'DB',
            provider: 'ldh',
            fields: [
              { key: 'query', control: 'wysiwyg', label: 'Query' },
              { key: 'court', control: 'text', label: 'Court', dependencies: [{ key: 'missing' }] },
            ],
          },
        ],
      }),
    (error) => {
      assert.ok(error instanceof QueryBuilderManifestValidationError)
      const paths = error.issues.map((issue) => issue.path)
      assert.ok(paths.includes('databases[0].fields[0].control'))
      assert.ok(paths.includes('databases[0].fields[1].dependencies[0].key'))
      return true
    },
  )
})

test('rejects a field with neither a block nor a control', () => {
  assert.throws(
    () =>
      validateQueryBuilderManifest({
        schemaVersion: '3',
        providers: [{ id: 'ldh', label: 'LDH', type: 'x' }],
        databases: [{ id: 'db', label: 'DB', provider: 'ldh', fields: [{ key: 'q', label: 'Q' }] }],
      }),
    (error) => {
      assert.ok(error instanceof QueryBuilderManifestValidationError)
      assert.ok(error.issues.some((issue) => issue.path === 'databases[0].fields[0].block'))
      return true
    },
  )
})

test('rejects an unknown result view reference', () => {
  assert.throws(
    () =>
      validateQueryBuilderManifest({
        schemaVersion: '3',
        providers: [{ id: 'ldh', label: 'LDH', type: 'x' }],
        databases: [
          { id: 'db', label: 'DB', provider: 'ldh', defaultResultView: { kind: 'hologram' } },
        ],
        resultViews: [{ kind: 'ranked-list' }],
      }),
    (error) => {
      assert.ok(error instanceof QueryBuilderManifestValidationError)
      assert.ok(error.issues.some((issue) => issue.path === 'databases[0].defaultResultView.kind'))
      return true
    },
  )
})

test('rejects an unknown provider operation', () => {
  assert.throws(
    () =>
      validateQueryBuilderManifest({
        schemaVersion: '3',
        providers: [
          { id: 'ldh', label: 'LDH', type: 'x', capabilities: { operations: ['teleport'] } },
        ],
      }),
    (error) => {
      assert.ok(error instanceof QueryBuilderManifestValidationError)
      assert.ok(error.issues.some((issue) => issue.path === 'providers[0].capabilities.operations[0]'))
      return true
    },
  )
})

test('migrates a v2 manifest into v3 losslessly', () => {
  const v2 = validateQueryBuilderManifest({
    schemaVersion: '2',
    providerMode: 'single',
    defaultProvider: 'provisions',
    defaultDataset: 'bluelab',
    providers: [
      {
        id: 'provisions',
        label: 'Provisions',
        type: 'provision-retriever',
        transport: { searchEndpoint: '/api/provisions/search' },
        defaults: { method: 'bm25' },
        methods: [{ id: 'bm25', label: 'BM25' }],
      },
    ],
    datasets: [
      {
        id: 'bluelab',
        label: 'BlueLab provisions',
        kind: 'provisions',
        retrieval: { provider: 'provisions', defaultMethod: 'bm25' },
        resultView: { kind: 'ranked-list' },
        fields: [{ key: 'facts', block: 'FactsInput', label: 'Facts', required: true }],
      },
    ],
  })

  const v3 = migrateManifestToV3(v2)
  assert.equal(v3.schemaVersion, '3')
  assert.equal(v3.defaultProvider, 'provisions')
  assert.equal(v3.defaultDatabase, 'bluelab')
  assert.equal(v3.providers[0].transport?.searchEndpoint, '/api/provisions/search')
  assert.equal(v3.providers[0].metadata?.defaults.method, 'bm25')
  assert.equal(v3.databases?.[0].provider, 'provisions')
  assert.equal(v3.databases?.[0].defaultResultView?.kind, 'ranked-list')

  const resolved = resolveLegalSearchConfigFromManifest(v2)
  assert.equal(resolved.defaultProvider, 'provisions')
  assert.equal(resolved.defaultDatabase, 'bluelab')
})

test('migrating an already-v3 manifest is a no-op', () => {
  const manifest = validateQueryBuilderManifest(ldhManifest())
  if (manifest.schemaVersion !== '3') throw new Error('expected v3')
  assert.equal(migrateManifestToV3(manifest), manifest)
})

test('ProviderOperationError carries a stable code and retry hint', () => {
  const error = new ProviderOperationError('RATE_LIMITED', 'slow down', {
    operation: 'search',
    provider: 'ldh',
    retryAfterSeconds: 30,
  })
  assert.ok(error instanceof Error)
  assert.equal(error.code, 'RATE_LIMITED')
  assert.equal(error.operation, 'search')
  assert.equal(error.provider, 'ldh')
  assert.equal(error.retryAfterSeconds, 30)
})

test('exposes the supported controls and operations', () => {
  assert.ok(FIELD_CONTROLS.includes('multiselect'))
  assert.ok(FIELD_CONTROLS.includes('remote-select'))
  assert.ok(PROVIDER_OPERATIONS.includes('discoverSources'))
  assert.equal(isKnownProviderOperation('search'), true)
  assert.equal(isKnownProviderOperation('teleport'), false)
})
