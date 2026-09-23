const { Schema, model } = require('mongoose');
const crypto = require('crypto');

// Unambiguous alphabet (no 0/O/1/I/L) for readable, hard-to-guess codes.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

// Generates a code like SKP-7K9X2M using cryptographically secure randomness.
function generateCode(len = 6) {
  const bytes = crypto.randomBytes(len);
  let body = '';
  for (let i = 0; i < len; i += 1) {
    body += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return `SKP-${body}`;
}

const verificationCodeSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    active: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    usedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    usedByLabel: { type: String, default: '' }, // name/id snapshot for display
    usedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null }, // null = never expires
  },
  { timestamps: true }
);

verificationCodeSchema.methods.isUsable = function isUsable() {
  if (!this.active) return false;
  if (this.usedBy) return false;
  if (this.expiresAt && this.expiresAt.getTime() < Date.now()) return false;
  return true;
};

// Human-friendly status for the admin table.
verificationCodeSchema.methods.status = function status() {
  if (this.usedBy) return 'used';
  if (!this.active) return 'inactive';
  if (this.expiresAt && this.expiresAt.getTime() < Date.now()) return 'expired';
  return 'active';
};

verificationCodeSchema.statics.generateCode = generateCode;

// Create a unique code, retrying on the rare collision.
verificationCodeSchema.statics.createUnique = async function createUnique(fields = {}) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = generateCode();
    // eslint-disable-next-line no-await-in-loop
    const exists = await this.findOne({ code });
    if (!exists) return this.create({ code, ...fields });
  }
  throw new Error('Could not generate a unique code, please retry');
};

module.exports = model('VerificationCode', verificationCodeSchema);
