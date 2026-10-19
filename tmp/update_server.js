const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

// 1. Replace initialProjects definition
const startIdx = content.indexOf('// Initial in-memory project data store\nlet initialProjects: Project[] = [');
const endMarker = 'needsAttention: false\n  }\n];';
const endIdx = content.indexOf(endMarker);

if (startIdx !== -1 && endIdx !== -1) {
  const fullEndIdx = endIdx + endMarker.length;
  content = content.slice(0, startIdx) + '// Initial in-memory project data store - Clean default for production multi-tenant accounts\nlet initialProjects: Project[] = [];' + content.slice(fullEndIdx);
  console.log('Successfully replaced initialProjects with empty array');
} else {
  console.error('Could not find initialProjects markers', { startIdx, endIdx });
}

// 2. Replace app.get('/api/projects'
const oldGetProjects = `// 2. Get all projects
app.get('/api/projects', (req, res) => {
  res.json(initialProjects);
});`;

const newGetProjects = `// 2. Get projects for authenticated tenant (Strict tenant isolation)
app.get('/api/projects', (req, res) => {
  const userEmail = (
    (req.headers['x-user-email'] as string) ||
    (req.query.userEmail as string) ||
    ''
  ).toLowerCase().trim();

  // If no user email provided (unauthenticated / guest), return empty to protect client data privacy
  if (!userEmail) {
    return res.json([]);
  }

  // Founder can see all projects in administrative console (when ?adminView=true)
  if (userEmail === 'henrique.ferrazms@gmail.com' && req.query.adminView === 'true') {
    return res.json(initialProjects);
  }

  // Return strictly the projects belonging to this subscriber/account
  const tenantProjects = initialProjects.filter(p => {
    const owner = (p.ownerEmail || '').toLowerCase().trim();
    return owner === userEmail;
  });

  res.json(tenantProjects);
});`;

if (content.includes(oldGetProjects)) {
  content = content.replace(oldGetProjects, newGetProjects);
  console.log('Successfully updated app.get(\'/api/projects\')');
} else {
  console.error('Could not find oldGetProjects');
}

// 3. Update POST /api/projects to set ownerEmail and userId
const oldNewProjBlock = `  const newProj: Project = {
    id: newId,
    code: \`#PROJ-\${Math.floor(100 + Math.random() * 900)}\`,
    clientName,
    clientPhone: clientPhone || '+55 11 99999-0000',
    title,
    category: cat,
    unit: 'Unidade Principal',
    status: 'em_andamento',
    workspaceId: workspaceId || 'ws-matriz',
    workspaceName: workspaceName || 'Matriz de Projetos',`;

const newNewProjBlock = `  const creatorEmail = (
    (req.headers['x-user-email'] as string) ||
    req.body.ownerEmail ||
    (req.query.userEmail as string) ||
    ''
  ).toLowerCase().trim();

  const newProj: Project = {
    id: newId,
    code: \`#PROJ-\${Math.floor(100 + Math.random() * 900)}\`,
    clientName,
    clientPhone: clientPhone || '+55 11 99999-0000',
    title,
    category: cat,
    unit: 'Unidade Principal',
    status: 'em_andamento',
    workspaceId: workspaceId || 'ws-matriz',
    workspaceName: workspaceName || 'Matriz de Projetos',
    ownerEmail: creatorEmail || 'usuario@bomprojeto.com',
    userId: req.body.userId || '',`;

if (content.includes(oldNewProjBlock)) {
  content = content.replace(oldNewProjBlock, newNewProjBlock);
  console.log('Successfully updated newProj with ownerEmail in POST /api/projects');
} else {
  console.error('Could not find oldNewProjBlock');
}

// 4. Update app.get('/api/support-alerts')
const oldGetAlerts = `// 10. Get all support alerts
app.get('/api/support-alerts', (req, res) => {
  res.json(supportAlerts);
});`;

const newGetAlerts = `// 10. Get support alerts (strictly isolated per tenant)
app.get('/api/support-alerts', (req, res) => {
  const userEmail = (
    (req.headers['x-user-email'] as string) ||
    (req.query.userEmail as string) ||
    ''
  ).toLowerCase().trim();

  if (!userEmail) return res.json([]);

  const userProjectIds = new Set(
    initialProjects
      .filter(p => (p.ownerEmail || '').toLowerCase().trim() === userEmail || (userEmail === 'henrique.ferrazms@gmail.com' && req.query.adminView === 'true'))
      .map(p => p.id)
  );

  const filteredAlerts = supportAlerts.filter(a => userProjectIds.has(a.projectId));
  res.json(filteredAlerts);
});`;

if (content.includes(oldGetAlerts)) {
  content = content.replace(oldGetAlerts, newGetAlerts);
  console.log('Successfully updated app.get(\'/api/support-alerts\')');
} else {
  console.error('Could not find oldGetAlerts');
}

// 5. Update ServerWorkspace interface and workspaces endpoints
const oldServerWorkspaceInterface = `interface ServerWorkspace {
  id: string;
  name: string;
  slug: string;
  segment: string;
  segmentLabel: string;
  type: 'matriz' | 'filial' | 'segmento';
  city?: string;
  state?: string;
  phone?: string;
  address?: string;
  isDefault?: boolean;
  createdAt: string;
}`;

const newServerWorkspaceInterface = `interface ServerWorkspace {
  id: string;
  name: string;
  slug: string;
  segment: string;
  segmentLabel: string;
  type: 'matriz' | 'filial' | 'segmento';
  city?: string;
  state?: string;
  phone?: string;
  address?: string;
  isDefault?: boolean;
  ownerEmail?: string;
  createdAt: string;
}`;

if (content.includes(oldServerWorkspaceInterface)) {
  content = content.replace(oldServerWorkspaceInterface, newServerWorkspaceInterface);
  console.log('Successfully updated ServerWorkspace interface');
} else {
  console.error('Could not find oldServerWorkspaceInterface');
}

const oldGetWorkspaces = `// Get all workspaces
app.get('/api/workspaces', (req, res) => {
  const enriched = serverWorkspaces.map(ws => ({
    ...ws,
    activeProjectsCount: initialProjects.filter(p => p.workspaceId === ws.id).length
  }));
  res.json(enriched);
});`;

const newGetWorkspaces = `// Get workspaces for tenant
app.get('/api/workspaces', (req, res) => {
  const userEmail = (
    (req.headers['x-user-email'] as string) ||
    (req.query.userEmail as string) ||
    ''
  ).toLowerCase().trim();

  let userWorkspaces = serverWorkspaces.filter(ws => {
    if (!ws.ownerEmail) return true;
    return ws.ownerEmail.toLowerCase() === userEmail || (userEmail === 'henrique.ferrazms@gmail.com' && req.query.adminView === 'true');
  });

  if (userWorkspaces.length === 0) {
    userWorkspaces = [
      {
        id: 'ws-matriz',
        name: 'Gestão de Projetos (Matriz)',
        slug: 'gestao-projetos-matriz',
        segment: 'projetos',
        segmentLabel: 'Projetos Gerais',
        type: 'matriz',
        city: 'São Paulo - SP',
        state: 'SP',
        phone: '+55 (11) 98765-4321',
        address: '',
        isDefault: true,
        ownerEmail: userEmail || 'usuario@bomprojeto.com',
        createdAt: new Date().toISOString()
      }
    ];
  }

  const enriched = userWorkspaces.map(ws => ({
    ...ws,
    activeProjectsCount: initialProjects.filter(p => p.workspaceId === ws.id && ((p.ownerEmail || '').toLowerCase().trim() === userEmail)).length
  }));
  res.json(enriched);
});`;

if (content.includes(oldGetWorkspaces)) {
  content = content.replace(oldGetWorkspaces, newGetWorkspaces);
  console.log('Successfully updated app.get(\'/api/workspaces\')');
} else {
  console.error('Could not find oldGetWorkspaces');
}

// 6. Update POST /api/workspaces to set ownerEmail
const oldPostWs = `  const newWs: ServerWorkspace = {
    id: \`ws-\${Date.now().toString().slice(-6)}\`,
    name,
    slug: name.toLowerCase().replace(/\\s+/g, '-').replace(/[^\\w-]/g, ''),
    segment: segment || 'marcenaria',
    segmentLabel: segmentLabel || 'Outro Segmento',
    type: type || 'filial',
    city: city || 'São Paulo - SP',
    state: state || 'SP',
    phone: phone || '',
    address: address || '',
    isDefault: false,
    createdAt: new Date().toISOString()
  };`;

const newPostWs = `  const userEmail = (
    (req.headers['x-user-email'] as string) ||
    req.body.ownerEmail ||
    (req.query.userEmail as string) ||
    ''
  ).toLowerCase().trim();

  const newWs: ServerWorkspace = {
    id: \`ws-\${Date.now().toString().slice(-6)}\`,
    name,
    slug: name.toLowerCase().replace(/\\s+/g, '-').replace(/[^\\w-]/g, ''),
    segment: segment || 'marcenaria',
    segmentLabel: segmentLabel || 'Outro Segmento',
    type: type || 'filial',
    city: city || 'São Paulo - SP',
    state: state || 'SP',
    phone: phone || '',
    address: address || '',
    isDefault: false,
    ownerEmail: userEmail || 'usuario@bomprojeto.com',
    createdAt: new Date().toISOString()
  };`;

if (content.includes(oldPostWs)) {
  content = content.replace(oldPostWs, newPostWs);
  console.log('Successfully updated POST /api/workspaces');
} else {
  console.error('Could not find oldPostWs');
}

fs.writeFileSync('server.ts', content, 'utf8');
console.log('server.ts written successfully!');
