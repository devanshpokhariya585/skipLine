const { Schema, model } = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = ['student', 'chef', 'admin'];

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    // loginId is what the user types to sign in: reg. no for students,
    // a staff code for chefs, "admin" for the owner. Always lowercased.
    loginId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    email: { type: String, trim: true, lowercase: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true },

    // Student-only fields
    block: { type: String, trim: true },
    phone: { type: String, trim: true },
    // Self-registration profile (optional; only set for students who register)
    dob: { type: Date },
    gender: { type: String, enum: ['Male', 'Female', 'Other', 'Prefer not to say'] },
    year: { type: Number, min: 1, max: 4 },
    semester: { type: Number, min: 1, max: 8 },
    branch: { type: String, trim: true },
    foodPreferences: { type: [String], default: [] },
    points: {
      balance: { type: Number, default: 0 },
      monthlyAllowance: { type: Number, default: 0 },
      // "YYYY-MM" of the month the balance was last topped up.
      lastAllocated: { type: String, default: '' },
    },

    mustResetPassword: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.methods.setPassword = async function setPassword(plain) {
  this.passwordHash = await bcrypt.hash(plain, 10);
};

userSchema.methods.verifyPassword = function verifyPassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

// Never leak the hash to the client.
userSchema.methods.toSafeJSON = function toSafeJSON() {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

userSchema.statics.ROLES = ROLES;

module.exports = model('User', userSchema);
