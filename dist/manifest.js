// The config + manifest contracts a host resolves and passes into a form or
// retriever, plus the validators that guard the ingestion boundary. Moved here
// from vue-legal-provision-retriever so the retriever, the query builder and
// legal-blocks all read one shape.
import { FIELD_CONTROLS } from './dataset.js';
import { isKnownProviderOperation } from './provider.js';
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
function asOptionalNumber(value, path, issues) {
    if (value === undefined)
        return undefined;
    if (typeof value === 'number' && Number.isFinite(value))
        return value;
    issues.push({ path, message: 'expected finite number' });
    return undefined;
}
function asOptionalStringArray(value, path, issues) {
    if (value === undefined)
        return undefined;
    if (!Array.isArray(value)) {
        issues.push({ path, message: 'expected array' });
        return undefined;
    }
    return value.filter((entry) => typeof entry === 'string');
}
function asOptionalRecord(value, path, issues) {
    if (value === undefined)
        return undefined;
    if (isRecord(value))
        return value;
    issues.push({ path, message: 'expected object' });
    return undefined;
}
function asOptionalResultViewRef(value, path, issues) {
    if (value === undefined)
        return undefined;
    if (!isRecord(value)) {
        issues.push({ path, message: 'expected object' });
        return undefined;
    }
    const kind = asNonEmptyString(value.kind, `${path}.kind`, issues);
    return {
        kind: kind ?? '',
        preset: typeof value.preset === 'string' ? value.preset : undefined,
        config: isRecord(value.config) ? value.config : undefined,
    };
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
    const label = asNonEmptyString(value.label, `${path}.label`, issues);
    // A field renders through a specialised block or a generic control; one of
    // the two must be present, but neither is required on its own.
    const block = value.block === undefined ? undefined : asNonEmptyString(value.block, `${path}.block`, issues);
    let control;
    if (value.control !== undefined) {
        if (typeof value.control === 'string' && FIELD_CONTROLS.includes(value.control)) {
            control = value.control;
        }
        else {
            issues.push({
                path: `${path}.control`,
                message: `expected one of ${FIELD_CONTROLS.join(', ')}`,
            });
        }
    }
    if (block === undefined && control === undefined) {
        issues.push({ path: `${path}.block`, message: 'expected a block or a control' });
    }
    const options = value.options;
    if (options !== undefined && !Array.isArray(options)) {
        issues.push({ path: `${path}.options`, message: 'expected array' });
    }
    let dependencies;
    if (value.dependencies !== undefined) {
        if (!Array.isArray(value.dependencies)) {
            issues.push({ path: `${path}.dependencies`, message: 'expected array' });
        }
        else {
            dependencies = value.dependencies
                .map((dependency, index) => {
                const depPath = `${path}.dependencies[${index}]`;
                if (!isRecord(dependency)) {
                    issues.push({ path: depPath, message: 'expected object' });
                    return null;
                }
                const depKey = asNonEmptyString(dependency.key, `${depPath}.key`, issues);
                return {
                    key: depKey ?? '',
                    operator: typeof dependency.operator === 'string' ? dependency.operator : undefined,
                    value: dependency.value,
                };
            })
                .filter((dependency) => dependency !== null);
        }
    }
    return {
        key: key ?? '',
        block,
        control,
        label: label ?? '',
        description: typeof value.description === 'string' ? value.description : undefined,
        required: asOptionalBoolean(value.required, `${path}.required`, issues),
        placeholder: typeof value.placeholder === 'string' ? value.placeholder : undefined,
        options: Array.isArray(options)
            ? options.filter((option) => isRecord(option) && typeof option.value === 'string' && typeof option.label === 'string')
            : undefined,
        defaultValue: value.defaultValue,
        min: asOptionalNumber(value.min, `${path}.min`, issues),
        max: asOptionalNumber(value.max, `${path}.max`, issues),
        step: asOptionalNumber(value.step, `${path}.step`, issues),
        minLength: asOptionalNumber(value.minLength, `${path}.minLength`, issues),
        maxLength: asOptionalNumber(value.maxLength, `${path}.maxLength`, issues),
        minItems: asOptionalNumber(value.minItems, `${path}.minItems`, issues),
        maxItems: asOptionalNumber(value.maxItems, `${path}.maxItems`, issues),
        multiple: asOptionalBoolean(value.multiple, `${path}.multiple`, issues),
        advanced: asOptionalBoolean(value.advanced, `${path}.advanced`, issues),
        userConfigurable: asOptionalBoolean(value.userConfigurable, `${path}.userConfigurable`, issues),
        dependencies,
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
function validateProviderDescriptor(value, path, issues) {
    if (!isRecord(value)) {
        issues.push({ path, message: 'expected object' });
        return null;
    }
    const id = asNonEmptyString(value.id, `${path}.id`, issues);
    const label = asNonEmptyString(value.label, `${path}.label`, issues);
    const type = asNonEmptyString(value.type, `${path}.type`, issues);
    let capabilities;
    if (value.capabilities !== undefined) {
        if (!isRecord(value.capabilities)) {
            issues.push({ path: `${path}.capabilities`, message: 'expected object' });
        }
        else {
            const operations = asOptionalStringArray(value.capabilities.operations, `${path}.capabilities.operations`, issues);
            for (const [index, operation] of (operations ?? []).entries()) {
                if (!isKnownProviderOperation(operation)) {
                    issues.push({
                        path: `${path}.capabilities.operations[${index}]`,
                        message: 'unknown provider operation',
                    });
                }
            }
            capabilities = {
                operations: operations,
                supportsMethodListing: asOptionalBoolean(value.capabilities.supportsMethodListing, `${path}.capabilities.supportsMethodListing`, issues),
                supportsThreshold: asOptionalBoolean(value.capabilities.supportsThreshold, `${path}.capabilities.supportsThreshold`, issues),
                supportsEvaluation: asOptionalBoolean(value.capabilities.supportsEvaluation, `${path}.capabilities.supportsEvaluation`, issues),
                supportsPagination: asOptionalBoolean(value.capabilities.supportsPagination, `${path}.capabilities.supportsPagination`, issues),
                supportsFullText: asOptionalBoolean(value.capabilities.supportsFullText, `${path}.capabilities.supportsFullText`, issues),
                supportsDiscovery: asOptionalBoolean(value.capabilities.supportsDiscovery, `${path}.capabilities.supportsDiscovery`, issues),
            };
        }
    }
    let transport;
    if (value.transport !== undefined) {
        if (!isRecord(value.transport) || typeof value.transport.searchEndpoint !== 'string') {
            issues.push({ path: `${path}.transport`, message: 'expected object with searchEndpoint' });
        }
        else {
            transport = {
                searchEndpoint: value.transport.searchEndpoint,
                searchMethod: value.transport.searchMethod === 'GET' || value.transport.searchMethod === 'POST'
                    ? value.transport.searchMethod
                    : undefined,
                methodsEndpoint: typeof value.transport.methodsEndpoint === 'string'
                    ? value.transport.methodsEndpoint
                    : undefined,
                methodsMethod: value.transport.methodsMethod === 'GET' || value.transport.methodsMethod === 'POST'
                    ? value.transport.methodsMethod
                    : undefined,
            };
        }
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
        id: id ?? '',
        label: label ?? '',
        type: type ?? '',
        description: typeof value.description === 'string' ? value.description : undefined,
        disabled: asOptionalBoolean(value.disabled, `${path}.disabled`, issues),
        unavailableReason: typeof value.unavailableReason === 'string' ? value.unavailableReason : undefined,
        capabilities,
        defaultDatabase: value.defaultDatabase === undefined
            ? undefined
            : asNonEmptyString(value.defaultDatabase, `${path}.defaultDatabase`, issues),
        transport,
        methods,
        metadata: asOptionalRecord(value.metadata, `${path}.metadata`, issues),
    };
}
function validateDatabaseDescriptor(value, path, issues) {
    if (!isRecord(value)) {
        issues.push({ path, message: 'expected object' });
        return null;
    }
    const id = asNonEmptyString(value.id, `${path}.id`, issues);
    const label = asNonEmptyString(value.label, `${path}.label`, issues);
    const provider = asNonEmptyString(value.provider, `${path}.provider`, issues);
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
        provider: provider ?? '',
        kind: value.kind === undefined ? undefined : asNonEmptyString(value.kind, `${path}.kind`, issues),
        description: typeof value.description === 'string' ? value.description : undefined,
        disabled: asOptionalBoolean(value.disabled, `${path}.disabled`, issues),
        namespaces: asOptionalStringArray(value.namespaces, `${path}.namespaces`, issues),
        fields,
        defaultResultView: asOptionalResultViewRef(value.defaultResultView, `${path}.defaultResultView`, issues),
    };
}
/** Cross-field checks that only make sense once the whole manifest is parsed. */
function validateV3CrossReferences(providers, databases, resultViews, manifest, issues) {
    const providerIds = new Set();
    providers.forEach((provider, index) => {
        if (providerIds.has(provider.id)) {
            issues.push({ path: `providers[${index}].id`, message: `duplicate provider id "${provider.id}"` });
        }
        providerIds.add(provider.id);
    });
    const databaseIds = new Set();
    databases.forEach((database, index) => {
        if (databaseIds.has(database.id)) {
            issues.push({ path: `databases[${index}].id`, message: `duplicate database id "${database.id}"` });
        }
        databaseIds.add(database.id);
        if (database.provider && !providerIds.has(database.provider)) {
            issues.push({
                path: `databases[${index}].provider`,
                message: `unknown provider "${database.provider}"`,
            });
        }
        const fieldKeys = new Set();
        (database.fields ?? []).forEach((field, fieldIndex) => {
            const fieldPath = `databases[${index}].fields[${fieldIndex}]`;
            if (fieldKeys.has(field.key)) {
                issues.push({ path: `${fieldPath}.key`, message: `duplicate field key "${field.key}"` });
            }
            fieldKeys.add(field.key);
        });
        (database.fields ?? []).forEach((field, fieldIndex) => {
            const fieldPath = `databases[${index}].fields[${fieldIndex}]`;
            if (field.required === true && field.userConfigurable === true) {
                issues.push({
                    path: `${fieldPath}.userConfigurable`,
                    message: 'required fields cannot be user-configurable',
                });
            }
            for (const [depIndex, dependency] of (field.dependencies ?? []).entries()) {
                if (!fieldKeys.has(dependency.key)) {
                    issues.push({
                        path: `${fieldPath}.dependencies[${depIndex}].key`,
                        message: `unknown sibling field "${dependency.key}"`,
                    });
                }
            }
        });
        if (resultViews !== undefined && resultViews.length > 0 && database.defaultResultView) {
            if (!resultViews.some((view) => view.kind === database.defaultResultView?.kind)) {
                issues.push({
                    path: `databases[${index}].defaultResultView.kind`,
                    message: `unknown result view "${database.defaultResultView.kind}"`,
                });
            }
        }
    });
    const defaultProvider = manifest.defaultProvider;
    if (typeof defaultProvider === 'string' && !providerIds.has(defaultProvider)) {
        issues.push({ path: 'defaultProvider', message: `unknown provider "${defaultProvider}"` });
    }
    const defaultDatabase = manifest.defaultDatabase;
    if (typeof defaultDatabase === 'string' && !databaseIds.has(defaultDatabase)) {
        issues.push({ path: 'defaultDatabase', message: `unknown database "${defaultDatabase}"` });
    }
    providers.forEach((provider, index) => {
        if (!provider.defaultDatabase)
            return;
        const database = databases.find((entry) => entry.id === provider.defaultDatabase);
        if (!database) {
            issues.push({
                path: `providers[${index}].defaultDatabase`,
                message: `unknown database "${provider.defaultDatabase}"`,
            });
        }
        else if (database.provider !== provider.id) {
            issues.push({
                path: `providers[${index}].defaultDatabase`,
                message: `database "${provider.defaultDatabase}" belongs to provider "${database.provider}"`,
            });
        }
    });
    if (resultViews !== undefined) {
        const seen = new Set();
        resultViews.forEach((view, index) => {
            if (seen.has(view.kind)) {
                issues.push({ path: `resultViews[${index}].kind`, message: `duplicate result view "${view.kind}"` });
            }
            seen.add(view.kind);
        });
    }
}
function validateQueryBuilderManifestV3(manifest, issues) {
    if (!Array.isArray(manifest.providers) || manifest.providers.length === 0) {
        issues.push({ path: 'providers', message: 'expected non-empty array' });
    }
    const providers = Array.isArray(manifest.providers)
        ? manifest.providers
            .map((provider, index) => validateProviderDescriptor(provider, `providers[${index}]`, issues))
            .filter((provider) => provider !== null)
        : [];
    let databases;
    if (manifest.databases !== undefined) {
        if (!Array.isArray(manifest.databases)) {
            issues.push({ path: 'databases', message: 'expected array' });
        }
        else {
            databases = manifest.databases
                .map((database, index) => validateDatabaseDescriptor(database, `databases[${index}]`, issues))
                .filter((database) => database !== null);
        }
    }
    let resultViews;
    if (manifest.resultViews !== undefined) {
        if (!Array.isArray(manifest.resultViews)) {
            issues.push({ path: 'resultViews', message: 'expected array' });
        }
        else {
            resultViews = manifest.resultViews
                .map((view, index) => asOptionalResultViewRef(view, `resultViews[${index}]`, issues))
                .filter((view) => view !== undefined);
        }
    }
    if (manifest.features !== undefined && !isRecord(manifest.features)) {
        issues.push({ path: 'features', message: 'expected object' });
    }
    const features = isRecord(manifest.features)
        ? {
            showEvaluation: asOptionalBoolean(manifest.features.showEvaluation, 'features.showEvaluation', issues),
            emitProvenance: asOptionalBoolean(manifest.features.emitProvenance, 'features.emitProvenance', issues),
            allowFieldCustomization: asOptionalBoolean(manifest.features.allowFieldCustomization, 'features.allowFieldCustomization', issues),
            showAdvancedFields: asOptionalBoolean(manifest.features.showAdvancedFields, 'features.showAdvancedFields', issues),
        }
        : undefined;
    validateV3CrossReferences(providers, databases ?? [], resultViews, manifest, issues);
    if (issues.length > 0) {
        throw new QueryBuilderManifestValidationError(issues);
    }
    return {
        schemaVersion: '3',
        providers,
        databases,
        defaultProvider: typeof manifest.defaultProvider === 'string' ? manifest.defaultProvider : undefined,
        defaultDatabase: typeof manifest.defaultDatabase === 'string' ? manifest.defaultDatabase : undefined,
        resultViews,
        features,
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
    if (manifest.schemaVersion === '3') {
        return validateQueryBuilderManifestV3(manifest, issues);
    }
    if (manifest.schemaVersion !== '1' && manifest.schemaVersion !== '2') {
        issues.push({ path: 'schemaVersion', message: 'expected "1", "2" or "3"' });
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
    if (validated.schemaVersion === '3') {
        throw new Error('resolveQueryBuilderConfigFromManifest handles v1/v2 manifests; use resolveLegalSearchConfigFromManifest for v3');
    }
    return resolveQueryBuilderConfig(validated);
}
/**
 * Lifts a v1/v2 manifest into the v3 provider/database shape, losslessly: each
 * retrieval provider becomes a provider descriptor (transport, methods and
 * defaults kept under `metadata`) and each dataset becomes a database assigned
 * to the provider it referenced, or the default provider when it named none.
 * A v3 manifest is returned unchanged.
 */
export function migrateManifestToV3(manifest) {
    if (manifest.schemaVersion === '3')
        return manifest;
    const defaultProvider = manifest.defaultProvider;
    const providers = manifest.providers.map((provider) => ({
        id: provider.id,
        label: provider.label,
        type: provider.type,
        capabilities: provider.capabilities,
        transport: provider.transport,
        methods: provider.methods,
        metadata: {
            ...provider.metadata,
            ...(provider.defaults ? { defaults: provider.defaults } : {}),
        },
    }));
    const datasets = manifest.schemaVersion === '2' ? manifest.datasets ?? [] : [];
    const databases = datasets.map((dataset) => ({
        id: dataset.id,
        label: dataset.label,
        provider: dataset.retrieval?.provider ?? defaultProvider,
        kind: dataset.kind,
        disabled: dataset.disabled,
        fields: dataset.fields,
        defaultResultView: dataset.resultView,
    }));
    const defaultDataset = manifest.schemaVersion === '2' ? manifest.defaultDataset : undefined;
    return {
        schemaVersion: '3',
        providers,
        databases,
        defaultProvider,
        defaultDatabase: defaultDataset,
        features: manifest.features,
    };
}
/** Resolves a validated v3 manifest into its runtime shape. */
export function resolveLegalSearchConfig(manifest) {
    const providers = manifest.providers;
    if (providers.length === 0) {
        throw new Error('a v3 manifest needs at least one provider');
    }
    const databases = manifest.databases ?? [];
    const defaultProvider = manifest.defaultProvider ??
        providers.find((provider) => !provider.disabled)?.id ??
        providers[0].id;
    const provider = providers.find((entry) => entry.id === defaultProvider);
    if (!provider) {
        throw new Error(`defaultProvider "${defaultProvider}" does not exist in providers[]`);
    }
    const databasesForProvider = databases.filter((database) => database.provider === defaultProvider);
    const defaultDatabase = manifest.defaultDatabase ??
        provider.defaultDatabase ??
        databasesForProvider.find((database) => !database.disabled)?.id;
    if (defaultDatabase !== undefined && !databases.some((database) => database.id === defaultDatabase)) {
        throw new Error(`defaultDatabase "${defaultDatabase}" does not exist in databases[]`);
    }
    return {
        schemaVersion: '3',
        providers,
        databases,
        defaultProvider,
        defaultDatabase,
        resultViews: manifest.resultViews ?? [],
        features: {
            showEvaluation: manifest.features?.showEvaluation ?? false,
            emitProvenance: manifest.features?.emitProvenance ?? true,
            allowFieldCustomization: manifest.features?.allowFieldCustomization ?? true,
            showAdvancedFields: manifest.features?.showAdvancedFields ?? false,
        },
    };
}
/**
 * The one entry point a host uses: accepts a manifest of any supported version,
 * validates it, migrates v1/v2 to v3, and resolves the runtime config.
 */
export function resolveLegalSearchConfigFromManifest(manifest) {
    const validated = validateQueryBuilderManifest(manifest);
    return resolveLegalSearchConfig(migrateManifestToV3(validated));
}
//# sourceMappingURL=manifest.js.map