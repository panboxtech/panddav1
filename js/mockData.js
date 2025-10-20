// js/mockData.js
// Mock data and simple in-memory API for the Pandda prototype.
// Replace with Supabase calls in production as noted in comments.

/* Util: gera ID simples */
function uid(prefix = '') {
  return prefix + Math.random().toString(36).slice(2, 9);
}

/* Mock storage (em memória). Em produção substituir por chamadas ao Supabase. */
const MockDB = {
  clients: [],
  servers: [],
  apps: [],
  plans: [],
  users: [], // para autenticação mock
};

/* Inicializa dados mock */
function seedMockData() {
  // Servidores
  MockDB.servers = [
    { id: uid('srv_'), nome: 'Servidor A', alias: 'srv-a' },
    { id: uid('srv_'), nome: 'Servidor B', alias: 'srv-b' },
  ];

  // Apps (cada app pertence a um servidor via serverId)
  MockDB.apps = [
    { id: uid('app_'), nome: 'App X', codigoDeAcesso: 'AX1', urlDownloadAndroid: '', urlDownloadIos: '', codigoDonwloadDownloader: 'D1', codigoNTDown: 'NT1', multiplosAcessos: true, serverId: MockDB.servers[0].id },
    { id: uid('app_'), nome: 'App X', codigoDeAcesso: 'AX2', urlDownloadAndroid: '', urlDownloadIos: '', codigoDonwloadDownloader: 'D2', codigoNTDown: 'NT2', multiplosAcessos: false, serverId: MockDB.servers[1].id },
    { id: uid('app_'), nome: 'App Y', codigoDeAcesso: 'AY1', urlDownloadAndroid: '', urlDownloadIos: '', codigoDonwloadDownloader: 'D3', codigoNTDown: 'NT3', multiplosAcessos: true, serverId: MockDB.servers[1].id },
  ];

  // Planos (com o novo campo observacoes)
  MockDB.plans = [
    { id: uid('pl_'), nome: 'Básico', telas: 2, validadeEmMeses: 1, preco: 29.90, observacoes: '' },
    { id: uid('pl_'), nome: 'Pro', telas: 4, validadeEmMeses: 3, preco: 69.90, observacoes: 'Inclui suporte básico' },
    { id: uid('pl_'), nome: 'Premium', telas: 8, validadeEmMeses: 12, preco: 199.90, observacoes: 'Inclui SLA e integrações' },
  ];

  // Clientes: cria datas variadas para testar filtros
  const today = new Date();
  function addDays(d, days){ const n = new Date(d); n.setDate(n.getDate() + days); return n; }

  MockDB.clients = [
    { id: uid('cli_'), nome: 'João Silva', telefone: '79999-0001', email: 'joao@mail.com', dataVencimento: addDays(today, 2).toISOString(), notificado: false, planoId: MockDB.plans[0].id, telas: 2, preco: MockDB.plans[0].preco, pontosAcesso: [] },
    { id: uid('cli_'), nome: 'Maria Souza', telefone: '79999-0002', email: 'maria@mail.com', dataVencimento: addDays(today, -10).toISOString(), notificado: true, planoId: MockDB.plans[1].id, telas: 4, preco: MockDB.plans[1].preco, pontosAcesso: [] },
    { id: uid('cli_'), nome: 'Empresa XYZ', telefone: '0800-1234', email: 'contato@xyz.com', dataVencimento: addDays(today, -40).toISOString(), notificado: false, planoId: MockDB.plans[2].id, telas: 8, preco: MockDB.plans[2].preco, pontosAcesso: [] },
  ];

  // Usuários mock para login (role: master | comum)
  MockDB.users = [
    { id: uid('u_'), email: 'admin@pandda.com', password: 'master', role: 'master' },
    { id: uid('u_'), email: 'user@pandda.com', password: 'comum', role: 'comum' },
  ];
}

/* API mock simples (retorna Promises para simular async)
   Substituir cada função por chamadas ao Supabase conforme comentários.
*/
const MockAPI = {
  init() { seedMockData(); },

  // Autenticação mock: substituir por supabase.auth.signInWithPassword(...)
  login(email, password, role) {
    return new Promise((resolve, reject) => {
      const u = MockDB.users.find(x => x.email === email && x.password === password && x.role === role);
      setTimeout(() => {
        if (u) resolve({ user: { id: u.id, email: u.email, role: u.role } });
        else reject(new Error('Credenciais inválidas'));
      }, 300);
    });
  },

  // Clients
  getClients() {
    return new Promise(resolve => setTimeout(() => resolve(JSON.parse(JSON.stringify(MockDB.clients))), 200));
    // Supabase: return supabase.from('clients').select('*')
  },
  createClient(client) {
    return new Promise(resolve => {
      client.id = uid('cli_');
      MockDB.clients.push(client);
      setTimeout(() => resolve(client), 200);
    });
    // Supabase: supabase.from('clients').insert([client])
  },
  updateClient(id, patch) {
    return new Promise(resolve => {
      const idx = MockDB.clients.findIndex(c => c.id === id);
      if (idx >= 0) {
        MockDB.clients[idx] = Object.assign({}, MockDB.clients[idx], patch);
        setTimeout(() => resolve(MockDB.clients[idx]), 200);
      } else setTimeout(() => resolve(null), 200);
    });
  },
  deleteClient(id) {
    return new Promise(resolve => { MockDB.clients = MockDB.clients.filter(c => c.id !== id); setTimeout(() => resolve(true), 200); });
  },

  // Servers
  getServers() { return new Promise(res => setTimeout(() => res(JSON.parse(JSON.stringify(MockDB.servers))), 200)); },
  createServer(s) { s.id = uid('srv_'); MockDB.servers.push(s); return Promise.resolve(s); },
  // Note: update/delete could be added similarly

  // Apps
  getApps() { return new Promise(res => setTimeout(() => res(JSON.parse(JSON.stringify(MockDB.apps))), 200)); },
  createApp(a) { a.id = uid('app_'); MockDB.apps.push(a); return Promise.resolve(a); },

  // Plans
  getPlans() { return new Promise(res => setTimeout(() => res(JSON.parse(JSON.stringify(MockDB.plans))), 200)); },
  createPlan(p) {
    // If id provided, try replace/update semantics for prototype convenience
    if (p && p.id) {
      const idx = MockDB.plans.findIndex(x => x.id === p.id);
      if (idx >= 0) {
        MockDB.plans[idx] = Object.assign({}, MockDB.plans[idx], p);
        return Promise.resolve(MockDB.plans[idx]);
      }
    }
    p.id = uid('pl_');
    // Ensure observacoes field exists even if omitted
    if (typeof p.observacoes === 'undefined') p.observacoes = '';
    MockDB.plans.push(p);
    return Promise.resolve(p);
  },
};

/* Exports to global for the prototype */
window.MockDB = MockDB;
window.MockAPI = MockAPI;
