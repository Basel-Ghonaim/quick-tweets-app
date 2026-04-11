## I solved the issue by changing the value of FormPayload [schema.types.ts]

- export type FormPayload = Record<string, unknown>;

## We replaced FormEvent with SubmitEvent because it has become deprecated [useSchemaForm.ts]

- async (e: SubmitEvent)

## 
