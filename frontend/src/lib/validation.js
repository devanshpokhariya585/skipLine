

const VIT_EMAIL_RE = /^[a-z]+\.[a-z]+[0-9]{4}@vitstudent\.ac\.in$/;
const REG_NO_RE = /^[0-9]{2}[a-z]{2,4}[0-9]{3,5}$/;
const PHONE_RE = /^[6-9][0-9]{9}$/;
const NAME_RE = /^[A-Za-z]+(?: [A-Za-z]+)*$/;
const DISH_RE = /^[A-Za-z0-9][A-Za-z0-9 &'()\-,.]*$/;

export function ageFrom(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

export const check = {
  name(v) {
    const s = String(v ?? '').trim();
    if (!s) return 'Full name is required.';
    if (/\d/.test(s)) return 'Name cannot contain numbers.';
    if (/\s{2,}/.test(s)) return 'Remove the extra spaces in the name.';
    if (!NAME_RE.test(s)) return 'Name can contain only letters and single spaces.';
    if (s.length < 2) return 'Name is too short.';
    if (s.length > 60) return 'Name is too long.';
    return '';
  },
  email(v) {
    const s = String(v ?? '').trim().toLowerCase();
    if (!s) return 'Email is required.';
    if (!VIT_EMAIL_RE.test(s)) return 'Use your VIT email, e.g. devansh.pokhariya2024@vitstudent.ac.in';
    return '';
  },
  regNo(v) {
    const s = String(v ?? '').trim().toLowerCase();
    if (!s) return 'Registration number is required.';
    if (!REG_NO_RE.test(s)) return 'Enter a valid registration number, e.g. 24BCA0014.';
    return '';
  },
  phone(v) {
    const s = String(v ?? '').trim();
    if (!s) return 'Phone number is required.';
    if (!/^\d+$/.test(s)) return 'Phone number can contain digits only.';
    if (!PHONE_RE.test(s)) return 'Enter a valid 10-digit mobile number.';
    return '';
  },
  dob(v) {
    if (!v) return 'Date of birth is required.';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return 'Enter a valid date of birth.';
    if (d.getTime() > Date.now()) return 'Date of birth cannot be in the future.';
    const age = ageFrom(v);
    if (age < 16) return 'You must be at least 16 years old to register.';
    if (age > 100) return 'Enter a valid date of birth.';
    return '';
  },
  gender(v) { return v ? '' : 'Select your gender.'; },
  year(v) { return v ? '' : 'Select your year.'; },
  semester(v) { return v ? '' : 'Select your semester.'; },
  branch(v) { return v ? '' : 'Select your branch.'; },
  foodPreferences(v) { return Array.isArray(v) && v.length ? '' : 'Select at least one food preference.'; },
  declaration(v) { return v === true ? '' : 'Please confirm the declaration to continue.'; },
  verificationCode(v) { return String(v ?? '').trim() ? '' : 'Verification code is required.'; },
  password(v) {
    const s = String(v ?? '');
    if (!s) return 'Password is required.';
    if (s.length < 8) return 'Password must be at least 8 characters.';
    if (!/[A-Z]/.test(s)) return 'Add an uppercase letter.';
    if (!/[a-z]/.test(s)) return 'Add a lowercase letter.';
    if (!/[0-9]/.test(s)) return 'Add a number.';
    if (!/[^A-Za-z0-9]/.test(s)) return 'Add a special character.';
    return '';
  },
  // Dish fields
  dishName(v) {
    const s = String(v ?? '').trim();
    if (!s) return 'Dish name is required.';
    if (/\s{2,}/.test(s)) return 'Remove the extra spaces in the name.';
    if (!/[A-Za-z]/.test(s)) return 'Dish name must include letters.';
    if (!DISH_RE.test(s)) return 'Dish name has invalid characters.';
    if (s.length < 2) return 'Dish name is too short.';
    if (s.length > 60) return 'Dish name is too long.';
    return '';
  },
  price(v) {
    if (v === '' || v === null || v === undefined) return 'Price is required.';
    const n = Number(v);
    if (!Number.isFinite(n)) return 'Price must be a number.';
    if (n <= 0) return 'Price must be greater than 0.';
    if (n > 100000) return 'Price is unreasonably high.';
    if (Math.round(n * 100) !== n * 100) return 'Price can have at most 2 decimals.';
    return '';
  },
  imageUrl(v) {
    const s = String(v ?? '').trim();
    if (!s) return '';
    try {
      const u = new URL(s);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return 'Image URL must start with http or https.';
      return '';
    } catch {
      return 'Enter a valid image URL.';
    }
  },
  description(v) {
    if (String(v ?? '').length > 500) return 'Description is too long (max 500 characters).';
    return '';
  },
};

// The five password requirements, for the live checklist.
export function passwordChecks(v) {
  const s = String(v ?? '');
  return [
    { label: 'At least 8 characters', ok: s.length >= 8 },
    { label: 'An uppercase letter', ok: /[A-Z]/.test(s) },
    { label: 'A lowercase letter', ok: /[a-z]/.test(s) },
    { label: 'A number', ok: /[0-9]/.test(s) },
    { label: 'A special character', ok: /[^A-Za-z0-9]/.test(s) },
  ];
}
