import http from 'k6/http';
import { check, sleep } from 'k6';

const userIds = [1933, 1934, 1935, 1936, 1938, 1939, 1940, 1941, 1942, 1943, 1944, 1945, 1946, 1947, 1948, 1949, 1950, 1951, 1952, 1953, 1954, 1955, 1956, 1957, 1958, 1959, 1960, 1961, 1962, 1963, 1964, 1965, 1966, 1967, 1968, 1969, 1970, 1971, 1972, 1973, 1974, 1975, 1976];

export let options = {
  stages: [
    { duration: '60s', target: userIds.length },
  ],
};

const BASE_URL = 'http://localhost:3000'; // ou o endereço real do seu backend

const headers = {
  headers: {
    Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InVzZXJfMDAwZjdmYjktZmUyNC00M2NlLWI5YzMtZjNhMDg5OWEwMjE1IiwiaWF0IjoxNzQ3ODczMzkyLCJleHAiOjE3NDc4NzY5OTJ9.MHeaQ_4aAM5jfKl_6eOpOdLEyB9sJJZ6OKp_SZlvc8Q',
  },
};

// Lista de IDs para verificar
export default function () {
  const userId = userIds[(__VU - 1) % userIds.length]; // Seleciona o ID com base no índice do VU

  // Requisição GET para buscar os dados do perfil do usuário
  const userData = http.get(`${BASE_URL}/user-profile/${userId}`, headers);

  check(userData, {
    [`Dados do perfil do usuário → status é 200`]: (r) => r.status === 200,
    [`Dados do perfil do usuário → tempo < 2000ms`]: (r) => r.timings.duration < 2000,
  });

  const messagesData = http.get(`${BASE_URL}/messages/${userId}`, headers);

  check(messagesData, {
    [`Chat com o usuário → status é 200`]: (r) => r.status === 200,
    [`Chat com o usuário → tempo < 2000ms`]: (r) => r.timings.duration < 2000,
  });

  // Requisição POST para seguir o usuário
  const followUser = http.post(`${BASE_URL}/follow-user/${userId}`, null, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: headers.headers.Authorization,
    },
  });

  check(followUser, {
    [`Seguir usuário → status é 201`]: (r) => r.status === 201,
    [`Seguir usuário → tempo < 2000ms`]: (r) => r.timings.duration < 2000,
  });

  sleep(1);

  // Requisição POST para deixar de seguir o usuário
  const unfollowUser = http.post(`${BASE_URL}/unfollow-user/${userId}`, null, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: headers.headers.Authorization,
    },
  });

  check(unfollowUser, {
    [`Deixar de seguir usuário → status é 200`]: (r) => r.status === 200,
    [`Deixar de seguir usuário → tempo < 2000ms`]: (r) => r.timings.duration < 2000,
  });

  sleep(2); // intervalo entre ciclos por VU
}