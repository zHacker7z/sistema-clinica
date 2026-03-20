const express = require('express');
const mongoose = require('mongoose');

const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { authRequired } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { getSaoPauloDateISO, parseSaoPauloLocalToDateUTC } = require('../utils/time');
const { fetchAddressByCep } = require('../services/viaCep');
const { getWeatherSnapshotByAddress } = require('../services/weatherService');

const router = express.Router();

function validateDateISO(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function validateTimeHHMM(s) {
  return typeof s === 'string' && /^\d{2}:\d{2}$/.test(s);
}

function isDateInPast(dateISO) {
  const today = getSaoPauloDateISO(new Date());
  return dateISO < today;
}

function isDateToday(dateISO) {
  const today = getSaoPauloDateISO(new Date());
  return dateISO === today;
}

function isStartInPast(startAt) {
  return startAt.getTime() <= Date.now();
}

function isSlotTime(timeHHMM) {
  return /^(0[8-9]|1[0-7]):00$/.test(timeHHMM);
}

async function hasConflict(startAt, endAt, ignoreId) {
  return Appointment.findOne({
    _id: { $ne: ignoreId },
    status: { $ne: 'cancelled' },
    startAt: { $lt: endAt },
    endAt: { $gt: startAt },
  });
}

router.get('/appointments', authRequired, requireRole('secretary'), async (req, res, next) => {
  try {
    const dateISO =
      typeof req.query.date === 'string' && validateDateISO(req.query.date)
        ? req.query.date
        : getSaoPauloDateISO(new Date());

    const startOfDayUtc = parseSaoPauloLocalToDateUTC(dateISO, '00:00');
    const endOfDayUtc = new Date(startOfDayUtc.getTime() + 24 * 60 * 60 * 1000);

    const page = Math.max(1, Number.parseInt(String(req.query.page || '1'), 10) || 1);
    const limitRaw = Number.parseInt(String(req.query.limit || '10'), 10) || 10;
    const limit = Math.min(50, Math.max(1, limitRaw));
    const skip = (page - 1) * limit;

    const statusFilter = String(req.query.status || 'all');
    const patientIdFilter = String(req.query.patientId || '');

    const filter = {
      startAt: { $lt: endOfDayUtc },
      endAt: { $gt: startOfDayUtc },
    };
    if (statusFilter !== 'all' && ['scheduled', 'completed', 'cancelled'].includes(statusFilter)) {
      filter.status = statusFilter;
    }
    if (patientIdFilter && patientIdFilter !== 'all' && mongoose.Types.ObjectId.isValid(patientIdFilter)) {
      filter.patientId = patientIdFilter;
    }

    const [items, total] = await Promise.all([
      Appointment.find(filter)
      .sort({ startAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate('patientId', 'name email'),
      Appointment.countDocuments(filter),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return res.json({
      ok: true,
      date: dateISO,
      page,
      limit,
      total,
      totalPages,
      items: items.map((a) => ({
        id: a._id,
        patient: { id: a.patientId._id, name: a.patientId.name, email: a.patientId.email },
        createdById: a.createdById,
        startAt: a.startAt,
        endAt: a.endAt,
        durationMinutes: a.durationMinutes,
        notes: a.notes,
        address: a.address,
        weatherSnapshot: a.weatherSnapshot,
        status: a.status,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/patients', authRequired, requireRole('secretary'), async (_req, res, next) => {
  try {
    const patients = await User.find({ role: 'patient' }).select('_id name email').sort({ name: 1 });
    return res.json({ ok: true, patients: patients.map((p) => ({ id: p._id, name: p.name, email: p.email })) });
  } catch (err) {
    next(err);
  }
});

router.patch('/appointments/:id/cancel', authRequired, requireRole('secretary'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findById(id);
    if (!appointment) return res.status(404).json({ ok: false, error: 'Agendamento não encontrado' });

    appointment.status = 'cancelled';
    await appointment.save();

    return res.json({ ok: true, itemId: appointment._id, status: appointment.status });
  } catch (err) {
    next(err);
  }
});

router.patch('/appointments/:id/status', authRequired, requireRole('secretary'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const status = String(req.body?.status || '');
    if (!['scheduled', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ ok: false, error: 'Status inválido' });
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) return res.status(404).json({ ok: false, error: 'Agendamento não encontrado' });

    appointment.status = status;
    await appointment.save();

    return res.json({ ok: true, itemId: appointment._id, status: appointment.status });
  } catch (err) {
    next(err);
  }
});

router.patch('/appointments/:id/reschedule', authRequired, requireRole('secretary'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { dateISO, timeHHMM, cep } = req.body || {};

    if (!validateDateISO(dateISO)) {
      return res.status(400).json({ ok: false, error: 'dateISO inválida' });
    }
    if (!validateTimeHHMM(timeHHMM)) {
      return res.status(400).json({ ok: false, error: 'timeHHMM inválido' });
    }
    if (!isSlotTime(timeHHMM)) {
      return res.status(400).json({ ok: false, error: 'Use slots entre 08:00 e 17:00' });
    }
    if (isDateInPast(dateISO)) {
      return res.status(400).json({ ok: false, error: 'Não é permitido remarcar em data passada' });
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) return res.status(404).json({ ok: false, error: 'Agendamento não encontrado' });

    const startAt = parseSaoPauloLocalToDateUTC(dateISO, timeHHMM);
    const endAt = new Date(startAt.getTime() + appointment.durationMinutes * 60 * 1000);
    if (isDateToday(dateISO) && isStartInPast(startAt)) {
      return res.status(400).json({ ok: false, error: 'Não é permitido remarcar para horário já passado' });
    }
    const conflict = await hasConflict(startAt, endAt, appointment._id);
    if (conflict) {
      return res.status(409).json({ ok: false, error: 'Conflito de horário na remarcação' });
    }

    if (cep) {
      appointment.address = await fetchAddressByCep(cep);
    }

    const resolvedDateISO = getSaoPauloDateISO(startAt);
    appointment.weatherSnapshot = await getWeatherSnapshotByAddress({
      address: appointment.address,
      dateISO: resolvedDateISO,
    });
    appointment.startAt = startAt;
    appointment.endAt = endAt;
    if (appointment.status === 'cancelled') {
      appointment.status = 'scheduled';
    }
    await appointment.save();

    return res.json({ ok: true, itemId: appointment._id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

