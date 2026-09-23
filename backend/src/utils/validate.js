/*
 * Central validation used by the API so that every rule enforced in React is
 * ALSO enforced server-side. Each validator returns { ok, value, error }.
 * `value` is the cleaned/normalised value to persist when ok is true.
 */

//  Allowed enum values (the backend rejects anything outside these) 
const BRANCHES = [
  'BCA', 'BCA Data Science', 'CSE', 'CSE Data Science', 'ECE', 'EEE',
  'IT', 'Mechanical', 'Civil', 'B.Com', 'BBA', 'B.Sc', 'Other',
];
const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];
const YEARS = [1, 2, 3, 4];
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];
const FOOD_CATEGORIES = ['Starter', 'Main Course', 'South Indian', 'Snacks', 'Beverages', 'Dessert'];
const FOOD_PREFERENCES = ['North Indian', 'South Indian', 'Continental', 'Chinese', 'American', 'Mexican', 'Italian', 'Jain'];

// VIT student email, e.g. devansh.pokhariya2024@vitstudent.ac.in
// Two name fields separated by a dot, then the joining year, then the domain.
const VIT_EMAIL_RE = /^[a-z]+\.[a-z]+[0-9]{4}@vitstudent\.ac\.in$/;
// Registration number, e.g. 24BCA0014 -> 2 digits, branch letters, roll digits.
const REG_NO_RE = /^[0-9]{2}[a-z]{2,4}[0-9]{3,5}$/;
// Indian mobile: 10 digits, starts 6-9
const PHONE_RE = /^[6-9][0-9]{9}$/;
// Name: letters + single spaces between words
const NAME_RE = /^[A-Za-z]+(?: [A-Za-z]+)*$/;
// Dish name: letters/numbers/spaces and a few safe punctuation marks
const DISH_RE = /^[A-Za-z0-9][A-Za-z0-9 &'()\-,.]*$/;

function ok(value) { return { ok: true, value, error: '' }; }
function bad(error) { return { ok: false, value: undefined, error }; }

function ageFrom(dob) {
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

//  Field validators -
const validators = {
  name(v) {
    const s = String(v ?? '').trim();
    if (!s) return bad('Full name is required.');
    if (/\d/.test(s)) return bad('Name cannot contain numbers.');
    if (/\s{2,}/.test(s)) return bad('Remove the extra spaces in the name.');
    if (!NAME_RE.test(s)) return bad('Name can contain only letters and single spaces.');
    if (s.length < 2) return bad('Name is too short.');
    if (s.length > 60) return bad('Name is too long.');
    return ok(s);
  },

  vitEmail(v) {
    const s = String(v ?? '').trim().toLowerCase();
    if (!s) return bad('Email is required.');
    if (!VIT_EMAIL_RE.test(s)) return bad('Use your VIT email, e.g. devansh.pokhariya2024@vitstudent.ac.in');
    return ok(s);
  },

  regNo(v) {
    const s = String(v ?? '').trim().toLowerCase();
    if (!s) return bad('Registration number is required.');
    if (!REG_NO_RE.test(s)) return bad('Enter a valid registration number, e.g. 24BCA0014.');
    return ok(s);
  },

  phone(v) {
    const s = String(v ?? '').trim();
    if (!s) return bad('Phone number is required.');
    if (!/^\d+$/.test(s)) return bad('Phone number can contain digits only.');
    if (!PHONE_RE.test(s)) return bad('Enter a valid 10-digit mobile number.');
    return ok(s);
  },

  dob(v) {
    const s = String(v ?? '').trim();
    if (!s) return bad('Date of birth is required.');
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return bad('Enter a valid date of birth.');
    if (d.getTime() > Date.now()) return bad('Date of birth cannot be in the future.');
    const age = ageFrom(s);
    if (age < 16) return bad('You must be at least 16 years old to register.');
    if (age > 100) return bad('Enter a valid date of birth.');
    return ok(d);
  },

  gender(v) {
    const s = String(v ?? '').trim();
    if (!GENDERS.includes(s)) return bad('Select a valid gender option.');
    return ok(s);
  },

  year(v) {
    const n = parseInt(v, 10);
    if (!YEARS.includes(n)) return bad('Select a valid year.');
    return ok(n);
  },

  semester(v) {
    const n = parseInt(v, 10);
    if (!SEMESTERS.includes(n)) return bad('Select a valid semester.');
    return ok(n);
  },

  branch(v) {
    const s = String(v ?? '').trim();
    if (!BRANCHES.includes(s)) return bad('Select a valid branch.');
    return ok(s);
  },

  foodPreferences(v) {
    const arr = Array.isArray(v) ? v : [];
    const cleaned = [...new Set(arr.filter((x) => FOOD_PREFERENCES.includes(x)))];
    if (!cleaned.length) return bad('Select at least one food preference.');
    return ok(cleaned);
  },

  declaration(v) {
    if (v === true || v === 'true' || v === 'on') return ok(true);
    return bad('Please confirm the declaration to continue.');
  },

  password(v) {
    const s = String(v ?? '');
    if (!s) return bad('Password is required.');
    if (s.length < 8) return bad('Password must be at least 8 characters.');
    if (s.length > 64) return bad('Password is too long.');
    if (!/[A-Z]/.test(s)) return bad('Password must contain an uppercase letter.');
    if (!/[a-z]/.test(s)) return bad('Password must contain a lowercase letter.');
    if (!/[0-9]/.test(s)) return bad('Password must contain a number.');
    if (!/[^A-Za-z0-9]/.test(s)) return bad('Password must contain a special character.');
    return ok(s);
  },

  //  Dish fields 
  dishName(v) {
    const s = String(v ?? '').trim();
    if (!s) return bad('Dish name is required.');
    if (/\s{2,}/.test(s)) return bad('Remove the extra spaces in the name.');
    if (!/[A-Za-z]/.test(s)) return bad('Dish name must include letters.');
    if (!DISH_RE.test(s)) return bad('Dish name has invalid characters.');
    if (s.length < 2) return bad('Dish name is too short.');
    if (s.length > 60) return bad('Dish name is too long.');
    return ok(s);
  },

  price(v) {
    if (v === '' || v === null || v === undefined) return bad('Price is required.');
    const n = Number(v);
    if (!Number.isFinite(n)) return bad('Price must be a number.');
    if (n <= 0) return bad('Price must be greater than 0.');
    if (n > 100000) return bad('Price is unreasonably high.');
    if (Math.round(n * 100) !== n * 100) return bad('Price can have at most 2 decimals.');
    return ok(n);
  },

  category(v) {
    const s = String(v ?? '').trim();
    if (!FOOD_CATEGORIES.includes(s)) return bad('Select a valid category.');
    return ok(s);
  },

  imageUrl(v) {
    const s = String(v ?? '').trim();
    if (!s) return ok(''); // optional
    try {
      const u = new URL(s);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return bad('Image URL must start with http or https.');
      return ok(s);
    } catch {
      return bad('Enter a valid image URL.');
    }
  },

  description(v) {
    const s = String(v ?? '').trim();
    if (s.length > 500) return bad('Description is too long (max 500 characters).');
    return ok(s);
  },
};

// Run several validators and collect field errors.
// spec: { fieldName: [validatorName, rawValue] }
function validateAll(spec) {
  const values = {};
  const errors = {};
  for (const [field, [name, raw]] of Object.entries(spec)) {
    const fn = validators[name];
    const res = fn(raw);
    if (res.ok) values[field] = res.value;
    else errors[field] = res.error;
  }
  return { values, errors, valid: Object.keys(errors).length === 0 };
}

module.exports = {
  BRANCHES, GENDERS, YEARS, SEMESTERS, FOOD_CATEGORIES, FOOD_PREFERENCES,
  VIT_EMAIL_RE, REG_NO_RE, PHONE_RE,
  ageFrom, validators, validateAll,
};
