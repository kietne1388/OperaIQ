// Smoke test the OperaIQ API end-to-end. Run with: node smoke.mjs
const BASE = 'http://localhost:5074/api';

function decodeJwt(token) {
  const payload = token.split('.')[1];
  return JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
}

async function main() {
  // 1. Tenants (anonymous)
  const tenants = await (await fetch(`${BASE}/auth/tenants`)).json();
  console.log('TENANTS:', JSON.stringify(tenants));
  const operaiq = tenants.find((t) => t.slug === 'operaiq');

  // 2. Login as owner
  const loginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@operaiq.vn', password: 'Password123!', tenantId: operaiq.id }),
  });
  console.log('LOGIN STATUS:', loginRes.status);
  const auth = await loginRes.json();
  console.log('ROLES:', JSON.stringify(auth.roles), 'PERMISSIONS:', JSON.stringify(auth.permissions));

  const claims = decodeJwt(auth.token);
  console.log('TOKEN CLAIM KEYS:', JSON.stringify(Object.keys(claims)));
  console.log('  tenant_id:', claims['tenant_id']);
  console.log('  tenant_slug:', claims['tenant_slug']);
  console.log('  nameidentifier:', claims['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier']);
  console.log('  role:', claims['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']);
  console.log('  permissions:', JSON.stringify(claims['permissions']));

  const headers = { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' };

  // 3. Dashboard summary
  const dash = await (await fetch(`${BASE}/dashboard/summary`, { headers })).json();
  console.log('DASHBOARD:', JSON.stringify({
    projectCount: dash.projectCount, taskCount: dash.taskCount,
    completedTaskCount: dash.completedTaskCount, documentCount: dash.documentCount,
    recentTasks: dash.recentTasks?.length,
  }));

  // 4. Projects
  const projects = await (await fetch(`${BASE}/projects`, { headers })).json();
  console.log('PROJECTS:', projects.map((p) => p.name));
  const proj = projects[0];

  // 5. Tasks by project
  const tasks = await (await fetch(`${BASE}/tasks/by-project/${proj.id}`, { headers })).json();
  console.log('PROJECT TASKS:', tasks.map((t) => `${t.title} [${t.status}] -> ${t.assignedToName ?? 'unassigned'}`));

  // 6. Create a task
  const createRes = await fetch(`${BASE}/tasks`, {
    method: 'POST', headers,
    body: JSON.stringify({ title: 'Smoke test task', projectId: proj.id, priority: 'High', useAiAssignment: false }),
  });
  console.log('CREATE TASK STATUS:', createRes.status);
  const created = await createRes.json();
  console.log('CREATED:', created.id, created.title);

  // 7. Update status
  const statusRes = await fetch(`${BASE}/tasks/${created.id}/status`, {
    method: 'PUT', headers, body: JSON.stringify({ id: created.id, status: 'InProgress' }),
  });
  console.log('UPDATE STATUS:', statusRes.status, JSON.stringify(await statusRes.json()));

  // 8. AI-assign the unassigned task (find one with no assignee)
  const unassigned = tasks.find((t) => !t.assignedToId);
  if (unassigned) {
    const aiRes = await fetch(`${BASE}/tasks/${unassigned.id}/ai-assign`, { method: 'POST', headers });
    console.log('AI ASSIGN:', aiRes.status, JSON.stringify(await aiRes.json()));
  } else {
    console.log('AI ASSIGN: (no unassigned task to test)');
  }

  console.log('\nSMOKE TEST OK');
}

main().catch((e) => { console.error('SMOKE TEST FAILED:', e); process.exit(1); });
