export function validateSignUp(f: { first: string; last: string; email: string; password: string; confirm: string }): string | null {
  if (!f.first.trim() || !f.last.trim()) return "Enter your first and last name.";
  if (!f.email.includes("@")) return "Enter a valid email address.";
  if (f.password.length < 8) return "Use a password of at least 8 characters.";
  if (f.password !== f.confirm) return "Passwords do not match.";
  return null;
}