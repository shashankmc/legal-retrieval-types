import type { MethodDescriptor, DependencyDescriptor } from './retrieval.js';
/** The dependencies a method cannot run without (optional ones excluded). */
export declare function requiredDependencies(method: MethodDescriptor): DependencyDescriptor[];
/**
 * The dependencies blocking a method, given the availability a host probe (or
 * the method list) reported. An unknown availability is not treated as unmet.
 */
export declare function unmetDependencies(method: MethodDescriptor): DependencyDescriptor[];
/** Human hint naming what a method needs, e.g. "Sentence-BERT model". */
export declare function dependencyHint(method: MethodDescriptor): string;
/** The methods that declare at least one backend dependency. */
export declare function methodsWithDependencies(methods: MethodDescriptor[]): MethodDescriptor[];
/**
 * A commented .env-style template listing every method's backend dependencies
 * and the config keys the service expects. Hosts show it so an operator can
 * stand up the backend a method needs.
 */
export declare function buildDependencyScaffold(methods: MethodDescriptor[]): string;
//# sourceMappingURL=dependencies.d.ts.map