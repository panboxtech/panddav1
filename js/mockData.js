// js/mockData.js
// Mock data and simple in-memory API for the Pandda prototype.

function uid(prefix = '') {
  return prefix + Math.random().toString(36).slice(2, 9);
}

const MockDB = {
  clients: [],
  servers: [],
  apps: [],
  plans: [],
  users: [],
};

function seedMockData() {
  // Servers
  MockDB.servers = [
    { id: uid('srv_'), nome: 'Servidor A', alias: 'srv-a' },
    { id: uid('srv_'), nome: 'Servidor B', alias: 'srv-b' },
  ];

  // Apps
  MockDB.apps = [
    { id: uid('app_'), nome: 'App X', codigoDeAcesso: 'AX1', urlDownloadAndroid: '', urlDownloadIos: '', codigoDonwloadDownloader: 'D1', codigoNTDown: 'NT1', multiplosAcessos: true, serverId: MockDB.servers[0].id },
    { id: uid('app_'), nome: 'App Z', codigoDeAcesso: 'AZ1', urlDownloadAndroid: '', urlDownloadIos: '', codigoDonwloadDownloader: 'D2', codigoNTDown: 'NT2', multiplosAcessos: false, serverId: MockDB.servers[1].id },
    { id: uid('app_'), nome: 'App Y', codigoDeAcesso: 'AY1', urlDownloadAndroid: '', urlDownloadIos: '', codigoDonwloadDownloader: 'D3', codigoNTDown: 'NT3', multiplosAcessos: true, serverId: MockDB.servers[1].id },
  ];

  // Plans with varied observation lengths
  MockDB.plans = [
    { id: uid('pl_'), nome: 'Básico', telas: 2, validadeEmMeses: 1, preco: 29.90, observacoes: '' },
    { id: uid('pl_'), nome: 'Pro', telas: 4, validadeEmMeses: 3, preco: 69.90, observacoes: 'Inclui suporte básico' },
    { id: uid('pl_'), nome: 'Premium', telas: 8, validadeEmMeses: 12, preco: 199.90, observacoes: 'Inclui SLA e integrações' },
    { id: uid('pl_'), nome: 'Corporativo Plus com recursos estendidos', telas: 20, validadeEmMeses: 12, preco: 899.90, observacoes: 'Plano pensado para grandes clientes com necessidades específicas de integração, SLA 24/7, suporte Premium com gerente dedicado e integrações customizadas via API. Observações: faturamento mensal; faturamento anual com desconto mediante contrato.' },
    { id: uid('pl_'), nome: 'Teste Long Note', telas: 3, validadeEmMeses: 6, preco: 49.90, observacoes: 'Nota longa de teste que precisa ser truncada na listagem para evitar quebra de layout em telas pequenas. Este texto é propositalmente extenso para simular comentários, instruções e observações inseridas pelos usuários do sistema.' },
  ];

  // Clients with varied due dates
  const today = new Date();
  function addDays(d, days) { const n = new Date(d); n.setDate(n.getDate() + days); return n; }

  MockDB.clients = [
    { id: uid('cli_'), nome: 'João Silva', telefone: '79999-0001', email: 'joao@mail.com', dataVencimento: addDays(today, 2).toISOString(), notificado: false, planoId: MockDB.plans[0].id, telas: 2, preco: MockDB.plans[0].preco, pontosAcesso: [] },
    { id: uid('cli_'), nome: 'Maria Souza', telefone: '79999-0002', email: 'maria@mail.com', dataVencimento: addDays(today, -10).toISOString(), notificado: true, planoId: MockDB.plans[1].id, telas: 4, preco: MockDB.plans[1].preco, pontosAcesso: [] },
    { id: uid('cli_'), nome: 'Empresa XYZ', telefone: '0800-1234', email: 'contato@xyz.com', dataVencimento: addDays(today, -40).toISOString(), notificado: false, planoId: MockDB.plans[2].id, telas: 8, preco: MockDB.plans[2].preco, pontosAcesso: [] },
  ];

  // Users
  MockDB.users = [
    { id: uid('u_'), email: 'admin@pandda.com', password: 'master', role: 'master' },
    { id: uid('u_'), email: 'user@pandda.com', password: 'comum', role: 'comum' },
  ];
}

/* Mock API */
const MockAPI = {
  init() { seedMockData(); },

  login(email, password, role) {
    return new Promise((resolve, reject) => {
      const u = MockDB.users.find(x => x.email === email && x.password === password && x.role === role);
      setTimeout(() => {
        if (u) resolve({ user: { id: u.id, email: u.email, role: u.role } });
        else reject(new Error('Credenciais inválidas'));
      }, 300);
    });
  },

  getClients() { return new Promise(res => setTimeout(() => res(JSON.parse(JSON.stringify(MockDB.clients))), 200)); },
  createClient(client) { return new Promise(resolve => { client.id = uid('cli_'); MockDB.clients.push(client); setTimeout(() => resolve(client), 200); }); },
  updateClient(id, patch) { return new Promise(resolve => { const idx = MockDB.clients.findIndex(c => c.id === id); if (idx >= 0) { MockDB.clients[idx] = Object.assign({}, MockDB.clients[idx], patch); setTimeout(() => resolve(MockDB.clients[idx]), 200); } else setTimeout(() => resolve(null), 200); }); },
  deleteClient(id) { return new Promise(resolve => { MockDB.clients = MockDB.clients.filter(c => c.id !== id); setTimeout(() => resolve(true), 200); }); },

  getServers() { return new Promise(res => setTimeout(() => res(JSON.parse(JSON.stringify(MockDB.servers))), 200)); },
  createServer(s) { s.id = uid('srv_'); MockDB.servers.push(s); return Promise.resolve(s); },

  getApps() { return new Promise(res => setTimeout(() => res(JSON.parse(JSON.stringify(MockDB.apps))), 200)); },
  createApp(a) { a.id = uid('app_'); MockDB.apps.push(a); return Promise.resolve(a); },

  getPlans() { return new Promise(res => setTimeout(() => res(JSON.parse(JSON.stringify(MockDB.plans))), 200)); },
  createPlan(p) {
    if (p && p.id) {
      const idx = MockDB.plans.findIndex(x => x.id === p.id);
      if (idx >= 0) {
        MockDB.plans[idx] = Object.assign({}, MockDB.plans[idx], p);
        return Promise.resolve(MockDB.plans[idx]);
      }
    }
    p.id = uid('pl_');
    if (typeof p.observacoes === 'undefined') p.observacoes = '';
    MockDB.plans.push(p);
    return Promise.resolve(p);
  },
};

window.MockDB = MockDB;
window.MockAPI = MockAPI;
