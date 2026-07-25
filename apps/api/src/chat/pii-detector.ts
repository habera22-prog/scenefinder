const PHONE_REGEX = /01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}/;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

export function containsPii(text: string): boolean {
  return PHONE_REGEX.test(text) || EMAIL_REGEX.test(text);
}
