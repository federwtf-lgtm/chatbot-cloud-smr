/* =========================================================
   Chatbot Cloud SMR — funciones.js
   Autor: Isaac (DASP)
   Descripción: Lógica global y del chat con integración RapidAPI
   ========================================================= */

/* -----------------------------
   Configuración y utilidades
----------------------------- */

// Claves de almacenamiento
const STORAGE_KEYS = {
  history: 'chat_history_v1',
  settings: 'chat_settings_v1',
  theme: 'theme_pref_v1',
};

// Toast simple y elegante
function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  Object.assign(el.style, {
    position: 'fixed', bottom: '20px', right: '20px',
    padding: '10px 14px', background: '#141416', color: '#e7e7ea',
    border: '1px solid #2a2a2d', borderRadius: '10px',
    boxShadow: '0 6px 20px rgba(0,0,0,0.35)', zIndex: 9999
  });
  el.style.borderLeft = type === 'error' ? '4px solid #ff4d4f' :
                        type === 'success' ? '4px solid #2ea44f' : '4px solid #d92027';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

// Estado de conexión online/offline
function updateConnBadge() {
  const badge = document.getElementById('conn-status');
  if (!badge) return;
  const online = navigator.onLine;
  badge.textContent = online ? 'Online' : 'Offline';
  badge.classList.toggle('online', online);
  badge.classList.toggle('offline', !online);
}

// Tema claro/oscuro/retro (modificado: por defecto 'retro')
function initThemeToggle() {
  const toggle = document.getElementById('theme-toggle');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const stored = localStorage.getItem(STORAGE_KEYS.theme);
  // valores: 'dark', 'light', 'retro'
  // Por defecto 'retro' si no hay preferencia guardada
  let theme = stored || 'retro';

  function applyTheme() {
    document.documentElement.dataset.theme = theme === 'retro' ? 'retro' : (theme === 'light' ? 'light' : 'dark');
    if (toggle) {
      toggle.setAttribute('aria-pressed', String(theme === 'dark'));
      const strongEl = toggle.querySelector('strong');
      if (strongEl) {
        strongEl.textContent = theme === 'dark' ? 'Oscuro' : (theme === 'light' ? 'Claro' : 'Retro');
      }
    }
  }
  applyTheme();

  if (toggle) {
    toggle.addEventListener('click', () => {
      // ciclar: dark -> light -> retro -> dark
      theme = theme === 'dark' ? 'light' : theme === 'light' ? 'retro' : 'dark';
      localStorage.setItem(STORAGE_KEYS.theme, theme);
      applyTheme();
    });
  }

  // Añadimos CSS dinámico (ligero) para tema claro/retro (si no existe)
  const styleExtra = document.createElement('style');
  styleExtra.textContent = `
    :root[data-theme="light"] {
      --bg: #f6f7f9; --bg-2: #ffffff; --text: #1b1b1c; --muted: #55585e;
      --border: #dde0e6; --shadow: rgba(0,0,0,0.12);
    }
    :root[data-theme="light"] .navbar { background: rgba(255,255,255,0.85); }
    /* Retro / Stranger-ish theme */
    :root[data-theme="retro"] {
      --bg: #070306;
      --bg-2: #0f0202;
      --surface: #0b0202;
      --text: #ffd6d6;
      --muted: #f5bdbd;
      --heading: #fff1f1;
      --accent: #ff2c2c;
      --accent-2: #7b0000;
      --accent-3: #ff6b6b;
      --border: #2a0606;
      --shadow: rgba(255,44,44,0.06);
    }
    :root[data-theme="retro"] .hero { background: radial-gradient(circle at 20% 10%, rgba(255,44,44,0.12), transparent 40%), linear-gradient(180deg,var(--bg),var(--bg-2)); }
    :root[data-theme="retro"] h1, :root[data-theme="retro"] h2, :root[data-theme="retro"] h3 { text-shadow: 0 2px 16px rgba(255,44,44,0.18); color: var(--heading); font-family: 'Press Start 2P', monospace; }
  `;
  document.head.appendChild(styleExtra);

  // carga de fuente retro si se desea (opcional)
  const fontLink = document.createElement('link');
  fontLink.rel = 'stylesheet';
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap';
  document.head.appendChild(fontLink);
}

// Storage: historial y ajustes
function getHistory() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.history) || '[]'); }
  catch { return []; }
}
function setHistory(list) {
  localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(list));
}
function saveToHistory(msg) {
  const hist = getHistory(); hist.push(msg);
  setHistory(hist);
}
function clearHistory() {
  localStorage.removeItem(STORAGE_KEYS.history);
}
function getSettings() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) || '{}'); }
  catch { return {}; }
}
function saveSettings(obj) {
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(obj));
}

/* -----------------------------
   Inicialización global
----------------------------- */

document.addEventListener('DOMContentLoaded', () => {
  updateConnBadge();
  window.addEventListener('online', updateConnBadge);
  window.addEventListener('offline', updateConnBadge);

  initThemeToggle();

  initExtrasPage();      // Ajustes y FAQs
  initChatPage();        // Lógica del chat
  initInicioEnhancers(); // Mejoras de inicio (reveal ya está en HTML; aquí solo fallback)
});

/* -----------------------------
   Inicio — mejoras (fallback)
----------------------------- */

function initInicioEnhancers() {
  // Activación de secciones reveal si existen y el navegador no soporta IntersectionObserver
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
  }
}

/* -----------------------------
   Extras — FAQs y Ajustes API
----------------------------- */

function initExtrasPage() {
  // Cargar ajustes guardados
  const apiKeyInput = document.getElementById('api-key');
  const apiHostInput = document.getElementById('api-host');
  const apiUrlInput = document.getElementById('api-url');
  const saveBtn = document.getElementById('save-settings');
  const resetBtn = document.getElementById('reset-settings');
  const testBtn = document.getElementById('test-api');

  if (apiKeyInput || apiHostInput || apiUrlInput) {
    const s = getSettings();
    if (apiKeyInput) apiKeyInput.value = s.apiKey || '';
    if (apiHostInput) apiHostInput.value = s.apiHost || '';
    if (apiUrlInput) apiUrlInput.value = s.apiUrl || '';
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      saveSettings({
        apiKey: apiKeyInput?.value.trim() || '',
        apiHost: apiHostInput?.value.trim() || '',
        apiUrl: apiUrlInput?.value.trim() || '',
      });
      toast('Ajustes guardados.', 'success');
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      saveSettings({ apiKey: '', apiHost: '', apiUrl: '' });
      if (apiKeyInput) apiKeyInput.value = '';
      if (apiHostInput) apiHostInput.value = '';
      if (apiUrlInput) apiUrlInput.value = '';
      toast('Ajustes reiniciados.', 'info');
    });
  }

  if (testBtn) {
    testBtn.addEventListener('click', async () => {
      const apiUrl = apiUrlInput?.value.trim();
      const apiHost = apiHostInput?.value.trim();
      const apiKey = apiKeyInput?.value.trim();
      if (!apiUrl || !apiHost || !apiKey) {
        toast('Completa URL, Host y API Key antes de probar.', 'error');
        return;
      }
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'X-RapidAPI-Key': apiKey,
            'X-RapidAPI-Host': apiHost,
          },
          body: JSON.stringify({ prompt: 'test' }),
          signal: controller.signal,
        });
        clearTimeout(t);
        if (res.ok) {
          toast('Conexión exitosa con la API.', 'success');
        } else {
          toast(`Error en la conexión: HTTP ${res.status}`, 'error');
        }
      } catch (err) {
        toast(`No se pudo conectar: ${err.message}`, 'error');
      }
    });
  }

  // FAQs: enviar preset al chat (sesión)
  const faqButtons = document.querySelectorAll('[data-preset]');
  faqButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      sessionStorage.setItem('preset_msg', btn.dataset.preset);
      window.location.href = 'complemento.html';
    });
  });
}

/* -----------------------------
   Chat — lógica principal
----------------------------- */

function initChatPage() {
  const chatContainer = document.getElementById('chat-container');
  const typingEl = document.getElementById('typing');
  const composer = document.getElementById('composer');
  const input = document.getElementById('user-input');
  const clearBtn = document.getElementById('clear-chat');
  const exportTxtBtn = document.getElementById('export-chat');
  const exportJsonBtn = document.getElementById('export-json');
  const exportPdfBtn = document.getElementById('export-pdf');
  const msgCountEl = document.getElementById('msg-count');

  // Sidebar toggle en móvil
  const sidebar = document.querySelector('.sidebar');
  const sidebarToggle = document.querySelector('.sidebar-toggle');
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
  }

  // Botón volver arriba si existe
  const scrollTopBtn = document.getElementById('scroll-top');
  if (scrollTopBtn) {
    window.addEventListener('scroll', () => {
      scrollTopBtn.style.display = window.scrollY > 300 ? 'block' : 'none';
    });
    scrollTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  // Si no estamos en la página de chat, salir
  if (!chatContainer || !composer || !input) return;

  // Render historial y bienvenida
  const hist = getHistory();
  if (hist.length === 0) {
    appendMessage(chatContainer, 'bot', '¡Hola! Soy Marlos — tu asistente de soporte técnico. Pregúntame lo que quieras sobre informática básica.');
    incrementMsgCount(msgCountEl);
  } else {
    hist.forEach(m => appendMessage(chatContainer, m.role, m.text, false, m.meta));
    autoScroll(chatContainer);
    if (msgCountEl) msgCountEl.textContent = String(hist.length);
  }

  // Si venimos con un preset desde extras
  const preset = sessionStorage.getItem('preset_msg');
  if (preset) {
    input.value = preset;
    sessionStorage.removeItem('preset_msg');
    handleSend(chatContainer, typingEl, input, msgCountEl);
  }

  // Envío por formulario
  composer.addEventListener('submit', (e) => {
    e.preventDefault();
    handleSend(chatContainer, typingEl, input, msgCountEl);
  });

  // Preguntas rápidas dentro de chat
  const presetButtons = document.querySelectorAll('[data-preset]');
  presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      input.value = btn.dataset.preset;
      handleSend(chatContainer, typingEl, input, msgCountEl);
    });
  });

  // Gestión de historial y exportaciones
  if (clearBtn) clearBtn.addEventListener('click', () => {
    clearHistory();
    chatContainer.innerHTML = '';
    appendMessage(chatContainer, 'bot', 'He reiniciado la conversación. ¿Qué te gustaría consultar?');
    if (msgCountEl) msgCountEl.textContent = '1';
    toast('Chat reiniciado.', 'info');
  });

  if (exportTxtBtn) exportTxtBtn.addEventListener('click', exportTxt);
  if (exportJsonBtn) exportJsonBtn.addEventListener('click', exportJson);
  if (exportPdfBtn) exportPdfBtn.addEventListener('click', exportPdf);

  // Atajos de teclado
  document.addEventListener('keydown', (e) => {
    // Enter envía (si no hay shift)
    if (e.key === 'Enter' && !e.shiftKey && document.activeElement === input) {
      e.preventDefault();
      handleSend(chatContainer, typingEl, input, msgCountEl);
    }
    // Ctrl+L limpiar
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      clearBtn?.click();
    }
    // Ctrl+E exportar TXT
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
      e.preventDefault();
      exportTxtBtn?.click();
    }
  });
}

// Append message: incluir nombre "Marlos" al render del bot y pequeño ajuste de formato
function appendMessage(container, role, text, autoScrollOn = true, meta = {}) {
  const row = document.createElement('div');
  row.className = `message ${role}`;

  const avatar = document.createElement('div');
  avatar.className = `avatar ${role}`;
  avatar.textContent = role === 'user' ? 'Tú' : 'M'; // avatar representativo

  const bubble = document.createElement('div');
  bubble.className = 'bubble';

  // Timestamp opcional
  const ts = meta.timestamp || new Date().toLocaleTimeString();

  // Si es el bot, mostrar nombre "Marlos" arriba
  const author = role === 'bot' ? `<strong style="display:block;margin-bottom:6px;color:var(--heading);">Marlos</strong>` : '';

  bubble.innerHTML = `${author}<div>${escapeHtml(text)}</div><small style="color:#b4b4b9;display:block;margin-top:6px;">${ts}</small>`;

  row.appendChild(avatar);
  row.appendChild(bubble);
  container.appendChild(row);

  if (autoScrollOn) autoScroll(container);
}

// Escape de HTML para seguridad básica
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// Auto-scroll
function autoScroll(container) {
  container.scrollTop = container.scrollHeight;
}

// Mostrar/ocultar indicador de escritura
function showTyping(typingEl, show) {
  if (!typingEl) return;
  typingEl.classList.toggle('hidden', !show);
}

// Incrementar contador de mensajes
function incrementMsgCount(el) {
  if (!el) return;
  const n = parseInt(el.textContent || '0', 10) + 1;
  el.textContent = String(n);
}

// Manejo de envío
function handleSend(container, typingEl, input, msgCountEl) {
  const text = input.value.trim();
  if (!text) return;

  appendMessage(container, 'user', text);
  saveToHistory({ role: 'user', text, meta: { timestamp: new Date().toISOString() } });
  incrementMsgCount(msgCountEl);
  input.value = '';

  showTyping(typingEl, true);

  getBotResponse(text)
    .then(reply => {
      appendMessage(container, 'bot', reply);
      saveToHistory({ role: 'bot', text: reply, meta: { timestamp: new Date().toISOString() } });
      incrementMsgCount(msgCountEl);
    })
    .catch(err => {
      console.error(err);
      const fallback = 'Lo siento, hubo un problema al conectar con el servicio. Prueba de nuevo o utiliza una pregunta rápida.';
      appendMessage(container, 'bot', fallback);
      saveToHistory({ role: 'bot', text: fallback, meta: { timestamp: new Date().toISOString() } });
      incrementMsgCount(msgCountEl);
      toast(`Error de API: ${err.message}`, 'error');
    })
    .finally(() => {
      showTyping(typingEl, false);
      autoScroll(container);
    });
}

/* -----------------------------
   Integración RapidAPI + fallback local
----------------------------- */

// Payload builder (se mantiene genérico)
function buildPayload(message, settings) {
  return {
    prompt: message,
    msg: message,
    input: message,
    temperature: settings.temperature ?? 0.2,
    max_tokens: settings.max_tokens ?? 512
  };
}

// Robust extract (ya incluida) - mantenemos
function extractReply(data) {
  // Manejo robusto de las estructuras más comunes de respuesta
  try {
    if (!data) return '';

    // OpenAI-like: { choices: [{ message: { content: "..." } }] }
    if (Array.isArray(data.choices) && data.choices[0]) {
      const c = data.choices[0];
      if (c.message && (c.message.content || c.message.content === '')) return String(c.message.content).trim();
      if (c.text) return String(c.text).trim();
    }

    // Otros formatos: { reply: "..."} / { response: "..."} / { answer: "..." }
    if (typeof data.reply === 'string') return data.reply.trim();
    if (typeof data.response === 'string') return data.response.trim();
    if (typeof data.answer === 'string') return data.answer.trim();
    if (typeof data.output === 'string') return data.output.trim();
    if (typeof data.text === 'string') return data.text.trim();

    // Algunas APIs devuelven arrays: [{ text: "..." }] o { data: [{ text: "..."}] }
    if (Array.isArray(data) && data[0] && typeof data[0].text === 'string') return data[0].text.trim();
    if (data.data && Array.isArray(data.data) && data.data[0] && typeof data.data[0].text === 'string') return data.data[0].text.trim();

    // Fallback: si viene un objeto con keys y alguna value es string larga, usarla
    for (const k of Object.keys(data)) {
      if (typeof data[k] === 'string' && data[k].length > 0) return data[k].trim();
    }
  } catch (err) {
    console.warn('extractReply error', err);
  }
  return '';
}

// Knowledge base local (fallback) - respuestas para Preguntas rápidas y FAQs
const LOCAL_KB = [
  {
    keys: ['dirección ip', 'qué es una dirección ip', 'qué es ip', 'ip'],
    reply: 'Una dirección IP es un identificador único que identifica un dispositivo en una red. Hay IPv4 (ej. 192.168.1.1) e IPv6 (ej. 2001:0db8::).'
  },
  {
    keys: ['dns', 'qué significa dns', 'configurar dns'],
    reply: 'DNS (Domain Name System) traduce nombres de dominio legibles (ej. ejemplo.com) a direcciones IP. En Windows puedes cambiarlo en Propiedades del adaptador → IPv4 → Propiedades → Usar las siguientes direcciones DNS.'
  },
  {
    keys: ['ram', 'cuánta ram', 'cuanta ram', 'cómo saber cuánta ram'],
    reply: 'En Windows abre Configuración → Sistema → Acerca de o usa el Administrador de tareas en la pestaña Rendimiento para ver la memoria instalada y uso.'
  },
  {
    keys: ['hdd vs ssd', 'hdd', 'ssd', 'diferencia hdd ssd'],
    reply: 'SSD es significativamente más rápido que un HDD porque almacena datos en memoria flash. HDD usa platos mecánicos y es más barato por GB.'
  },
  {
    keys: ['temporales', 'archivos temporales', 'limpiar temporales', 'cómo limpiar archivos temporales'],
    reply: 'En Windows usa %temp% y borra contenido, o Herramienta Liberador de espacio en disco; también Configuración → Sistema → Almacenamiento → Archivos temporales.'
  },
  {
    keys: ['configurar dns en windows 10'],
    reply: 'Para configurar DNS en Windows 10: Panel de control → Centro de redes y recursos compartidos → Cambiar configuración del adaptador → clic derecho en tu adaptador → Propiedades → IPv4 → Propiedades → Usar las siguientes direcciones DNS.'
  },
  {
    keys: ['ipv4 vs ipv6', 'ipv4 ipv6'],
    reply: 'IPv4 usa direcciones de 32 bits (ej. 192.168.0.1). IPv6 usa 128 bits y permite muchas más direcciones; IPv6 es el futuro ante el agotamiento de IPv4.'
  },
  {
    keys: ['velocidad de disco', 'comprobar velocidad de mi disco'],
    reply: 'Puedes usar herramientas como CrystalDiskMark para medir velocidad de lectura/escritura del disco. Windows no incluye un benchmark nativo detallado.'
  },
  {
    keys: ['drivers', 'qué es un driver', 'actualizar drivers'],
    reply: 'Un driver es software que permite al sistema operativo comunicarse con hardware. Actualízalos desde la web del fabricante o mediante el Administrador de dispositivos.'
  },
  {
    keys: ['procesos y ram', 'procesos que consumen memoria'],
    reply: 'En Administrador de tareas (Ctrl+Shift+Esc) ves procesos ordenados por uso de memoria/CPU. Allí puedes finalizar procesos problemáticos con precaución.'
  }
];

// Helper: normalizar texto (quitar acentos, signos y pasar a minúsculas)
function normalizeText(s) {
  return String(s || '')
    .normalize('NFD')                     // separar diacríticos
    .replace(/[\u0300-\u036f]/g, '')      // quitar diacríticos
    .replace(/[^\w\s]/g, ' ')             // quitar puntuación (mantener espacios)
    .replace(/\s+/g, ' ')                 // colapsar espacios
    .trim()
    .toLowerCase();
}

// Petición con abort por timeout, primero intenta KB local, luego API si está configurada
async function getBotResponse(message) {
  const s = getSettings();

  // normalizar mensaje
  const lc = normalizeText(message);

  // check local KB (simple matching sobre texto normalizado)
  for (const item of LOCAL_KB) {
    for (const k of item.keys) {
      if (lc.includes(normalizeText(k))) {
        // simular escritura breve
        await new Promise(r => setTimeout(r, 650));
        return item.reply;
      }
    }
  }

  // Si no hay configuración de API, responder con mensaje orientativo
  const apiUrl = s.apiUrl || '';
  const apiHost = s.apiHost || '';
  const apiKey  = s.apiKey || '';

  if (!apiUrl || !apiHost || !apiKey) {
    return 'Estoy funcionando en modo local (Marlos). Para respuestas extendidas configura tu API en Extras → Ajustes de API.';
  }

  const controller = new AbortController();
  const timeoutMs = 15000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const options = {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': apiHost,
    },
    body: JSON.stringify(buildPayload(message, s)),
    signal: controller.signal,
  };

  let res;
  try {
    res = await fetch(apiUrl, options);
  } catch (err) {
    clearTimeout(timeout);
    throw new Error(err.name === 'AbortError' ? 'timeout' : err.message);
  }
  clearTimeout(timeout);

  if (!res.ok) {
    let errText = `HTTP ${res.status}`;
    try {
      const errJson = await res.json();
      if (errJson?.error) errText += `: ${JSON.stringify(errJson.error)}`;
    } catch (_) {}
    throw new Error(errText);
  }

  let data;
  try {
    data = await res.json();
  } catch (e) {
    const txt = await res.text();
    if (txt) return txt;
    throw new Error('Respuesta sin formato JSON ni texto.');
  }

  const reply = extractReply(data);
  if (!reply) return 'La API respondió sin texto interpretable. Revisa la configuración de mapeo o el endpoint.';
  return reply;
}

/* -----------------------------
   Exportaciones
----------------------------- */

function exportTxt() {
  const hist = getHistory();
  if (!hist.length) { toast('No hay mensajes para exportar.', 'info'); return; }
  const lines = hist.map(h => `${h.meta?.timestamp || ''} ${h.role.toUpperCase()}: ${h.text}`);
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  downloadBlob(blob, 'chat_smr.txt');
  toast('Conversación exportada como TXT.', 'success');
}

function exportJson() {
  const hist = getHistory();
  if (!hist.length) { toast('No hay mensajes para exportar.', 'info'); return; }
  const blob = new Blob([JSON.stringify(hist, null, 2)], { type: 'application/json' });
  downloadBlob(blob, 'chat_smr.json');
  toast('Conversación exportada como JSON.', 'success');
}

function exportPdf() {
  const hist = getHistory();
  if (!hist.length) { toast('No hay mensajes para exportar.', 'info'); return; }
  // PDF simulado vía ventana imprimible con estilo básico
  const w = window.open('', '_blank', 'width=800,height=900');
  const style = `
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; }
      h1 { font-size: 20px; }
      .msg { margin-bottom: 10px; }
      .role { font-weight: bold; }
      .ts { color: #666; font-size: 12px; }
      hr { margin: 14px 0; }
    </style>`;
  const html = `
    <h1>Chatbot Cloud SMR — Transcript</h1>
    <hr>
    ${hist.map(h => `
      <div class="msg">
        <span class="role">${h.role.toUpperCase()}</span>:
        <span>${escapeHtml(h.text)}</span>
        <div class="ts">${h.meta?.timestamp || ''}</div>
      </div>
    `).join('')}
  `;
  w.document.write(style + html);
  w.document.close();
  w.focus();
  w.print();
  toast('Vista de impresión abierta. Usa “Guardar como PDF”.', 'success');
}

// Helper de descarga
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
