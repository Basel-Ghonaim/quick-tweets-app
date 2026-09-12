import type { FormFieldConfig } from "@shared/schema-form";
import { isLengthChecked } from "@shared/schema-form";

export const NAME_MAX = 50;
export const BIO_MAX = 160;

interface ProfileFields {
  name: string;
  bio: string;
}

/**
 * Both fields are optional, so neither carries a required rule — the only
 * client-side check is the length the server also enforces. The avatar is not
 * here: its value is a reference produced by an upload, not a value typed in.
 */
export const profileFormSchema = {
  name: {
    name: "name",
    type: "text",
    label: "Display name",
    placeholder: "Your name",
    span: "full",
    validators: [
      isLengthChecked(undefined, {
        max: NAME_MAX,
        message: `Name must be at most ${NAME_MAX} characters`,
      }),
    ],
  },
  bio: {
    name: "bio",
    type: "textarea",
    label: "Bio",
    placeholder: "One line is plenty.",
    span: "full",
    validators: [
      isLengthChecked(undefined, {
        max: BIO_MAX,
        message: `Bio must be at most ${BIO_MAX} characters`,
      }),
    ],
  },
} satisfies Record<keyof ProfileFields, FormFieldConfig<ProfileFields>>;
