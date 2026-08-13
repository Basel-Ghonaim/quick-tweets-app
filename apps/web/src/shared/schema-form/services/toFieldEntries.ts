import type { FormFieldConfig, FormPayload } from "../types/schema.types";

export type SchemaFieldEntry<
  TSchema extends Record<string, FormFieldConfig<FormPayload>>,
> = FormFieldConfig<FormPayload> & { key: keyof TSchema & string };

/**
 * Transforms a schema config object into a renderable array.
 * Each entry includes the original config + a typed `key` for value/error lookups.
 */
export const toFieldEntries = <
  TSchema extends Record<string, FormFieldConfig<FormPayload>>,
>(
  schema: TSchema,
): SchemaFieldEntry<TSchema>[] =>
  Object.entries(schema).map(([key, config]) => ({
    ...config,
    key: key as keyof TSchema & string,
  }));
