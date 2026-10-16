// Dataset configuration contracts. A dataset is described declaratively so a
// form can render its fields and collect its parameters without knowing the
// dataset in advance. Case-law is one kind among many; provisions and arbitrary
// corpora are peers.

/** A form block id a field maps to. Kept as a string so hosts can add blocks. */
export type FieldBlockType = string

/**
 * A generic, renderer-agnostic control for a field. A field that declares no
 * `block` is rendered by the control instead, so a provider field needs no
 * dedicated component. Specialised legal blocks stay addressable via `block`.
 */
export type FieldControl =
  | 'text'
  | 'textarea'
  | 'number'
  | 'range'
  | 'boolean'
  | 'date'
  | 'select'
  | 'multiselect'
  | 'remote-select'

/** The controls a renderer is expected to understand out of the box. */
export const FIELD_CONTROLS: FieldControl[] = [
  'text',
  'textarea',
  'number',
  'range',
  'boolean',
  'date',
  'select',
  'multiselect',
  'remote-select',
]

export interface FieldOption {
  value: string
  label: string
}

/**
 * A condition that decides whether a field is shown, evaluated against another
 * field's collected value in the same dataset.
 */
export interface FieldDependency {
  /** Key of the field this one depends on. */
  key: string
  /** Comparison to apply to the sibling field's value. */
  operator?: 'equals' | 'not-equals' | 'includes' | 'truthy' | 'empty' | (string & {})
  /** Value to compare against. Ignored by `truthy` / `empty`. */
  value?: unknown
}

/**
 * One field a dataset collects. The form renders `block` when a specialised
 * block fits, otherwise the generic `control`, and writes the user's input under
 * `key` in the emitted params.
 */
export interface FieldDescriptor {
  /** Param key this field collects into, e.g. "keywords", "facts". */
  key: string
  /**
   * Specialised block the form renders for this field, e.g. "FactsInput".
   * Optional: a field with a `control` and no block uses the generic renderer.
   */
  block?: FieldBlockType
  /** Generic control used when no `block` is declared. */
  control?: FieldControl
  label: string
  description?: string
  required?: boolean
  placeholder?: string
  options?: FieldOption[]
  /** Value applied when the field is first rendered. */
  defaultValue?: unknown
  /** Inclusive lower bound for `number` / `range` controls. */
  min?: number
  /** Inclusive upper bound for `number` / `range` controls. */
  max?: number
  /** Step for `number` / `range` controls. */
  step?: number
  /** Whether a `select` collects one value or many. */
  multiple?: boolean
  /** Whether the field is tucked behind an "advanced" toggle. */
  advanced?: boolean
  /**
   * Whether the user may show/hide and reorder this field at runtime. Required
   * fields are never user-configurable; the backend contract pins them.
   */
  userConfigurable?: boolean
  /** Conditions that gate this field's visibility. */
  dependencies?: FieldDependency[]
  /** Include this field in the emitted params. Default true. */
  includeInParams?: boolean
}

/**
 * Reference to a result view. The view itself is owned by its provider (the
 * visualizer owns graph/table, the retriever owns the ranked list); this only
 * names it and carries an opaque config.
 */
export interface ResultViewRef {
  /** View kind, e.g. "ranked-list" | "table" | "graph" | "visualizer" | string. */
  kind: string
  /** Id of a preset the view provider ships, e.g. "caseLaw". */
  preset?: string
  /** Opaque view config, owned by the view provider. */
  config?: Record<string, unknown>
}

/** A dataset a form can offer in its picker. */
export interface DatasetDescriptor {
  id: string
  label: string
  /** Shown but not selectable. */
  disabled?: boolean
  /** Coarse family, e.g. "case-law" | "provisions" | string. Optional for
   * backward compatibility with descriptors that only carry id/label. */
  kind?: string
  /** Declarative field schema: which blocks the form renders and what they collect. */
  fields?: FieldDescriptor[]
  /** Adapter id that maps collected fields to this dataset's params. */
  paramsMapper?: string
  /** Retrieval config for this dataset: a reference into providers[], or inline. */
  retrieval?: {
    provider?: string
    defaultMethod?: string
  }
  /** Guided template id to fall back to for this dataset. */
  defaultGuidedTemplate?: string
  /** Default result view for this dataset. */
  resultView?: ResultViewRef
}
