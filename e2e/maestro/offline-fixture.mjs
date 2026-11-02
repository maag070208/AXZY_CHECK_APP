#!/usr/bin/env node
// Prepara y verifica por API la suite offline del guardia (usa los usuarios de prueba de dev).
// Uso: node offline-fixture.mjs prepare | review | clean | verify <desde-ISO> <assignmentId> [días]
const API = process.env.API_BASE ?? 'http://192.168.10.100:4444/api/v1';

const request = async (path, token, options = {}) => {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  const body = await res.json();
  if (!res.ok || body.success === false) throw new Error(`${path}: ${res.status} ${body.messages?.[0] ?? ''}`);
  return body.data;
};
const login = (username) =>
  request('/users/login', null, { method: 'POST', body: JSON.stringify({ username, password: '123456' }) });
const guardIdOf = (token) => JSON.parse(Buffer.from(token.split('.')[1], 'base64url')).id;

const prepare = async () => {
  const admin = await login('isabel');
  const guardId = guardIdOf(await login('marcoh'));
  const rows = await request('/recurring', admin).catch(() => []);
  const route = rows.find?.((item) => item.title === 'E2E RONDA 8 PUNTOS');
  const point = route?.recurringLocations?.find((item) => item.location?.name === 'E2E-08');
  if (!point) throw new Error('No existe el punto E2E-08: corre el seed E2E.');
  // Cada corrida empieza limpia: una ronda abierta cambiaría el inicio del guardia y una
  // asignación abierta en el punto se llevaría el reporte.
  const rounds = await request(`/rounds?guardId=${guardId}`, admin);
  for (const round of rounds.filter((item) => item.status === 'IN_PROGRESS')) {
    await request(`/rounds/${round.id}/end`, admin, { method: 'PUT', body: '{}' });
  }
  const existing = await request(`/assignments?guardId=${guardId}`, admin);
  const open = existing.filter((item) => item.locationId === point.location.id && item.status !== 'REVIEWED');
  const pending = open.find((item) => item.status === 'PENDING' && !item.tasks?.some((task) => task.completed));
  for (const item of open.filter((candidate) => candidate.status !== 'PENDING')) {
    await request(`/assignments/${item.id}/status`, admin, { method: 'PATCH', body: JSON.stringify({ status: 'REVIEWED' }) });
  }
  if (pending) {
    console.log(pending.id);
    return;
  }
  const assignment = await request('/assignments', admin, {
    method: 'POST',
    body: JSON.stringify({
      guardId,
      locationId: point.location.id,
      notes: 'Asignacion offline E2E',
      tasks: [{ description: 'Revisar candado E2E' }, { description: 'Revisar luces E2E' }],
    }),
  });
  console.log(assignment.id);
};

const verify = async (since, assignmentId, daysOffline) => {
  const admin = await login('isabel');
  const guardId = guardIdOf(await login('marcoh'));
  const after = (rows) => rows.filter((row) => new Date(row.syncedAt ?? 0) >= new Date(since) && row.createdOffline);
  const failures = [];
  const expect = (label, ok, detail = '') => {
    console.log(`${ok ? 'OK ' : 'FALLA'} ${label} ${detail}`);
    if (!ok) failures.push(label);
  };

  for (const [label, path] of [['incidencia', '/incidents'], ['mantenimiento', '/maintenance'], ['casa club', '/club']]) {
    const rows = after(await request(`${path}?guardId=${guardId}`, admin));
    expect(`${label} offline con foto`, rows.length === 1 && rows[0].media?.length === 1, `filas=${rows.length} fotos=${rows[0]?.media?.length}`);
  }

  const rounds = after(await request(`/rounds?guardId=${guardId}`, admin));
  expect('una ronda offline cerrada', rounds.length === 1 && rounds[0].status === 'COMPLETED', `filas=${rounds.length} estado=${rounds[0]?.status}`);

  if (daysOffline) {
    const expected = Number(daysOffline) > 7 ? 0 : Number(daysOffline);
    const age = (Date.now() - new Date(rounds[0]?.startTime)) / 86_400_000;
    expect(`ronda con fecha de hace ${expected} días`, Math.abs(age - expected) < 1, `${age.toFixed(1)} días`);
  }

  const kardex = after(await request(`/kardex?userId=${guardId}`, admin));
  const inRound = kardex.filter((row) => row.roundId === rounds[0]?.id);
  const byName = (name) => inRound.find((row) => row.location?.name === name);
  expect('tres puntos en la ronda', inRound.length === 3, `filas=${inRound.length}`);
  expect('E2E-01 sin guardar llega vacío', byName('E2E-01') && !byName('E2E-01').notes);
  expect('E2E-02 con nota y foto', byName('E2E-02')?.notes?.startsWith('Punto guardado sin WiFi') && byName('E2E-02')?.media?.length === 1);
  expect('E2E-03 conserva la foto tras cerrar la APP', byName('E2E-03')?.media?.length === 1);

  const linked = kardex.filter((row) => row.assignmentId === Number(assignmentId));
  expect('asignación con su reporte', linked.length === 1 && linked[0].media?.length === 1 && linked[0].notes === 'Asignacion sin WiFi', `filas=${linked.length}`);
  const assignment = (await request(`/assignments?id=${assignmentId}`, admin))[0];
  expect('asignación en revisión', assignment?.status === 'CHECKING', assignment?.status);
  expect('tareas completadas', assignment?.tasks?.every((task) => task.completed), JSON.stringify(assignment?.tasks?.map((t) => t.completed)));

  if (failures.length) {
    console.error(`Fallaron ${failures.length} verificaciones.`);
    process.exit(1);
  }
};

// Cierra lo abierto del guardia: una asignación abierta en un punto se lleva sus reportes.
const closeOpen = async (admin, guardId) => {
  const open = (await request(`/assignments?guardId=${guardId}`, admin)).filter((item) => item.status !== 'REVIEWED');
  for (const item of open) {
    const steps = item.status === 'PENDING' ? ['CHECKING', 'REVIEWED'] : ['REVIEWED'];
    for (const status of steps) {
      await request(`/assignments/${item.id}/status`, admin, { method: 'PATCH', body: JSON.stringify({ status }) });
    }
  }
};

// Una asignación con reporte entregado (E2E-07) y otra solo con el borrador del escaneo (E2E-08).
const review = async () => {
  const admin = await login('isabel');
  const guard = await login('marcoh');
  const guardId = guardIdOf(guard);
  await closeOpen(admin, guardId);
  const route = (await request('/recurring', admin)).find((item) => item.title === 'E2E RONDA 8 PUNTOS');
  const scan = async (name) => {
    const location = route.recurringLocations.find((item) => item.location?.name === name).location;
    const assignment = await request('/assignments', admin, {
      method: 'POST',
      body: JSON.stringify({ guardId, locationId: location.id, notes: `Revision ${name}` }),
    });
    return request('/kardex', guard, {
      method: 'POST',
      body: JSON.stringify({ userId: guardId, locationId: location.id, notes: '', media: [], assignmentId: assignment.id }),
    });
  };
  const report = await scan('E2E-07');
  await request(`/kardex/${report.id}`, guard, {
    method: 'PATCH',
    body: JSON.stringify({ notes: 'Reporte terminado', media: [{ type: 'IMAGE', url: 'https://example.test/e2e.jpg', key: 'e2e/entregada.jpg' }] }),
  });
  await scan('E2E-08');
};

const clean = async () => closeOpen(await login('isabel'), guardIdOf(await login('marcoh')));

const [action, ...args] = process.argv.slice(2);
await ({ prepare, review, clean }[action] ?? verify)(...(action === 'verify' ? args : []));
