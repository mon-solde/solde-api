export class CreateContactCommand {
  readonly ownerId: string;
  readonly firstName: string;
  readonly lastName?: string;
  // Skips the duplicate-name check — set when the user confirmed this is
  // really a different person, not the same one they're trying to recreate.
  readonly skipDuplicateNameCheck?: boolean;

  constructor(props: CreateContactCommand) {
    Object.assign(this, props);
  }
}
