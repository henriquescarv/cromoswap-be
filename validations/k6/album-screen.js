import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m', target: 100 },
  ],
};

const BASE_URL = 'http://localhost:3000'; // ou o endereço real do seu backend

const headers = {
  headers: {
    Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InVzZXJfMDAwZjdmYjktZmUyNC00M2NlLWI5YzMtZjNhMDg5OWEwMjE1IiwiaWF0IjoxNzQ3ODcxNzc1LCJleHAiOjE3NDc4NzUzNzV9.nZ21rn7SVtwV8ceEqCriGyPiMEtY4iIohNuBUxavBsg',
  },
};

export default function () {
  // Requisição GET para buscar os dados do álbum
  const albumResponse = http.get(`${BASE_URL}/album-details/1`, headers);
  check(albumResponse, {
    'GET /album-details/1 status é 200': (r) => r.status === 200,
    'GET /album-details/1 tempo < 500ms': (r) => r.timings.duration < 500,
  });

  const batchUpdateBody = JSON.stringify({
    stickersToUpdate: [
        {
            id: 1,
            quantity: Math.floor(Math.random() * 10) + 1
        },
        {
            id: 2,
            quantity: Math.floor(Math.random() * 10) + 1
        },
        {
            id: 3,
            quantity: Math.floor(Math.random() * 10) + 1
        },
        {
            id: 4,
            quantity: Math.floor(Math.random() * 10) + 1
        },
        {
            id: 5,
            quantity: Math.floor(Math.random() * 10) + 1
        },
        {
            id: 6,
            quantity: Math.floor(Math.random() * 10) + 1
        },
        {
            id: 7,
            quantity: Math.floor(Math.random() * 10) + 1
        },
        {
            id: 8,
            quantity: Math.floor(Math.random() * 10) + 1
        },
        {
            id: 9,
            quantity: Math.floor(Math.random() * 10) + 1
        },
        {
            id: 10,
            quantity: Math.floor(Math.random() * 10) + 1
        }
    ]
  });

  const batchUpdateResponse = http.post(`${BASE_URL}/user-sticker/batch-update`, batchUpdateBody, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InVzZXJfMDAwZjdmYjktZmUyNC00M2NlLWI5YzMtZjNhMDg5OWEwMjE1IiwiaWF0IjoxNzQ3ODcxNzc1LCJleHAiOjE3NDc4NzUzNzV9.nZ21rn7SVtwV8ceEqCriGyPiMEtY4iIohNuBUxavBsg',
    },
  });

  check(batchUpdateResponse, {
    'POST /batch-update status é 200': (r) => r.status === 200,
    'POST /batch-update tempo < 500ms': (r) => r.timings.duration < 2000,
  });

  sleep(1.5); // Intervalo entre ciclos por VU
}