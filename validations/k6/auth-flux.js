import http from 'k6/http';
import { check, sleep } from 'k6';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

export let options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 40 },
    { duration: '30s', target: 0 },
  ],
};

const BASE_URL = 'http://localhost:3000'; // ou o endereço real do seu backend

const headers = {
  headers: {
    'Content-Type': 'application/json',
  },
};

export default function () {
  // Gera um nome de usuário e email únicos
  const uniqueId = uuidv4();
  const username = `user_${uniqueId}`;
  const email = `user_${uniqueId}@example.com`;

  // Simulação de registro
  const registerPayload = JSON.stringify({
    username: username,
    email: email,
    password: '12345678',
    countryState: 'SC',
    city: 'Florianópolis',
  });

  const registerRes = http.post(`${BASE_URL}/register`, registerPayload, headers);

  check(registerRes, {
    'Registro → status é 201': (r) => r.status === 201,
    'Registro → tempo < 2000ms': (r) => r.timings.duration < 2000,
  });

  sleep(1); // pequena pausa entre as requisições

  // Simulação de login
  const loginPayload = JSON.stringify({
    username: username,
    password: '12345678',
  });

  const loginRes = http.post(`${BASE_URL}/login`, loginPayload, headers);

  check(loginRes, {
    'Login → status é 200': (r) => r.status === 200,
    'Login → tempo < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1); // intervalo entre ciclos por VU
}