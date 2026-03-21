<template>
  <div class="auth-layout">
    <div class="card auth-card">
      <h2 class="section-title">Criar conta</h2>
      <form @submit.prevent="handleSubmit" novalidate>
        <div class="row">
          <div class="field">
            <label>Nome</label>
            <input v-model="name" />
          </div>
          <div class="field">
            <label>E-mail</label>
            <input v-model="email" type="email" />
          </div>
        </div>

        <div class="row" style="margin-top: 10px">
          <div class="field">
            <label>Senha</label>
            <input v-model="password" type="password" />
          </div>
          <div class="field">
            <label>Telefone (opcional)</label>
            <input
              v-model="phone"
              inputmode="numeric"
              maxlength="15"
              placeholder="(00) 00000-0000"
              @input="handlePhoneInput"
            />
          </div>
          <div class="field">
            <label>Tipo de usuário</label>
            <select v-model="role">
              <option value="patient">Paciente</option>
              <option value="secretary">Secretária</option>
            </select>
          </div>
        </div>

        <div class="form-actions">
          <button class="primary" type="submit">Criar conta</button>
          <router-link to="/login" class="secondary-btn">Voltar</router-link>
        </div>

        <div v-if="error" class="error-box">
          {{ error }}
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { login, register } from "../services/auth.js";
import { extractErrorMessage } from "../services/errors.js";

const router = useRouter();
const name = ref("");
const email = ref("");
const password = ref("");
const phone = ref("");
const role = ref("patient");
const error = ref("");

function formatPhone(value) {
  const digits = String(value || "")
    .replace(/\D/g, "")
    .slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function normalizePhone(value) {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(0, 11);
}

function handlePhoneInput(e) {
  phone.value = formatPhone(e?.target?.value || phone.value);
}

async function handleSubmit() {
  error.value = "";
  const nameValue = String(name.value || "").trim();
  const emailValue = String(email.value || "").trim();
  const passwordValue = String(password.value || "");

  if (!nameValue || nameValue.length < 2) {
    error.value = "Informe um nome com pelo menos 2 caracteres.";
    return;
  }
  if (!emailValue) {
    error.value = "Informe seu e-mail.";
    return;
  }
  if (!emailValue.includes("@")) {
    error.value = "Digite um e-mail válido.";
    return;
  }
  if (!passwordValue || passwordValue.length < 6) {
    error.value = "A senha deve ter no mínimo 6 caracteres.";
    return;
  }
  const phoneValue = normalizePhone(phone.value);
  if (phoneValue && phoneValue.length < 10) {
    error.value = "Telefone inválido. Use DDD + número.";
    return;
  }

  try {
    await register({
      name: nameValue,
      email: emailValue,
      password: passwordValue,
      role: role.value,
      phone: phoneValue,
    });
    // Após cadastrar, fazemos login direto para simplificar o fluxo acadêmico.
    await login({ email: emailValue, password: passwordValue });
    router.push(role.value === "secretary" ? "/admin" : "/");
  } catch (e) {
    error.value = extractErrorMessage(
      e,
      "Não foi possível concluir seu cadastro.",
    );
  }
}
</script>
