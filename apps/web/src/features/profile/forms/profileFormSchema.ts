import type { FormFieldConfig } from "@shared/schema-form";
import { isLengthChecked } from "@shared/schema-form";
import { AUTH_COPY } from "@shared/copy";

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
    label: AUTH_COPY.profile.nameLabel,
    placeholder: AUTH_COPY.profile.namePlaceholder,
    span: "full",
    validators: [
      isLengthChecked(undefined, {
        max: NAME_MAX,
        message: AUTH_COPY.profile.nameTooLong(NAME_MAX),
      }),
    ],
  },
  bio: {
    name: "bio",
    type: "textarea",
    label: AUTH_COPY.profile.bioLabel,
    placeholder: AUTH_COPY.profile.bioPlaceholder,
    span: "full",
    validators: [
      isLengthChecked(undefined, {
        max: BIO_MAX,
        message: AUTH_COPY.profile.bioTooLong(BIO_MAX),
      }),
    ],
  },
} satisfies Record<keyof ProfileFields, FormFieldConfig<ProfileFields>>;
