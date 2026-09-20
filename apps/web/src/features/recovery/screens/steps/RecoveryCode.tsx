import { Button, Input, MessageRegion, Typography } from "@shared/design-system";
import { useCopy } from "@shared/copy";
import { StepLayout } from "./StepLayout";
import styles from "./RecoveryCode.module.css";
import { useCodeForm, useResendWindow } from "../../hooks";
import type { RecoveryPosition } from "../../model";

interface RecoveryCodeProps {
  position: RecoveryPosition;
  /** Present only when this client just asked; a reload has nothing to confirm. */
  confirmation?: string;
  onSubmit: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
  /** Abandons this attempt for a new address. The server still owns the step;
   *  what moves it is the request the address form then makes. */
  onRestart: () => void;
}

export const RecoveryCode = ({
  position,
  confirmation,
  onSubmit,
  onResend,
  onRestart,
}: RecoveryCodeProps) => {
  const copy = useCopy();
  const { values, errors, isSubmitting, serverError, handleChange, handleSubmit } =
    useCodeForm(onSubmit);

  const { secondsLeft, isOpen, announcement } = useResendWindow(position);

  return (
    <StepLayout
      title={copy.recovery.codeTitle}
      subtitle={copy.recovery.codeSubtitle(position.maskedAddress ?? "")}
      onSubmit={handleSubmit}
    >
      {serverError && <MessageRegion tone="error">{serverError.message}</MessageRegion>}
      {!serverError && confirmation && (
        <MessageRegion tone="info">{confirmation}</MessageRegion>
      )}

      {/* Bound directly rather than through the schema seam, which forwards
          none of these: a pasted code is the primary interaction, and the
          alphabet has letters so the keyboard must not be numeric. */}
      <Input
        name="code"
        label={copy.recovery.codeLabel}
        placeholder={copy.recovery.codePlaceholder}
        helperText={copy.recovery.codeHint}
        value={values.code}
        onChange={handleChange}
        isInvalid={!!errors.code}
        errorMessage={errors.code ?? undefined}
        autoComplete="one-time-code"
        inputMode="text"
        dir="ltr"
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        fullWidth
        autoFocus
      />


      <div className={styles.secondaries}>
        <Button type="button" variant="ghost" size="small" onClick={onRestart}>
          {copy.recovery.startOver}
        </Button>

        {position.canResend && (
          <Button
            type="button"
            variant="ghost"
            size="small"
            disabled={!isOpen}
            onClick={() => void onResend()}
          >
            {isOpen ? copy.recovery.resend : copy.recovery.resendIn(secondsLeft)}
          </Button>
        )}
      </div>

      {!position.canResend && (
        <Typography variant="body-small" tone="muted">
          {copy.recovery.resendSpent}
        </Typography>
      )}

      {/* The seconds tick, so they are not spoken; only the moment that
          changes what the reader can do is. */}
      <p className={styles.announce} role="status">
        {announcement}
      </p>

      <Button
        type="submit"
        fullWidth
        isLoading={isSubmitting}
        loadingText={copy.recovery.submittingCode}
      >
        {copy.recovery.submitCode}
      </Button>
    </StepLayout>
  );
};
