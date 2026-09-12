import { Button, FileInput, MessageRegion, Typography } from "@shared/design-system";
import { SchemaField } from "@shared/schema-form";
import { AUTH_COPY } from "@shared/copy";
import { useProfileFlow } from "@features/profile";
import type { ProfileGateway } from "@features/profile";
import type { ProfileOutcome } from "@features/journey";
import styles from "./Profile.module.css";

interface ProfileProps {
  onSettled: (outcome: ProfileOutcome) => void;
  repo?: ProfileGateway;
}

export const Profile = ({ onSettled, repo }: ProfileProps) => {
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
  } = useProfileFlow(onSettled, repo);

  const uploadMessage = AUTH_COPY.profile[
    avatar.status === "uploading"
      ? "uploading"
      : avatar.status === "uploaded"
        ? "uploaded"
        : "uploadFailed"
  ];

  return (
    <div className={styles.root}>
      <Typography variant="heading-large" as="h1">
        {AUTH_COPY.profile.title}
      </Typography>
      <Typography variant="body-medium" tone="secondary">
        {AUTH_COPY.profile.subtitle}
      </Typography>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        {isError && serverError && (
          <MessageRegion tone="error">{serverError.message}</MessageRegion>
        )}

        <div className={styles.avatar}>
          <FileInput
            variant="avatar"
            name="avatar"
            label={AUTH_COPY.profile.avatarLabel}
            helperText={AUTH_COPY.profile.avatarHint}
            accept={avatar.accept}
            maxSize={avatar.maxBytes}
            onFilesChange={(files) => avatar.select(files[0] ?? null)}
          />

          <p className={styles.uploadState} role="status">
            {avatar.status === "idle" ? "" : uploadMessage}
          </p>

          {avatar.status === "failed" && (
            <Button variant="ghost" size="small" type="button" onClick={avatar.retry}>
              {AUTH_COPY.profile.uploadRetry}
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
          />
        ))}

        <p className={styles.count} aria-hidden="true">
          {AUTH_COPY.profile.bioCount(values.bio.length, bioMax)}
        </p>

        <Button
          type="submit"
          fullWidth
          isLoading={isSubmitting}
          loadingText={AUTH_COPY.profile.submitting}
        >
          {AUTH_COPY.profile.submit}
        </Button>

        <p className={styles.aside}>
          <Button variant="ghost" size="small" type="button" onClick={skip}>
            {AUTH_COPY.profile.skip}
          </Button>
        </p>
      </form>
    </div>
  );
};
