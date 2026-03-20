const express = require('express');

const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { authRequired } = require('../middleware/auth');

const { fetchAddressByCep } = require('../services/viaCep');
const { getWeatherSnapshotByAddress } = require('../services/weatherService');
const { getSaoPauloDateISO, parseSaoPauloLocalToDateUTC } = require('../utils/time');

const router = express.Router();
const SLOT_START_HOUR = 8;
const SLOT_END_HOUR = 18;
const SLOT_DURATION_MINUTES = 60;

function validateDateISO(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function validateTimeHHMM(s) {
  return typeof s === 'string' && /^\d{2}:\d{2}$/.test(s);
}

function buildDailySlots() {
  const slots = [];
  for (let hour = SLOT_START_HOUR; hour < SLOT_END_HOUR; hour += 1) {
    slots.push(`${String(hour).padStart(2, '0')}:00`);
  }
  return slots;
}

function isTimeInSlots(timeHHMM) {
  return buildDailySlots().includes(timeHHMM);
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

async function hasConflict(startAt, endAt, ignoreId) {
  const filter = {
    status: { $ne: 'cancelled' },
    startAt: { $lt: endAt },
    endAt: { $gt: startAt },
  };
  if (ignoreId) {
    filter._id = { $ne: ignoreId };
  }
  return Appointment.findOne(filter);
}

router.get('/', authRequired, async (req, res, next) => {
  try {
    const userRole = req.user?.role;
    const meId = req.user?.sub;

    const dateISO =
      typeof req.query.date === 'string' && validateDateISO(req.query.date)
        ? req.query.date
        : getSaoPauloDateISO(new Date());

    const startOfDayUtc = parseSaoPauloLocalToDateUTC(dateISO, '00:00');
    const endOfDayUtc = new Date(startOfDayUtc.getTime() + 24 * 60 * 60 * 1000);

    const filterBase = {
      status: { $ne: 'cancelled' },
      startAt: { $lt: endOfDayUtc },
      endAt: { $gt: startOfDayUtc },
    };

    const filter =
      userRole === 'patient'
        ? { ...filterBase, patientId: meId }
        : filterBase; // secretary can see all

    const items = await Appointment.find(filter)
      .sort({ startAt: 1 })
      .populate('patientId', 'name email');

    const mapped = items.map((a) => ({
      id: a._id,
      patientId: a.patientId._id,
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
    }));

    return res.json({ ok: true, date: dateISO, items: mapped });
  } catch (err) {
    next(err);
  }
});

router.get('/slots', authRequired, async (req, res, next) => {
  try {
    const dateISO =
      typeof req.query.date === 'string' && validateDateISO(req.query.date)
        ? req.query.date
        : getSaoPauloDateISO(new Date());

    const slots = buildDailySlots();
    const availability = [];

    for (const timeHHMM of slots) {
      const startAt = parseSaoPauloLocalToDateUTC(dateISO, timeHHMM);
      const endAt = new Date(startAt.getTime() + SLOT_DURATION_MINUTES * 60 * 1000);
      const conflict = await hasConflict(startAt, endAt);
      const pastSlot = isDateToday(dateISO) && isStartInPast(startAt);
      availability.push({ timeHHMM, available: !conflict && !pastSlot });
    }

    return res.json({ ok: true, date: dateISO, slots: availability });
  } catch (err) {
    next(err);
  }
});

router.get('/weather-preview', authRequired, async (req, res, next) => {
  try {
    const dateISO = String(req.query.dateISO || '');
    const cep = String(req.query.cep || '');
    if (!validateDateISO(dateISO)) {
      return res.status(400).json({ ok: false, error: 'dateISO inválida (YYYY-MM-DD)' });
    }
    if (!cep) {
      return res.status(400).json({ ok: false, error: 'cep é obrigatório' });
    }

    const address = await fetchAddressByCep(cep);
    const weatherSnapshot = await getWeatherSnapshotByAddress({ address, dateISO });
    return res.json({ ok: true, dateISO, address, weatherSnapshot });
  } catch (err) {
    next(err);
  }
});

router.post('/', authRequired, async (req, res, next) => {
  try {
    const userRole = req.user?.role;
    const meId = req.user?.sub;

    const { dateISO, timeHHMM, cep, notes = '', patientId } = req.body || {};

    if (!validateDateISO(dateISO)) {
      return res.status(400).json({ ok: false, error: 'Informe dateISO no formato YYYY-MM-DD' });
    }
    if (!validateTimeHHMM(timeHHMM)) {
      return res.status(400).json({ ok: false, error: 'Informe timeHHMM no formato HH:MM' });
    }

    if (!cep) {
      return res.status(400).json({ ok: false, error: 'Informe cep' });
    }

    if (isDateInPast(dateISO)) {
      return res.status(400).json({ ok: false, error: 'Não é permitido agendar em data passada' });
    }
    if (!isTimeInSlots(timeHHMM)) {
      return res.status(400).json({ ok: false, error: 'Horário fora dos slots permitidos (08:00-17:00)' });
    }

    const durationMinutes = SLOT_DURATION_MINUTES;
    const startAt = parseSaoPauloLocalToDateUTC(dateISO, timeHHMM);
    const endAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000);
    if (isDateToday(dateISO) && isStartInPast(startAt)) {
      return res.status(400).json({ ok: false, error: 'Não é permitido agendar em horário já passado' });
    }

    let targetPatientId = meId;
    if (userRole === 'secretary') {
      if (!patientId) {
        return res.status(400).json({ ok: false, error: 'secretary precisa enviar patientId' });
      }
      const patient = await User.findById(patientId).select('_id role');
      if (!patient || patient.role !== 'patient') {
        return res.status(400).json({ ok: false, error: 'patientId inválido' });
      }
      targetPatientId = patient._id;
    }

    const conflict = await hasConflict(startAt, endAt);

    if (conflict) {
      return res.status(409).json({
        ok: false,
        error: 'Conflito de horário: já existe um agendamento nesse intervalo.',
        conflictStartAt: conflict.startAt,
      });
    }

    const address = await fetchAddressByCep(cep);
    const resolvedDateISO = getSaoPauloDateISO(startAt);
    const weatherSnapshot = await getWeatherSnapshotByAddress({ address, dateISO: resolvedDateISO });

    const appointment = await Appointment.create({
      patientId: targetPatientId,
      createdById: meId,
      startAt,
      endAt,
      durationMinutes,
      notes,
      address,
      weatherSnapshot,
    });

    const populated = await Appointment.findById(appointment._id).populate('patientId', 'name email');

    return res.status(201).json({
      ok: true,
      item: {
        id: populated._id,
        patient: { id: populated.patientId._id, name: populated.patientId.name, email: populated.patientId.email },
        startAt: populated.startAt,
        endAt: populated.endAt,
        notes: populated.notes,
        address: populated.address,
        weatherSnapshot: populated.weatherSnapshot,
        status: populated.status,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

