import type { FormFieldConfig } from "@shared/schema-form";
import { isLengthChecked } from "@shared/schema-form";
import type { Catalogue } from "@shared/copy";

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
export const profileFormSchema = (copy: Catalogue) =>
  ({
    name: {
      name: "name",
      type: "text",
      label: copy.auth.profile.nameLabel,
      placeholder: copy.auth.profile.namePlaceholder,
      span: "full",
      validators: [
        isLengthChecked(undefined, {
          max: NAME_MAX,
          message: copy.auth.profile.nameTooLong(NAME_MAX),
        }),
      ],
    },
    bio: {
      name: "bio",
      type: "textarea",
      label: copy.auth.profile.bioLabel,
      placeholder: copy.auth.profile.bioPlaceholder,
      span: "full",
      validators: [
        isLengthChecked(undefined, {
          max: BIO_MAX,
          message: copy.auth.profile.bioTooLong(BIO_MAX),
        }),
      ],
    },
  }) satisfies Record<keyof ProfileFields, FormFieldConfig<ProfileFields>>;
