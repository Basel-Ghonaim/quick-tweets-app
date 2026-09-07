import { Button, Input, Typography } from "@shared/design-system";
import { AUTH_COPY } from "../../config/copy";
import { MessageRegion } from "../../components/MessageRegion";
import { normaliseChallengeCode } from "../../verification/challengeCode";
import {
  recoveryFormSchemas,
  useRecoveryForm,
  useResendWindow,
  type RecoveryPosition,
} from "../../recovery";
import styles from "./Recovery.module.css";

interface RecoveryCodeProps {
  position: RecoveryPosition;
  /** Present only when this client just asked; a reload has nothing to confirm. */
  confirmation?: string;
  onSubmit: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
}

export const RecoveryCode = ({
  position,
  confirmation,
  onSubmit,
  onResend,
}: RecoveryCodeProps) => {
  const { values, errors, isSubmitting, serverError, handleChange, handleSubmit } =
    useRecoveryForm(recoveryFormSchemas.codeFields, ({ code }) =>
      // Normalised before it travels: the server normalises nothing and answers
      // every rejection alike, so a lowercase code would look like a wrong one.
      onSubmit(normaliseChallengeCode(code)),
    );

  const { secondsLeft, isOpen, announcement } = useResendWindow(position);

  return (
    <div className={styles.root}>
      <Typography variant="heading-large" as="h1">
        {AUTH_COPY.recovery.codeTitle}
      </Typography>
      <Typography variant="body-medium" tone="secondary">
        {AUTH_COPY.recovery.codeSubtitle(position.maskedEndpoint ?? "")}
      </Typography>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        {serverError && <MessageRegion tone="error">{serverError.message}</MessageRegion>}
        {!serverError && confirmation && (
          <MessageRegion tone="info">{confirmation}</MessageRegion>
        )}

        {/* Bound directly rather than through the schema seam, which forwards
            none of these: a pasted code is the primary interaction, and the
            alphabet has letters so the keyboard must not be numeric. */}
        <Input
          name="code"
          label={AUTH_COPY.recovery.codeLabel}
          placeholder={AUTH_COPY.recovery.codePlaceholder}
          helperText={AUTH_COPY.recovery.codeHint}
          value={values.code}
          onChange={handleChange}
          isInvalid={!!errors.code}
          errorMessage={errors.code ?? undefined}
          autoComplete="one-time-code"
          inputMode="text"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          fullWidth
          autoFocus
        />


        <p className={styles.resend}>
          <Button
            type="button"
            variant="ghost"
            size="small"
            disabled={!position.canResend || !isOpen}
            onClick={() => void onResend()}
          >
            {!position.canResend
              ? AUTH_COPY.recovery.resendSpent
              : isOpen
                ? AUTH_COPY.recovery.resend
                : AUTH_COPY.recovery.resendIn(secondsLeft)}
          </Button>
        </p>

        {/* The seconds tick, so they are not spoken; only the moment that
            changes what the reader can do is. */}
        <p className={styles.announce} role="status">
          {announcement}
        </p>

        <Button
          type="submit"
          fullWidth
          isLoading={isSubmitting}
          loadingText={AUTH_COPY.recovery.submittingCode}
        >
          {AUTH_COPY.recovery.submitCode}
        </Button>
      </form>
    </div>
  );
};
