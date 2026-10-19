/**
 * Utilitário de rastreamento para Google Tag Manager e Google Ads
 * Suporta tanto disparos no dataLayer quanto parâmetros de URL
 */

declare global {
  interface Window {
    dataLayer?: any[];
  }
}

/**
 * Registra um evento de LEAD no dataLayer e atualiza o parâmetro na URL
 * Parâmetro de URL: ?conversao=lead
 * Evento no GTM / Google Ads: generate_lead
 */
export function trackLeadConversion(source: string = 'cadastro', email?: string) {
  if (typeof window === 'undefined') return;

  // 1. Envia evento padronizado para o dataLayer do GTM
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'generate_lead',
    lead_source: source,
    lead_type: 'novo_lead',
    user_email: email || undefined,
    timestamp: new Date().toISOString()
  });

  // 2. Atualiza a URL para conter ?conversao=lead (caso a conversão do Google Ads seja por URL)
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('conversao', 'lead');
    url.searchParams.set('origem_lead', source);
    window.history.replaceState({}, '', url.toString());
  } catch (e) {
    console.debug('Falha ao atualizar URL de conversão:', e);
  }
}

/**
 * Registra um evento de VENDA / COMPRA no dataLayer e atualiza o parâmetro na URL
 * Parâmetro de URL: ?conversao=venda
 * Evento no GTM / Google Ads: purchase
 */
export function trackPurchaseConversion({
  transactionId,
  value,
  planName,
  billingCycle,
  currency = 'BRL'
}: {
  transactionId: string;
  value: number;
  planName: string;
  billingCycle?: string;
  currency?: string;
}) {
  if (typeof window === 'undefined') return;

  // 1. Envia evento padronizado de e-commerce / purchase para o GTM
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'purchase',
    ecommerce: {
      transaction_id: transactionId,
      value: Number(value.toFixed(2)),
      currency: currency,
      items: [
        {
          item_id: planName.toLowerCase().replace(/\s+/g, '_'),
          item_name: `BOMProjeto - Plano ${planName}`,
          price: Number(value.toFixed(2)),
          quantity: 1,
          item_category: 'Assinatura',
          item_variant: billingCycle || 'mensal'
        }
      ]
    },
    transaction_id: transactionId,
    value: Number(value.toFixed(2)),
    currency: currency,
    plan_name: planName,
    billing_cycle: billingCycle,
    timestamp: new Date().toISOString()
  });

  // 2. Atualiza a URL para conter ?conversao=venda (caso a conversão do Google Ads seja por URL)
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('conversao', 'venda');
    url.searchParams.set('plano', planName.toLowerCase());
    url.searchParams.set('valor', value.toFixed(2));
    url.searchParams.set('transacao', transactionId);
    window.history.replaceState({}, '', url.toString());
  } catch (e) {
    console.debug('Falha ao atualizar URL de conversão:', e);
  }
}

/**
 * Registra clique de contato ou WhatsApp como Lead
 */
export function trackWhatsAppLead(action: string = 'clique_whatsapp') {
  if (typeof window === 'undefined') return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'generate_lead',
    lead_source: 'whatsapp',
    lead_action: action,
    timestamp: new Date().toISOString()
  });

  try {
    const url = new URL(window.location.href);
    url.searchParams.set('conversao', 'lead_whatsapp');
    window.history.replaceState({}, '', url.toString());
  } catch (e) {
    console.debug('Falha ao atualizar URL de conversão:', e);
  }
}
