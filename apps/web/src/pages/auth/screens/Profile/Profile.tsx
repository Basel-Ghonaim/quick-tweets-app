import { Button, FileInput, MessageRegion, Typography } from "@shared/design-system";
import { SchemaField } from "@shared/schema-form";
import { useCopy } from "@shared/copy";
import { useProfileFlow } from "@features/profile";
import type { ProfileOutcome } from "@features/journey";
import styles from "./Profile.module.css";

interface ProfileProps {
  onSettled: (outcome: ProfileOutcome) => void;
}

export const Profile = ({ onSettled }: ProfileProps) => {
  const copy = useCopy();
  const {
    fields,
    bioMax,
    values,
    errors,
    isSubmitting,
    isError,
    serverError,
    avatar,
    handleChange,
    handleSubmit,
    skip,
  } = useProfileFlow(onSettled);

  const uploadMessage = copy.auth.profile[
    avatar.status === "uploading"
      ? "uploading"
      : avatar.status === "uploaded"
        ? "uploaded"
        : "uploadFailed"
  ];

  return (
    <div className={styles.root}>
      <Typography variant="heading-large" as="h1">
        {copy.auth.profile.title}
      </Typography>
      <Typography variant="body-medium" tone="secondary">
        {copy.auth.profile.subtitle}
      </Typography>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        {isError && serverError && (
          <MessageRegion tone="error">{serverError.message}</MessageRegion>
        )}

        <div className={styles.avatar}>
          <FileInput
            variant="avatar"
            content={copy.controls.file}
            name="avatar"
            label={copy.auth.profile.avatarLabel}
            helperText={copy.auth.profile.avatarHint}
            accept={avatar.accept}
            maxSize={avatar.maxBytes}
            onFilesChange={(files) => avatar.select(files[0] ?? null)}
          />

          <p className={styles.uploadState} role="status">
            {avatar.status === "idle" ? "" : uploadMessage}
          </p>

          {avatar.status === "failed" && (
            <Button variant="ghost" size="small" type="button" onClick={avatar.retry}>
              {copy.auth.profile.uploadRetry}
            </Button>
          )}
        </div>

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
            controls={copy.controls}
          />
        ))}

        <p className={styles.count} aria-hidden="true">
          {copy.auth.profile.bioCount(values.bio.length, bioMax)}
        </p>

        <Button
          type="submit"
          fullWidth
          isLoading={isSubmitting}
          loadingText={copy.auth.profile.submitting}
        >
          {copy.auth.profile.submit}
        </Button>

        <p className={styles.aside}>
          <Button variant="ghost" size="small" type="button" onClick={skip}>
            {copy.auth.profile.skip}
          </Button>
        </p>
      </form>
    </div>
  );
};
