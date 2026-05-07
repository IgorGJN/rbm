(function (global) {
  'use strict';

  const STORE_KEY = 'rbm_informativos_modelos_v2';
  const AUTOSAVE_KEY = 'rbm_informativos_autosave_v2';

  function readStore() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      console.warn('Falha ao ler modelos locais:', err);
      return [];
    }
  }

  function writeStore(items) {
    localStorage.setItem(STORE_KEY, JSON.stringify(items));
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function save(name, doc) {
    const cleanName = String(name || '').trim() || `Modelo ${new Date().toLocaleString('pt-BR')}`;
    const items = readStore();
    const id = `saved_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const item = {
      id,
      name: cleanName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      doc: clone(doc)
    };
    items.unshift(item);
    writeStore(items);
    return item;
  }

  function update(id, doc) {
    const items = readStore();
    const index = items.findIndex((item) => item.id === id);
    if (index < 0) return null;
    items[index].doc = clone(doc);
    items[index].updatedAt = new Date().toISOString();
    writeStore(items);
    return items[index];
  }

  function list() {
    return readStore();
  }

  function get(id) {
    return readStore().find((item) => item.id === id) || null;
  }

  function remove(id) {
    const items = readStore().filter((item) => item.id !== id);
    writeStore(items);
  }

  function autosave(doc) {
    try {
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ updatedAt: new Date().toISOString(), doc: clone(doc) }));
    } catch (err) {
      console.warn('Falha no autosave:', err);
    }
  }

  function loadAutosave() {
    try {
      const raw = localStorage.getItem(AUTOSAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.warn('Falha ao carregar autosave:', err);
      return null;
    }
  }

  function downloadFile(filename, content, mime) {
    const blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function safeFilename(name, ext) {
    const base = String(name || 'informativo-rbm')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'informativo-rbm';
    return `${base}.${ext}`;
  }

  global.RBM_STORAGE = {
    save,
    update,
    list,
    get,
    remove,
    autosave,
    loadAutosave,
    downloadFile,
    safeFilename
  };
})(window);
