const mongoose = require('mongoose');

const weatherSnapshotSchema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // YYYY-MM-DD (America/Sao_Paulo)
    status: {
      type: String,
      enum: ['rain', 'clear', 'unknown'],
      default: 'unknown',
      required: true,
    },
    precipitationProbabilityMax: { type: Number, default: null }, // 0-100
    lat: { type: Number, default: null },
    lon: { type: Number, default: null },
    source: { type: String, default: 'open-meteo' },
  },
  { _id: false }
);

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

const appointmentSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdById: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },

    durationMinutes: { type: Number, default: 60 },
    notes: { type: String, default: '' },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled'],
      default: 'scheduled',
      required: true,
    },

    address: { type: addressSchema, required: true },
    weatherSnapshot: { type: weatherSnapshotSchema, required: true },
  },
  { timestamps: true }
);

// Overlap query helper: other.startAt < this.endAt && other.endAt > this.startAt
appointmentSchema.index({ startAt: 1 });
appointmentSchema.index({ patientId: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);

