const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
  {
    cep: { type: String, required: true },
    logradouro: { type: String, default: '' },
    bairro: { type: String, default: '' },
    localidade: { type: String, default: '' },
    uf: { type: String, default: '' },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    passwordHash: { type: String, required: true },
    phone: { type: String, default: '' },
    role: { type: String, required: true, enum: ['patient', 'secretary'] },
    address: { type: addressSchema, default: undefined },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);

