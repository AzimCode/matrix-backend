import { applyDecorators } from '@nestjs/common';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

export const PASSWORD_DESCRIPTION =
  `At least ${PASSWORD_MIN_LENGTH} characters, with a lowercase letter, ` +
  'an uppercase letter, and a digit.';

const CHARACTER_RULES: ReadonlyArray<{ test: RegExp; needs: string }> = [
  { test: /[a-z]/, needs: 'a lowercase letter' },
  { test: /[A-Z]/, needs: 'an uppercase letter' },
  { test: /[0-9]/, needs: 'a digit' },
];

/**
 * The password policy, stated once.
 *
 * It used to live in four places — three DTOs and the environment-driven
 * bootstrap check — and had already drifted: the bootstrap copy never enforced
 * the maximum length. Raising the bar here now raises it on every path.
 *
 * `field` only names the property in the validation message, so the wording
 * stays accurate for `newPassword` as well as `password`.
 */
export function IsStrongPassword(field = 'password') {
  return applyDecorators(
    IsString(),
    MinLength(PASSWORD_MIN_LENGTH),
    MaxLength(PASSWORD_MAX_LENGTH),
    ...CHARACTER_RULES.map(({ test, needs }) =>
      Matches(test, { message: `${field} must contain ${needs}` }),
    ),
  );
}

/**
 * What a candidate password is still missing, phrased for a log line; empty
 * when it satisfies the policy. Used where class-validator cannot reach —
 * currently the bootstrap admin, whose password arrives as an env var.
 */
export function passwordProblems(password: string): string[] {
  const problems: string[] = [];
  if (password.length < PASSWORD_MIN_LENGTH) {
    problems.push(`at least ${PASSWORD_MIN_LENGTH} characters`);
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    problems.push(`at most ${PASSWORD_MAX_LENGTH} characters`);
  }
  for (const { test, needs } of CHARACTER_RULES) {
    if (!test.test(password)) {
      problems.push(needs);
    }
  }
  return problems;
}
