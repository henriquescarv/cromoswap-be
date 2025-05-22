import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 0 },
  ],
};

const BASE_URL = 'http://localhost:3000';  // ou o endereço real do seu backend

const endpoints = [
  '/summary',
  '/user-albums',
  '/users/by-region',
  '/notifications',
  '/last-messages',
];

const headers = {
  headers: {
    Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InJpcXVlZm1sIiwiaWF0IjoxNzQ3NzgwNjYwLCJleHAiOjE3NDc3ODQyNjB9.udPCB_lE2WaAHuW6AodwCMqpbzc20vYExBXVbkT2968',
  },
};

export default function () {
  for (let endpoint of endpoints) {
    const res = http.get(`${BASE_URL}${endpoint}`, headers);

    check(res, {
      [`${endpoint} → status é 200`]: (r) => r.status === 200,
      [`${endpoint} → tempo < 500ms`]: (r) => r.timings.duration < 500,
    });

    sleep(0.5); // pequena pausa entre os endpoints
  }

  sleep(1); // intervalo entre ciclos por VU
}