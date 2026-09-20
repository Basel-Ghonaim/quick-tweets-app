import { Button, MessageRegion } from "@shared/design-system";
import { SchemaField } from "@shared/schema-form";
import { useCopy } from "@shared/copy";
import { StepLayout } from "./StepLayout";
import { useRequestForm } from "../../hooks";

interface RecoveryRequestProps {
  /** Shown when a reader arrives here because their reset lapsed. */
  notice?: string;
  initialEmail?: string;
  onSubmit: (email: string) => Promise<void>;
}

export const RecoveryRequest = ({
  notice,
  initialEmail,
  onSubmit,
}: RecoveryRequestProps) => {
  const copy = useCopy();
  const { fields, values, errors, isSubmitting, serverError, handleChange, handleSubmit } =
    useRequestForm(onSubmit, initialEmail);

  return (
    <StepLayout
      title={copy.recovery.requestTitle}
      subtitle={copy.recovery.requestSubtitle}
      onSubmit={handleSubmit}
    >
      {serverError && <MessageRegion tone="error">{serverError.message}</MessageRegion>}
      {!serverError && notice && <MessageRegion tone="info">{notice}</MessageRegion>}

      {fields.map((field) => (
        <SchemaField
          key={field.key}
          name={field.key}
          type={field.type}
          label={field.label}
          placeholder={field.placeholder}
          value={values[field.key]}
          error={errors[field.key]}
          onChange={handleChange}
          span={field.span}
          dir={field.dir}
          autoFocus
          controls={copy.controls}
        />
      ))}

      <Button
        type="submit"
        fullWidth
        isLoading={isSubmitting}
        loadingText={copy.recovery.sending}
      >
        {copy.recovery.send}
      </Button>
    </StepLayout>
  );
};
