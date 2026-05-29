// Validações de dados do cliente. Compartilhadas (servidor é a fonte de verdade).

export function onlyDigits(s) {
  return String(s || '').replace(/\D/g, '');
}

export function isValidCPF(value) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // todos iguais

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i], 10) * (10 - i);
  let d1 = 11 - (sum % 11);
  if (d1 >= 10) d1 = 0;
  if (d1 !== parseInt(cpf[9], 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i], 10) * (11 - i);
  let d2 = 11 - (sum % 11);
  if (d2 >= 10) d2 = 0;
  return d2 === parseInt(cpf[10], 10);
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

export function isValidPhone(value) {
  const p = onlyDigits(value);
  return p.length === 10 || p.length === 11;
}

export function isValidCEP(value) {
  return onlyDigits(value).length === 8;
}

const UFS = new Set(['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']);

/**
 * Valida o payload do checkout. Retorna { valid, errors, clean }.
 */
export function validateCheckout(body = {}) {
  const errors = {};
  const get = (k) => String(body[k] || '').trim();

  const name = get('name');
  if (name.length < 3 || !name.includes(' ')) errors.name = 'Informe seu nome completo.';
  else if (name.length > 150) errors.name = 'Nome muito longo.';

  const email = get('email');
  if (!isValidEmail(email)) errors.email = 'E-mail inválido.';
  else if (email.length > 150) errors.email = 'E-mail muito longo.';

  const phone = get('phone');
  if (!isValidPhone(phone)) errors.phone = 'Telefone inválido (com DDD).';

  const document = get('document');
  if (!isValidCPF(document)) errors.document = 'CPF inválido.';

  const cep = get('cep');
  if (!isValidCEP(cep)) errors.cep = 'CEP inválido.';

  const street = get('street');
  if (street.length < 3) errors.street = 'Informe o endereço.';
  else if (street.length > 200) errors.street = 'Endereço muito longo.';

  const number = get('number');
  if (number.length < 1) errors.number = 'Informe o número.';
  else if (number.length > 20) errors.number = 'Número inválido.';

  const complement = get('complement');
  if (complement.length > 150) errors.complement = 'Complemento muito longo.';

  const neighborhood = get('neighborhood');
  if (neighborhood.length < 2) errors.neighborhood = 'Informe o bairro.';
  else if (neighborhood.length > 100) errors.neighborhood = 'Bairro muito longo.';

  const city = get('city');
  if (city.length < 2) errors.city = 'Informe a cidade.';
  else if (city.length > 100) errors.city = 'Cidade muito longa.';

  const state = get('state').toUpperCase();
  if (!UFS.has(state)) errors.state = 'UF inválida.';

  const clean = {
    name,
    email,
    phone: onlyDigits(phone),
    document: onlyDigits(document),
    cep: onlyDigits(cep),
    street,
    number,
    complement,
    neighborhood,
    city,
    state,
  };

  return { valid: Object.keys(errors).length === 0, errors, clean };
}
