const LEADS_KEY = 'es_leads';

export function getLeads() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(LEADS_KEY) ?? '[]');
  } catch { return []; }
}

// Upserts a lead by id (platform_userId). Preserves original addedAt on update.
export function upsertLead(lead) {
  const leads = getLeads();
  const idx = leads.findIndex((l) => l.id === lead.id);
  if (idx >= 0) {
    leads[idx] = { ...leads[idx], ...lead, addedAt: leads[idx].addedAt };
  } else {
    leads.unshift(lead);
  }
  localStorage.setItem(LEADS_KEY, JSON.stringify(leads));
}

export function removeLead(id) {
  const leads = getLeads().filter((l) => l.id !== id);
  localStorage.setItem(LEADS_KEY, JSON.stringify(leads));
}

export function clearLeads() {
  localStorage.removeItem(LEADS_KEY);
}
