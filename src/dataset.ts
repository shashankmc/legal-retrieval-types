// Dataset configuration contracts. A dataset is described declaratively so a
// form can render its fields and collect its parameters without knowing the
// dataset in advance. Case-law is one kind among many; provisions and arbitrary
// corpora are peers.

/** A form block id a field maps to. Kept as a string so hosts can add blocks. */
export type FieldBlockType = string

export interface FieldOption {
  value: string
  label: string
}

/**
 * One field a dataset collects. The form renders `block` and writes the user's
 * input under `key` in the emitted params.
 */
export interface FieldDescriptor {
  /** Param key this field collects into, e.g. "keywords", "facts". */
  key: string
  /** Block the form renders for this field. */
  block: FieldBlockType
  label: string
  description?: string
  required?: boolean
  placeholder?: string
  options?: FieldOption[]
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
