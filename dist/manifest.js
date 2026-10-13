// The config + manifest contracts a host resolves and passes into a form or
// retriever, plus the validators that guard the ingestion boundary. Moved here
// from vue-legal-provision-retriever so the retriever, the query builder and
// legal-blocks all read one shape.
export class QueryBuilderManifestValidationError extends Error {
    constructor(issues) {
        super(`Invalid query-builder manifest (${issues.length} issue${issues.length === 1 ? '' : 's'})`);
        this.code = 'INVALID_MANIFEST';
        this.name = 'QueryBuilderManifestValidationError';
        this.issues = issues;
    }
}
function isRecord(value) {
    return typeof value === 'object' && value !== null;
}
function isProviderMode(value) {
    return value === 'single' || value === 'multi';
}
function asOptionalBoolean(value, path, issues) {
    if (value === undefined)
        return undefined;
    if (typeof value === 'boolean')
        return value;
    issues.push({ path, message: 'expected boolean' });
    return undefined;
}
function asNonEmptyString(value, path, issues) {
    if (typeof value === 'string' && value.trim().length > 0)
        return value;
    issues.push({ path, message: 'expected non-empty string' });
    return undefined;
}
function validateDependencyDescriptor(value, path, issues) {
    if (!isRecord(value)) {
        issues.push({ path, message: 'expected object' });
        return null;
    }
    const id = asNonEmptyString(value.id, `${path}.id`, issues);
    const label = asNonEmptyString(value.label, `${path}.label`, issues);
    const kind = asNonEmptyString(value.kind, `${path}.kind`, issues);
    const configKeys = value.configKeys;
    if (configKeys !== undefined && !Array.isArray(configKeys)) {
        issues.push({ path: `${path}.configKeys`, message: 'expected array' });
    }
    return {
        id: id ?? '',
        label: label ?? '',
        kind: kind ?? '',
        optional: asOptionalBoolean(value.optional, `${path}.optional`, issues),
        description: typeof value.description === 'string' ? value.description : undefined,
        configKeys: Array.isArray(configKeys)
            ? configKeys.filter((key) => typeof key === 'string')
            : undefined,
    };
}
function validateMethodDescriptor(value, path, issues) {
    if (!isRecord(value)) {
        issues.push({ path, message: 'expected object' });
        return null;
    }
    const id = asNonEmptyString(value.id, `${path}.id`, issues);
    const label = asNonEmptyString(value.label, `${path}.label`, issues);
    let dependencies;
    if (value.dependencies !== undefined) {
        if (!Array.isArray(value.dependencies)) {
            issues.push({ path: `${path}.dependencies`, message: 'expected array' });
        }
        else {
            dependencies = value.dependencies
                .map((dep, index) => validateDependencyDescriptor(dep, `${path}.dependencies[${index}]`, issues))
                .filter((dep) => dep !== null);
        }
    }
    return {
        id: id ?? '',
        label: label ?? '',
        dependencies,
        available: asOptionalBoolean(value.available, `${path}.available`, issues),
        unavailableReason: typeof value.unavailableReason === 'string' ? value.unavailableReason : undefined,
    };
}
function validateProviderConfig(value, path, issues) {
    if (!isRecord(value)) {
        issues.push({ path, message: 'expected object' });
        return null;
    }
    const { id, label, type, transport } = value;
    if (typeof id !== 'string' || id.trim().length === 0) {
        issues.push({ path: `${path}.id`, message: 'expected non-empty string' });
    }
    if (typeof label !== 'string' || label.trim().length === 0) {
        issues.push({ path: `${path}.label`, message: 'expected non-empty string' });
    }
    if (typeof type !== 'string' || type.trim().length === 0) {
        issues.push({ path: `${path}.type`, message: 'expected non-empty string' });
    }
    if (!isRecord(transport)) {
        issues.push({ path: `${path}.transport`, message: 'expected object' });
        return null;
    }
    const searchEndpoint = transport.searchEndpoint;
    const methodsEndpoint = transport.methodsEndpoint;
    const searchMethod = transport.searchMethod;
    const methodsMethod = transport.methodsMethod;
    if (typeof searchEndpoint !== 'string' || searchEndpoint.trim().length === 0) {
        issues.push({ path: `${path}.transport.searchEndpoint`, message: 'expected non-empty string' });
    }
    if (methodsEndpoint !== undefined && (typeof methodsEndpoint !== 'string' || methodsEndpoint.trim().length === 0)) {
        issues.push({ path: `${path}.transport.methodsEndpoint`, message: 'expected non-empty string' });
    }
    if (searchMethod !== undefined && searchMethod !== 'GET' && searchMethod !== 'POST') {
        issues.push({ path: `${path}.transport.searchMethod`, message: 'expected "GET" | "POST"' });
    }
    if (methodsMethod !== undefined && methodsMethod !== 'GET' && methodsMethod !== 'POST') {
        issues.push({ path: `${path}.transport.methodsMethod`, message: 'expected "GET" | "POST"' });
    }
    const defaults = isRecord(value.defaults)
        ? {
            method: typeof value.defaults.method === 'string' ? value.defaults.method : undefined,
            threshold: typeof value.defaults.threshold === 'number' ? value.defaults.threshold : undefined,
        }
        : undefined;
    if (value.defaults !== undefined && !isRecord(value.defaults)) {
        issues.push({ path: `${path}.defaults`, message: 'expected object' });
    }
    if (isRecord(value.defaults) && value.defaults.threshold !== undefined && typeof value.defaults.threshold !== 'number') {
        issues.push({ path: `${path}.defaults.threshold`, message: 'expected number' });
    }
    const capabilities = isRecord(value.capabilities)
        ? {
            supportsMethodListing: asOptionalBoolean(value.capabilities.supportsMethodListing, `${path}.capabilities.supportsMethodListing`, issues),
            supportsThreshold: asOptionalBoolean(value.capabilities.supportsThreshold, `${path}.capabilities.supportsThreshold`, issues),
            supportsEvaluation: asOptionalBoolean(value.capabilities.supportsEvaluation, `${path}.capabilities.supportsEvaluation`, issues),
        }
        : undefined;
    if (value.capabilities !== undefined && !isRecord(value.capabilities)) {
        issues.push({ path: `${path}.capabilities`, message: 'expected object' });
    }
    let methods;
    if (value.methods !== undefined) {
        if (!Array.isArray(value.methods)) {
            issues.push({ path: `${path}.methods`, message: 'expected array' });
        }
        else {
            methods = value.methods
                .map((method, index) => validateMethodDescriptor(method, `${path}.methods[${index}]`, issues))
                .filter((method) => method !== null);
        }
    }
    return {
        id: typeof id === 'string' ? id : '',
        label: typeof label === 'string' ? label : '',
        type: typeof type === 'string' ? type : '',
        transport: {
            searchEndpoint: typeof searchEndpoint === 'string' ? searchEndpoint : '',
            methodsEndpoint: typeof methodsEndpoint === 'string' ? methodsEndpoint : undefined,
            searchMethod: searchMethod === 'GET' || searchMethod === 'POST' ? searchMethod : undefined,
            methodsMethod: methodsMethod === 'GET' || methodsMethod === 'POST' ? methodsMethod : undefined,
        },
        defaults,
        capabilities,
        methods,
        metadata: isRecord(value.metadata) ? value.metadata : undefined,
    };
}
function validateFieldDescriptor(value, path, issues) {
    if (!isRecord(value)) {
        issues.push({ path, message: 'expected object' });
        return null;
    }
    const key = asNonEmptyString(value.key, `${path}.key`, issues);
    const block = asNonEmptyString(value.block, `${path}.block`, issues);
    const label = asNonEmptyString(value.label, `${path}.label`, issues);
    const options = value.options;
    if (options !== undefined && !Array.isArray(options)) {
        issues.push({ path: `${path}.options`, message: 'expected array' });
    }
    return {
        key: key ?? '',
        block: block ?? '',
        label: label ?? '',
        description: typeof value.description === 'string' ? value.description : undefined,
        required: asOptionalBoolean(value.required, `${path}.required`, issues),
        placeholder: typeof value.placeholder === 'string' ? value.placeholder : undefined,
        options: Array.isArray(options)
            ? options.filter((option) => isRecord(option) && typeof option.value === 'string' && typeof option.label === 'string')
            : undefined,
        includeInParams: asOptionalBoolean(value.includeInParams, `${path}.includeInParams`, issues),
    };
}
function validateDatasetConfig(value, path, issues) {
    if (!isRecord(value)) {
        issues.push({ path, message: 'expected object' });
        return null;
    }
    const id = asNonEmptyString(value.id, `${path}.id`, issues);
    const label = asNonEmptyString(value.label, `${path}.label`, issues);
    const kind = value.kind === undefined ? undefined : asNonEmptyString(value.kind, `${path}.kind`, issues);
    let fields;
    if (value.fields !== undefined) {
        if (!Array.isArray(value.fields)) {
            issues.push({ path: `${path}.fields`, message: 'expected array' });
        }
        else {
            fields = value.fields
                .map((field, index) => validateFieldDescriptor(field, `${path}.fields[${index}]`, issues))
                .filter((field) => field !== null);
        }
    }
    return {
        id: id ?? '',
        label: label ?? '',
        kind,
        disabled: asOptionalBoolean(value.disabled, `${path}.disabled`, issues),
        fields,
        paramsMapper: typeof value.paramsMapper === 'string' ? value.paramsMapper : undefined,
        retrieval: isRecord(value.retrieval)
            ? {
                provider: typeof value.retrieval.provider === 'string' ? value.retrieval.provider : undefined,
                defaultMethod: typeof value.retrieval.defaultMethod === 'string' ? value.retrieval.defaultMethod : undefined,
            }
            : undefined,
        defaultGuidedTemplate: typeof value.defaultGuidedTemplate === 'string' ? value.defaultGuidedTemplate : undefined,
        resultView: isRecord(value.resultView)
            ? {
                kind: typeof value.resultView.kind === 'string' ? value.resultView.kind : '',
                preset: typeof value.resultView.preset === 'string' ? value.resultView.preset : undefined,
                config: isRecord(value.resultView.config) ? value.resultView.config : undefined,
            }
            : undefined,
    };
}
const DEFAULT_CASE_LAW_PROVIDER = {
    id: 'case-law',
    label: 'Case Law',
    type: 'case-law',
    transport: {
        searchEndpoint: '/api/case-law/search',
        methodsEndpoint: '/api/case-law/methods',
    },
    defaults: {
        method: 'bm25',
        threshold: 0.2,
    },
};
export function withProviderTypeDefaults(provider) {
    if (provider.type !== 'case-law')
        return provider;
    return {
        ...provider,
        capabilities: {
            supportsMethodListing: false,
            supportsThreshold: false,
            ...provider.capabilities,
        },
    };
}
export function resolveQueryBuilderConfig(input = {}) {
    const providers = (input.providers?.length ? input.providers : [DEFAULT_CASE_LAW_PROVIDER]).map(withProviderTypeDefaults);
    const defaultProvider = input.defaultProvider ?? providers[0].id;
    if (!providers.some((provider) => provider.id === defaultProvider)) {
        throw new Error(`defaultProvider "${defaultProvider}" does not exist in providers[]`);
    }
    const datasets = input.datasets ?? [];
    const defaultDataset = input.defaultDataset;
    if (defaultDataset !== undefined && datasets.length > 0 && !datasets.some((dataset) => dataset.id === defaultDataset)) {
        throw new Error(`defaultDataset "${defaultDataset}" does not exist in datasets[]`);
    }
    return {
        providerMode: input.providerMode ?? 'single',
        defaultProvider,
        providers,
        datasets,
        defaultDataset,
        features: {
            showEvaluation: input.features?.showEvaluation ?? false,
            emitProvenance: input.features?.emitProvenance ?? true,
        },
    };
}
export function validateQueryBuilderManifest(manifest) {
    const issues = [];
    if (!isRecord(manifest)) {
        throw new QueryBuilderManifestValidationError([{ path: 'manifest', message: 'expected object' }]);
    }
    if (manifest.schemaVersion !== '1' && manifest.schemaVersion !== '2') {
        issues.push({ path: 'schemaVersion', message: 'expected "1" or "2"' });
    }
    if (!isProviderMode(manifest.providerMode)) {
        issues.push({ path: 'providerMode', message: 'expected "single" | "multi"' });
    }
    if (typeof manifest.defaultProvider !== 'string' || manifest.defaultProvider.trim().length === 0) {
        issues.push({ path: 'defaultProvider', message: 'expected non-empty string' });
    }
    if (!Array.isArray(manifest.providers) || manifest.providers.length === 0) {
        issues.push({ path: 'providers', message: 'expected non-empty array' });
    }
    const providers = Array.isArray(manifest.providers)
        ? manifest.providers.map((provider, index) => validateProviderConfig(provider, `providers[${index}]`, issues))
        : [];
    let datasets;
    if (manifest.datasets !== undefined) {
        if (!Array.isArray(manifest.datasets)) {
            issues.push({ path: 'datasets', message: 'expected array' });
        }
        else {
            datasets = manifest.datasets
                .map((dataset, index) => validateDatasetConfig(dataset, `datasets[${index}]`, issues))
                .filter((dataset) => dataset !== null);
        }
    }
    if (manifest.features !== undefined && !isRecord(manifest.features)) {
        issues.push({ path: 'features', message: 'expected object' });
    }
    const features = isRecord(manifest.features)
        ? {
            showEvaluation: asOptionalBoolean(manifest.features.showEvaluation, 'features.showEvaluation', issues),
            emitProvenance: asOptionalBoolean(manifest.features.emitProvenance, 'features.emitProvenance', issues),
        }
        : undefined;
    if (issues.length > 0) {
        throw new QueryBuilderManifestValidationError(issues);
    }
    const base = {
        providerMode: manifest.providerMode,
        defaultProvider: manifest.defaultProvider,
        providers: providers.filter((provider) => provider !== null),
        features,
    };
    if (manifest.schemaVersion === '2') {
        return {
            schemaVersion: '2',
            ...base,
            datasets,
            defaultDataset: typeof manifest.defaultDataset === 'string' ? manifest.defaultDataset : undefined,
        };
    }
    return { schemaVersion: '1', ...base };
}
export function resolveQueryBuilderConfigFromManifest(manifest) {
    const validated = validateQueryBuilderManifest(manifest);
    return resolveQueryBuilderConfig(validated);
}
//# sourceMappingURL=manifest.js.map