const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const { env } = require('../config/env');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

function validateEmail(email) {
  const s = String(email || '').trim().toLowerCase();
  return s.includes('@') && s.includes('.');
}

function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '').slice(0, 11);
}

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, role, phone } = req.body || {};

    if (!name || String(name).trim().length < 2) {
      return res.status(400).json({ ok: false, error: 'Nome inválido' });
    }
    if (!validateEmail(email)) {
      return res.status(400).json({ ok: false, error: 'E-mail inválido' });
    }
    if (!password || String(password).length < 6) {
      return res.status(400).json({ ok: false, error: 'Senha muito curta (min 6)' });
    }

    const normalizedRole = role === 'secretary' ? 'secretary' : 'patient';

    const existing = await User.findOne({ email: String(email).trim().toLowerCase() });
    if (existing) {
      return res.status(409).json({ ok: false, error: 'E-mail já cadastrado' });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const user = await User.create({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      passwordHash,
      phone: normalizePhone(phone),
      role: normalizedRole,
    });

    return res.status(201).json({
      ok: true,
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ ok: false, error: 'E-mail e senha são obrigatórios' });
    }

    const user = await User.findOne({ email: String(email).trim().toLowerCase() });
    if (!user) {
      return res.status(401).json({ ok: false, error: 'Credenciais inválidas' });
    }

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) {
      return res.status(401).json({ ok: false, error: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      { sub: String(user._id), role: user.role, email: user.email },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    return res.json({
      ok: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/me', authRequired, async (req, res, next) => {
  try {
    const meId = req.user?.sub;
    const user = await User.findById(meId).select('-passwordHash');
    if (!user) return res.status(404).json({ ok: false, error: 'Usuário não encontrado' });

    return res.json({
      ok: true,
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/me', authRequired, async (req, res, next) => {
  try {
    const meId = req.user?.sub;
    const name = String(req.body?.name || '').trim();
    const phone = normalizePhone(req.body?.phone);

    const user = await User.findById(meId);
    if (!user) return res.status(404).json({ ok: false, error: 'Usuário não encontrado' });

    if (name) {
      if (name.length < 2) return res.status(400).json({ ok: false, error: 'Nome inválido' });
      user.name = name;
    }

    if (phone && phone.length < 10) {
      return res.status(400).json({ ok: false, error: 'Telefone inválido. Use DDD + número.' });
    }
    user.phone = phone;
    await user.save();

    return res.json({
      ok: true,
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

