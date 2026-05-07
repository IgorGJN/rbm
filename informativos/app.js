(function (global) {
  'use strict';

  const required = ['RBM_BLOCKS', 'RBM_TEMPLATES', 'RBM_STORAGE', 'RBM_RENDERER'];
  const missing = required.filter((name) => !global[name]);
  if (missing.length) {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.innerHTML = `<main style="font-family:Arial,Helvetica,sans-serif;max-width:760px;margin:40px auto;padding:24px;border:1px solid #D8E0E8;border-radius:16px">
        <h1 style="color:#0B1F33">Erro de carregamento</h1>
        <p>Arquivos ausentes ou fora de ordem: <strong>${missing.join(', ')}</strong>.</p>
        <p>A ordem correta é: <code>blocks.js</code>, <code>templates.js</code>, <code>storage.js</code>, <code>renderer.js</code>, <code>app.js</code>.</p>
      </main>`;
    });
    return;
  }

  const Blocks = global.RBM_BLOCKS;
  const Templates = global.RBM_TEMPLATES;
  const Storage = global.RBM_STORAGE;
  const Renderer = global.RBM_RENDERER;

  const els = {};
  const state = {
    doc: null,
    selectedPageId: null,
    selectedBlockId: null,
    zoom: 1,
    autosaveTimer: null,
    lastBackground: '#FFFFFF'
  };

  function clone(value) {
    return Blocks.clone ? Blocks.clone(value) : JSON.parse(JSON.stringify(value));
  }

  function clampNumber(value, min, max, fallback) {
    const raw = Number(value);
    const safe = Number.isFinite(raw) ? raw : fallback;
    return Math.max(min, Math.min(max, safe));
  }

  function defaultDoc() {
    const tpl = Templates.create('provisoes_ferias_13');
    if (tpl) return normalizeDoc(tpl);
    return normalizeDoc({
      meta: {
        title: 'Informativo RBM',
        subtitle: 'Material informativo para clientes.',
        layout: 'boxed',
        accent: '#C8A24A',
        background: '#FFFFFF',
        logo: 'https://rbmgroupassessoria.com.br/wp-content/uploads/2025/05/Logo-RBM.webp',
        footer: 'RBM Contabilidade | Informativo',
        showHeader: true,
        showFooter: true
      },
      pages: [Blocks.page({ title: 'Página 1', blocks: [Blocks.make('title'), Blocks.make('paragraph')] })]
    });
  }

  function normalizeDoc(doc) {
    const base = doc || {};
    base.meta = Object.assign({
      title: 'Informativo RBM',
      subtitle: 'Material informativo para clientes.',
      layout: 'boxed',
      accent: '#C8A24A',
      background: '#FFFFFF',
      logo: 'https://rbmgroupassessoria.com.br/wp-content/uploads/2025/05/Logo-RBM.webp',
      footer: 'RBM Contabilidade | Informativo',
      showHeader: true,
      showFooter: true
    }, base.meta || {});
    if (!Array.isArray(base.pages) || !base.pages.length) {
      base.pages = [Blocks.page({ title: 'Página 1', blocks: [] })];
    }
    base.pages.forEach((page, pageIndex) => {
      page.id = page.id || Blocks.uid('page');
      page.title = page.title || `Página ${pageIndex + 1}`;
      page.backgroundColor = page.backgroundColor || base.meta.background || '#FFFFFF';
      page.backgroundMode = page.backgroundMode === 'solid' ? 'solid' : 'gradient';
      page.backgroundImage = page.backgroundImage || '';
      page.backgroundOpacity = clampNumber(page.backgroundOpacity, 0, 100, 100);
      page.blocks = Array.isArray(page.blocks) ? page.blocks : [];
      page.blocks.forEach((block) => {
        block.id = block.id || Blocks.uid('block');
        block.type = block.type || 'paragraph';
        block.data = Object.assign({}, Blocks.registry[block.type]?.defaultData?.() || {}, block.data || {});
      });
    });
    return base;
  }

  function currentPage() {
    return state.doc.pages.find((page) => page.id === state.selectedPageId) || state.doc.pages[0];
  }

  function findBlock(blockId) {
    for (const page of state.doc.pages) {
      const index = page.blocks.findIndex((block) => block.id === blockId);
      if (index >= 0) return { page, block: page.blocks[index], index };
    }
    return null;
  }

  function selectedBlock() {
    const found = findBlock(state.selectedBlockId);
    return found ? found.block : null;
  }

  function setDoc(doc) {
    state.doc = normalizeDoc(doc);
    state.selectedPageId = state.doc.pages[0]?.id || null;
    state.selectedBlockId = null;
    state.lastBackground = state.doc.meta.background || '#FFFFFF';
    syncDocPanel();
    renderAll();
  }

  function bindElements() {
    const ids = [
      'brandLogo', 'docTitle', 'docSubtitle', 'docLayout', 'docAccent', 'docBg', 'docLogo', 'showHeader', 'showFooter', 'footerText',
      'addPageBtn', 'duplicatePageBtn', 'deletePageBtn', 'clearDocBtn', 'blockButtons', 'templateButtons', 'saveName', 'saveDocBtn',
      'exportJsonBtn', 'importJsonBtn', 'importFile', 'savedList', 'topTitle', 'overflowStatus', 'zoomOutBtn', 'zoomInBtn', 'zoomLabel',
      'exportHtmlBtn', 'printBtn', 'pagesPreview', 'previewWrap', 'selectionInfo', 'inspectorFields'
    ];
    ids.forEach((id) => { els[id] = document.getElementById(id); });
  }

  function init() {
    bindElements();
    renderColorOptions();
    renderBlockButtons();
    renderTemplateButtons();
    bindEvents();

    const autosave = Storage.loadAutosave();
    if (autosave && autosave.doc && confirm('Existe um rascunho salvo automaticamente. Deseja recuperar?')) {
      setDoc(autosave.doc);
    } else {
      setDoc(defaultDoc());
    }
    renderSavedList();
  }

  function renderColorOptions() {
    els.docAccent.innerHTML = Blocks.colors
      .map((item) => `<option value="${item.value}">${item.label}</option>`)
      .join('');
  }

  function renderBlockButtons() {
    els.blockButtons.innerHTML = Blocks.order.map((type) => {
      const def = Blocks.registry[type];
      return `<button class="block-add-btn" data-add-block="${type}">
        <strong>${def.label}</strong>
        <span>${def.description}</span>
      </button>`;
    }).join('');
  }

  function renderTemplateButtons() {
    els.templateButtons.innerHTML = Templates.list.map((tpl) => `<button class="template-btn" data-template-id="${tpl.id}">
      <strong>${tpl.name}</strong>
      <span>${tpl.description}</span>
    </button>`).join('');
  }

  function renderSavedList() {
    const items = Storage.list();
    if (!items.length) {
      els.savedList.innerHTML = '<div class="hint-box">Nenhum modelo local salvo ainda.</div>';
      return;
    }
    els.savedList.innerHTML = items.map((item) => {
      const date = new Date(item.updatedAt || item.createdAt).toLocaleString('pt-BR');
      return `<article class="saved-item">
        <strong>${Renderer.escapeHtml(item.name)}</strong>
        <span>Atualizado em ${Renderer.escapeHtml(date)}</span>
        <div class="saved-actions">
          <button class="btn small" data-load-saved="${item.id}">Abrir</button>
          <button class="btn small" data-export-saved="${item.id}">JSON</button>
          <button class="btn small danger" data-delete-saved="${item.id}">Excluir</button>
        </div>
      </article>`;
    }).join('');
  }

  function bindEvents() {
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    ['docTitle', 'docSubtitle', 'docLayout', 'docAccent', 'docBg', 'docLogo', 'showHeader', 'showFooter', 'footerText'].forEach((id) => {
      els[id].addEventListener('input', updateDocFromPanel);
      els[id].addEventListener('change', updateDocFromPanel);
    });

    els.addPageBtn.addEventListener('click', addPage);
    els.duplicatePageBtn.addEventListener('click', duplicatePage);
    els.deletePageBtn.addEventListener('click', deletePage);
    els.clearDocBtn.addEventListener('click', () => {
      if (confirm('Criar um documento novo? O rascunho atual será substituído.')) setDoc(defaultDoc());
    });

    els.blockButtons.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-add-block]');
      if (!btn) return;
      addBlock(btn.dataset.addBlock);
    });

    els.templateButtons.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-template-id]');
      if (!btn) return;
      const doc = Templates.create(btn.dataset.templateId);
      if (doc && confirm('Aplicar este modelo e substituir o documento atual?')) setDoc(doc);
    });

    els.saveDocBtn.addEventListener('click', () => {
      const name = els.saveName.value.trim() || state.doc.meta.title;
      Storage.save(name, state.doc);
      els.saveName.value = '';
      renderSavedList();
      flashStatus('Modelo salvo localmente.', 'ok');
    });

    els.exportJsonBtn.addEventListener('click', exportJson);
    els.importJsonBtn.addEventListener('click', () => els.importFile.click());
    els.importFile.addEventListener('change', importJson);

    els.savedList.addEventListener('click', handleSavedAction);

    els.zoomOutBtn.addEventListener('click', () => setZoom(state.zoom - 0.1));
    els.zoomInBtn.addEventListener('click', () => setZoom(state.zoom + 0.1));
    els.exportHtmlBtn.addEventListener('click', exportHtml);
    els.printBtn.addEventListener('click', () => window.print());

    els.pagesPreview.addEventListener('click', handlePreviewClick);
    els.pagesPreview.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const blockEl = event.target.closest('[data-block-id]');
      if (blockEl) {
        selectBlock(blockEl.dataset.blockId);
        event.preventDefault();
      }
    });

    els.inspectorFields.addEventListener('input', handleInspectorInput);
    els.inspectorFields.addEventListener('change', handleInspectorInput);
    els.inspectorFields.addEventListener('change', handleImageFileChange);
    els.inspectorFields.addEventListener('click', handleInspectorClick);
  }

  function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === tabId));
    document.querySelectorAll('.tab-panel').forEach((panel) => panel.classList.toggle('active', panel.id === tabId));
  }

  function syncDocPanel() {
    const meta = state.doc.meta;
    els.docTitle.value = meta.title || '';
    els.docSubtitle.value = meta.subtitle || '';
    els.docLayout.value = meta.layout || 'boxed';
    els.docAccent.value = meta.accent || '#C8A24A';
    els.docBg.value = meta.background || '#FFFFFF';
    els.docLogo.value = meta.logo || '';
    els.showHeader.checked = Boolean(meta.showHeader);
    els.showFooter.checked = Boolean(meta.showFooter);
    els.footerText.value = meta.footer || '';
    els.brandLogo.src = meta.logo || 'https://rbmgroupassessoria.com.br/wp-content/uploads/2025/05/Logo-RBM.webp';
  }

  function updateDocFromPanel() {
    const meta = state.doc.meta;
    meta.title = els.docTitle.value;
    meta.subtitle = els.docSubtitle.value;
    meta.layout = els.docLayout.value;
    meta.accent = els.docAccent.value;
    meta.background = els.docBg.value;
    meta.logo = els.docLogo.value;
    meta.showHeader = els.showHeader.checked;
    meta.showFooter = els.showFooter.checked;
    meta.footer = els.footerText.value;
    state.doc.pages.forEach((page) => {
      if (!page.backgroundColor || page.backgroundColor === '#FFFFFF' || page.backgroundColor === state.lastBackground) {
        page.backgroundColor = meta.background;
      }
    });
    state.lastBackground = meta.background;
    els.brandLogo.src = meta.logo || 'https://rbmgroupassessoria.com.br/wp-content/uploads/2025/05/Logo-RBM.webp';
    renderAll();
  }

  function setZoom(value) {
    state.zoom = Math.max(0.45, Math.min(1.35, Number(value.toFixed(2))));
    document.documentElement.style.setProperty('--zoom', state.zoom);
    els.zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`;
  }

  function addPage() {
    const page = Blocks.page({
      title: `Página ${state.doc.pages.length + 1}`,
      backgroundColor: state.doc.meta.background || '#FFFFFF',
      backgroundMode: 'gradient',
      backgroundOpacity: 100,
      blocks: []
    });
    state.doc.pages.push(page);
    state.selectedPageId = page.id;
    state.selectedBlockId = null;
    renderAll();
  }

  function duplicatePage() {
    const page = currentPage();
    if (!page) return;
    const copy = clone(page);
    copy.id = Blocks.uid('page');
    copy.title = `${page.title || 'Página'} - cópia`;
    copy.blocks = (copy.blocks || []).map((block) => Object.assign({}, block, { id: Blocks.uid('block') }));
    const index = state.doc.pages.findIndex((item) => item.id === page.id);
    state.doc.pages.splice(index + 1, 0, copy);
    state.selectedPageId = copy.id;
    state.selectedBlockId = null;
    renderAll();
  }

  function deletePage() {
    if (state.doc.pages.length <= 1) {
      alert('O documento precisa ter pelo menos uma página.');
      return;
    }
    const page = currentPage();
    if (!page) return;
    if (!confirm('Excluir a página selecionada?')) return;
    state.doc.pages = state.doc.pages.filter((item) => item.id !== page.id);
    state.selectedPageId = state.doc.pages[0].id;
    state.selectedBlockId = null;
    renderAll();
  }

  function addBlock(type) {
    const page = currentPage();
    if (!page) return;
    const block = Blocks.make(type);
    page.blocks.push(block);
    state.selectedPageId = page.id;
    state.selectedBlockId = block.id;
    renderAll();
  }

  function selectPage(pageId) {
    state.selectedPageId = pageId;
    state.selectedBlockId = null;
    renderAll(false);
  }

  function selectBlock(blockId) {
    const found = findBlock(blockId);
    if (!found) return;
    state.selectedPageId = found.page.id;
    state.selectedBlockId = blockId;
    renderAll(false);
  }

  function moveBlock(blockId, direction) {
    const found = findBlock(blockId);
    if (!found) return;
    const next = found.index + direction;
    if (next < 0 || next >= found.page.blocks.length) return;
    const [item] = found.page.blocks.splice(found.index, 1);
    found.page.blocks.splice(next, 0, item);
    renderAll();
  }

  function duplicateBlock(blockId) {
    const found = findBlock(blockId);
    if (!found) return;
    const copy = clone(found.block);
    copy.id = Blocks.uid('block');
    found.page.blocks.splice(found.index + 1, 0, copy);
    state.selectedBlockId = copy.id;
    renderAll();
  }

  function removeBlock(blockId) {
    const found = findBlock(blockId);
    if (!found) return;
    found.page.blocks.splice(found.index, 1);
    state.selectedBlockId = null;
    renderAll();
  }

  function moveBlockToPage(direction) {
    const found = findBlock(state.selectedBlockId);
    if (!found) return;
    const pageIndex = state.doc.pages.findIndex((page) => page.id === found.page.id);
    const targetIndex = pageIndex + direction;
    if (targetIndex < 0 || targetIndex >= state.doc.pages.length) return;
    const [block] = found.page.blocks.splice(found.index, 1);
    state.doc.pages[targetIndex].blocks.push(block);
    state.selectedPageId = state.doc.pages[targetIndex].id;
    state.selectedBlockId = block.id;
    renderAll();
  }

  function handlePreviewClick(event) {
    const menuBtn = event.target.closest('[data-action]');
    if (menuBtn) {
      const id = menuBtn.dataset.blockId;
      const action = menuBtn.dataset.action;
      if (action === 'up') moveBlock(id, -1);
      if (action === 'down') moveBlock(id, 1);
      if (action === 'duplicate') duplicateBlock(id);
      if (action === 'remove' && confirm('Excluir este bloco?')) removeBlock(id);
      event.stopPropagation();
      return;
    }

    const pageBtn = event.target.closest('[data-page-action]');
    if (pageBtn) {
      selectPage(pageBtn.dataset.pageId);
      event.stopPropagation();
      return;
    }

    const blockEl = event.target.closest('[data-block-id]');
    if (blockEl) {
      selectBlock(blockEl.dataset.blockId);
      event.stopPropagation();
      return;
    }

    const pageEl = event.target.closest('[data-page-id]');
    if (pageEl) selectPage(pageEl.dataset.pageId);
  }

  function renderPreview(autosave = true) {
    els.topTitle.textContent = state.doc.meta.title || 'Informativo RBM';
    els.pagesPreview.innerHTML = Renderer.renderDocument(state.doc, {
      pageId: state.selectedPageId,
      blockId: state.selectedBlockId
    });
    requestAnimationFrame(() => {
      const overflow = Renderer.checkOverflow(els.pagesPreview);
      if (overflow) flashStatus(`${overflow} página(s) com risco de corte. Mova conteúdo para nova página.`, 'warn', true);
      else flashStatus('Sem cortes detectados.', 'ok', true);
    });
    if (autosave) scheduleAutosave();
  }

  function renderAll(autosave = true) {
    renderPreview(autosave);
    renderInspector();
  }

  function flashStatus(message, type, persistent) {
    els.overflowStatus.textContent = message;
    els.overflowStatus.className = type || '';
    if (!persistent) {
      setTimeout(() => {
        els.overflowStatus.textContent = 'Sem cortes detectados.';
        els.overflowStatus.className = 'ok';
      }, 1800);
    }
  }

  function scheduleAutosave() {
    clearTimeout(state.autosaveTimer);
    state.autosaveTimer = setTimeout(() => Storage.autosave(state.doc), 350);
  }

  function renderInspector() {
    const found = findBlock(state.selectedBlockId);
    if (!found) {
      renderPageInspector();
      return;
    }
    const block = found.block;
    const def = Blocks.registry[block.type] || { label: block.type };
    els.selectionInfo.innerHTML = `<strong>${Renderer.escapeHtml(def.label)}</strong><br>Página: ${Renderer.escapeHtml(found.page.title || '')}`;
    els.inspectorFields.innerHTML = `
      <div class="inspector-actions">
        <button class="btn small" data-inspector-action="move-prev-page">← Página anterior</button>
        <button class="btn small" data-inspector-action="move-next-page">Próxima página →</button>
        <button class="btn small" data-inspector-action="duplicate-block">Duplicar bloco</button>
        <button class="btn small danger" data-inspector-action="delete-block">Excluir bloco</button>
      </div>
      ${blockFields(block)}
    `;
  }

  function renderPageInspector() {
    const page = currentPage();
    els.selectionInfo.innerHTML = `<strong>${Renderer.escapeHtml(page?.title || 'Página')}</strong><br>Configurações da página selecionada.`;
    els.inspectorFields.innerHTML = `
      ${inputField('Título interno da página', 'page.title', page?.title || '')}
      ${selectField('Tipo de fundo da página', 'page.backgroundMode', page?.backgroundMode || 'gradient', [{ value: 'gradient', label: 'Degradê suave' }, { value: 'solid', label: 'Cor sólida completa' }])}
      ${inputField('Cor de fundo da página', 'page.backgroundColor', page?.backgroundColor || '#FFFFFF', 'color')}
      ${imageField('Imagem de fundo da página', 'page.backgroundImage', page?.backgroundImage || '')}
      ${inputField('Opacidade da imagem de fundo (%)', 'page.backgroundOpacity', page?.backgroundOpacity ?? 100, 'number')}
      <div class="hint-box">Em 100%, a imagem fica totalmente visível. Em 0%, a imagem desaparece. O tipo de fundo pode ser degradê ou cor sólida.</div>
    `;
  }

  function inputField(label, path, value, type = 'text') {
    return `<label class="field"><span>${Renderer.escapeHtml(label)}</span><input type="${type}" data-path="${Renderer.escapeHtml(path)}" value="${Renderer.escapeHtml(value)}"></label>`;
  }

  function imageField(label, path, value) {
    const safePath = Renderer.escapeHtml(path);
    return `
      <label class="field image-url-field">
        <span>${Renderer.escapeHtml(label)}</span>
        <input type="text" data-path="${safePath}" value="${Renderer.escapeHtml(value || '')}" placeholder="https://... ou imagens/foto.jpg">
      </label>
      <div class="image-tools">
        <button type="button" class="btn small" data-image-upload-btn="${safePath}">Escolher imagem do computador</button>
        <button type="button" class="btn small ghost" data-image-clear-path="${safePath}">Limpar imagem</button>
        <input type="file" accept="image/*" data-image-file-path="${safePath}" hidden>
        <div class="hint-box image-hint">Use link direto de imagem pública ou escolha um arquivo do computador. Links de página, Google Imagens e imagens privadas podem não carregar.</div>
      </div>`;
  }

  function textareaField(label, path, value, rows = 4) {
    return `<label class="field"><span>${Renderer.escapeHtml(label)}</span><textarea rows="${rows}" data-path="${Renderer.escapeHtml(path)}">${Renderer.escapeHtml(value)}</textarea></label>`;
  }

  function selectField(label, path, value, options) {
    return `<label class="field"><span>${Renderer.escapeHtml(label)}</span><select data-path="${Renderer.escapeHtml(path)}">
      ${options.map((opt) => `<option value="${Renderer.escapeHtml(opt.value)}" ${String(opt.value) === String(value) ? 'selected' : ''}>${Renderer.escapeHtml(opt.label)}</option>`).join('')}
    </select></label>`;
  }

  function colorSelect(label, path, key) {
    return selectField(label, path, key || 'gold', Blocks.colors.map((item) => ({ value: item.key, label: item.label })));
  }

  function bgSelect(label, path, key) {
    const items = Blocks.blockBackgrounds || [{ key: 'white', label: 'Branco' }];
    return selectField(label, path, key || 'white', items.map((item) => ({ value: item.key, label: item.label })));
  }

  function blockFields(block) {
    const data = block.data || {};
    switch (block.type) {
      case 'cover':
        return [
          inputField('Chamada superior', 'data.eyebrow', data.eyebrow || ''),
          textareaField('Título', 'data.title', data.title || '', 2),
          textareaField('Subtítulo', 'data.subtitle', data.subtitle || '', 3),
          imageField('URL da imagem de fundo', 'data.imageUrl', data.imageUrl || ''),
          inputField('Opacidade da imagem de fundo (%)', 'data.imageOpacity', data.imageOpacity ?? 100, 'number'),
          colorSelect('Cor de detalhe', 'data.colorKey', data.colorKey),
          bgSelect('Cor de fundo da capa', 'data.bgKey', data.bgKey || 'goldSoft')
        ].join('');
      case 'title':
        return [
          selectField('Tamanho do título', 'data.level', data.level || 'h2', [{ value: 'h1', label: 'Grande / capa de seção' }, { value: 'h2', label: 'Padrão / seção' }]),
          textareaField('Título', 'data.title', data.title || '', 2),
          textareaField('Subtítulo', 'data.subtitle', data.subtitle || '', 3),
          colorSelect('Cor de detalhe', 'data.colorKey', data.colorKey)
        ].join('');
      case 'paragraph':
        return textareaField('Texto', 'data.text', data.text || '', 8);
      case 'highlight':
        return [
          inputField('Título', 'data.title', data.title || ''),
          textareaField('Texto', 'data.text', data.text || '', 5),
          colorSelect('Cor do detalhe', 'data.colorKey', data.colorKey),
          bgSelect('Cor de fundo do bloco', 'data.bgKey', data.bgKey || 'soft'),
          selectField('Estilo', 'data.style', data.style || 'soft', [{ value: 'soft', label: 'Com borda lateral' }, { value: 'clean', label: 'Mais limpo' }])
        ].join('');
      case 'institution':
        return [
          inputField('Título', 'data.title', data.title || ''),
          textareaField('Texto', 'data.text', data.text || '', 5),
          bgSelect('Cor de fundo do bloco', 'data.bgKey', data.bgKey || 'navy')
        ].join('');
      case 'columns':
        return renderColumnsEditor(data);
      case 'checklist':
        return [
          inputField('Título', 'data.title', data.title || ''),
          colorSelect('Cor dos marcadores', 'data.colorKey', data.colorKey),
          bgSelect('Cor de fundo dos itens', 'data.bgKey', data.bgKey || 'white'),
          textareaField('Itens do checklist — um por linha', 'array.items', (data.items || []).join('\n'), 8)
        ].join('');
      case 'image':
        return [
          imageField('URL da imagem', 'data.imageUrl', data.imageUrl || ''),
          inputField('Legenda', 'data.caption', data.caption || ''),
          inputField('Altura em mm', 'data.height', data.height || 42, 'number'),
          inputField('Opacidade da imagem (%)', 'data.opacity', data.opacity ?? 100, 'number')
        ].join('');
      case 'buttons':
        return renderButtonsEditor(data);
      case 'divider':
        return colorSelect('Cor do divisor', 'data.colorKey', data.colorKey);
      case 'spacer':
        return inputField('Altura do espaço em mm', 'data.size', data.size || 10, 'number');
      default:
        return textareaField('Dados JSON', 'json.data', JSON.stringify(data, null, 2), 10);
    }
  }

  function renderColumnsEditor(data) {
    const cols = Array.isArray(data.columns) ? data.columns : [];
    return `
      ${inputField('Título do bloco', 'data.title', data.title || '')}
      ${selectField('Quantidade de colunas visíveis', 'data.count', data.count || 3, [1,2,3,4,5,6].map((n) => ({ value: n, label: `${n} coluna${n > 1 ? 's' : ''}` })))}
      ${colorSelect('Cor da numeração', 'data.colorKey', data.colorKey)}
      ${bgSelect('Cor de fundo dos cartões', 'data.bgKey', data.bgKey || 'white')}
      <div class="array-editor">
        ${cols.map((col, index) => `<div class="array-item">
          <div class="array-item-title"><span>Item ${index + 1}</span><button class="btn small danger" data-array-action="remove-column" data-index="${index}">Excluir</button></div>
          ${inputField('Título', `data.columns.${index}.title`, col.title || '')}
          ${textareaField('Texto', `data.columns.${index}.text`, col.text || '', 3)}
        </div>`).join('')}
        <button class="btn" data-array-action="add-column">+ Adicionar item</button>
      </div>`;
  }

  function renderButtonsEditor(data) {
    const buttons = Array.isArray(data.buttons) ? data.buttons : [];
    return `
      ${inputField('Título do bloco', 'data.title', data.title || '')}
      ${colorSelect('Cor dos botões', 'data.colorKey', data.colorKey || 'blue')}
      <div class="array-editor">
        ${buttons.map((btn, index) => `<div class="array-item">
          <div class="array-item-title"><span>Botão ${index + 1}</span><button class="btn small danger" data-array-action="remove-button" data-index="${index}">Excluir</button></div>
          ${inputField('Texto do botão', `data.buttons.${index}.label`, btn.label || '')}
          ${inputField('Link', `data.buttons.${index}.url`, btn.url || '#', 'url')}
          ${selectField('Estilo', `data.buttons.${index}.style`, btn.style || 'primary', [{ value: 'primary', label: 'Principal' }, { value: 'secondary', label: 'Secundário' }])}
        </div>`).join('')}
        <button class="btn" data-array-action="add-button">+ Adicionar botão</button>
      </div>`;
  }

  function handleInspectorInput(event) {
    const target = event.target;
    const path = target.dataset.path;
    if (!path) return;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    applyInspectorValue(path, value);
    renderPreview();
  }

  function applyInspectorValue(path, value) {
    if (path.startsWith('page.')) {
      const page = currentPage();
      if (!page) return false;
      setByPath(page, path.replace(/^page\./, ''), normalizeValue(path, value));
      return true;
    }

    const block = selectedBlock();
    if (!block) return false;

    if (path === 'array.items') {
      block.data.items = String(value).split('\n').map((item) => item.trim()).filter(Boolean);
      return true;
    }
    if (path === 'json.data') {
      try { block.data = JSON.parse(value); return true; } catch (err) { return false; }
    }

    setByPath(block, path, normalizeValue(path, value));
    return true;
  }

  async function handleImageFileChange(event) {
    const input = event.target.closest('[data-image-file-path]');
    if (!input || !input.files || !input.files[0]) return;

    const file = input.files[0];
    try {
      const dataUrl = await imageFileToDataUrl(file);
      applyInspectorValue(input.dataset.imageFilePath, dataUrl);
      renderAll();
      flashStatus('Imagem adicionada ao documento.', 'ok');
    } catch (err) {
      console.error(err);
      alert('Não foi possível carregar a imagem. Use PNG, JPG, WEBP, GIF ou SVG.');
    } finally {
      input.value = '';
    }
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('Falha ao ler arquivo.'));
      reader.readAsDataURL(file);
    });
  }

  function imageFileToDataUrl(file) {
    if (!file || !String(file.type || '').startsWith('image/')) {
      return Promise.reject(new Error('Arquivo não é imagem.'));
    }

    if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
      return readFileAsDataUrl(file);
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error || new Error('Falha ao ler imagem.'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Imagem inválida.'));
        img.onload = () => {
          const maxSide = 1800;
          const scale = Math.min(1, maxSide / Math.max(img.width || maxSide, img.height || maxSide));
          const width = Math.max(1, Math.round((img.width || 1) * scale));
          const height = Math.max(1, Math.round((img.height || 1) * scale));
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.86));
        };
        img.src = String(reader.result || '');
      };
      reader.readAsDataURL(file);
    });
  }

  function normalizeValue(path, value) {
    if (/backgroundOpacity$/i.test(path)) return clampNumber(value, 0, 100, 100);
    if (/imageOpacity$|\.opacity$/i.test(path)) return clampNumber(value, 0, 100, 100);
    if (/\.count$|\.height$|\.size$/.test(path)) return Number(value || 0);
    if (/imageUrl$|backgroundImage$|logo$/i.test(path)) return String(value || '').trim();
    return value;
  }

  function setByPath(obj, path, value) {
    const parts = path.split('.');
    let ref = obj;
    while (parts.length > 1) {
      const key = parts.shift();
      if (ref[key] == null) ref[key] = /^\d+$/.test(parts[0]) ? [] : {};
      ref = ref[key];
    }
    ref[parts[0]] = value;
  }

  function handleInspectorClick(event) {
    const uploadBtn = event.target.closest('[data-image-upload-btn]');
    if (uploadBtn) {
      const box = uploadBtn.closest('.image-tools');
      const fileInput = box && box.querySelector('[data-image-file-path]');
      if (fileInput) fileInput.click();
      return;
    }

    const clearImageBtn = event.target.closest('[data-image-clear-path]');
    if (clearImageBtn) {
      applyInspectorValue(clearImageBtn.dataset.imageClearPath, '');
      renderAll();
      return;
    }

    const actionBtn = event.target.closest('[data-inspector-action]');
    if (actionBtn) {
      const action = actionBtn.dataset.inspectorAction;
      if (action === 'move-prev-page') moveBlockToPage(-1);
      if (action === 'move-next-page') moveBlockToPage(1);
      if (action === 'duplicate-block') duplicateBlock(state.selectedBlockId);
      if (action === 'delete-block' && confirm('Excluir o bloco selecionado?')) removeBlock(state.selectedBlockId);
      return;
    }

    const arrayBtn = event.target.closest('[data-array-action]');
    if (!arrayBtn) return;
    const block = selectedBlock();
    if (!block) return;
    const action = arrayBtn.dataset.arrayAction;
    const index = Number(arrayBtn.dataset.index);

    if (action === 'add-column') {
      block.data.columns = Array.isArray(block.data.columns) ? block.data.columns : [];
      block.data.columns.push({ title: `Novo item ${block.data.columns.length + 1}`, text: 'Descreva o item.' });
      block.data.count = Math.min(6, Math.max(Number(block.data.count || 1), block.data.columns.length));
    }
    if (action === 'remove-column') {
      block.data.columns.splice(index, 1);
      block.data.count = Math.max(1, Math.min(Number(block.data.count || 1), block.data.columns.length || 1));
    }
    if (action === 'add-button') {
      block.data.buttons = Array.isArray(block.data.buttons) ? block.data.buttons : [];
      block.data.buttons.push({ label: 'Novo botão', url: '#', style: 'primary' });
    }
    if (action === 'remove-button') {
      block.data.buttons.splice(index, 1);
    }
    renderAll();
  }

  function handleSavedAction(event) {
    const loadBtn = event.target.closest('[data-load-saved]');
    const deleteBtn = event.target.closest('[data-delete-saved]');
    const exportBtn = event.target.closest('[data-export-saved]');

    if (loadBtn) {
      const item = Storage.get(loadBtn.dataset.loadSaved);
      if (item && confirm('Abrir este modelo salvo e substituir o documento atual?')) setDoc(item.doc);
    }
    if (deleteBtn) {
      if (!confirm('Excluir este modelo local?')) return;
      Storage.remove(deleteBtn.dataset.deleteSaved);
      renderSavedList();
    }
    if (exportBtn) {
      const item = Storage.get(exportBtn.dataset.exportSaved);
      if (!item) return;
      const filename = Storage.safeFilename(item.name, 'json');
      Storage.downloadFile(filename, JSON.stringify(item.doc, null, 2), 'application/json;charset=utf-8');
    }
  }

  function exportJson() {
    const filename = Storage.safeFilename(state.doc.meta.title || 'informativo-rbm', 'json');
    Storage.downloadFile(filename, JSON.stringify(state.doc, null, 2), 'application/json;charset=utf-8');
  }

  function importJson(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const doc = JSON.parse(reader.result);
        setDoc(doc);
        flashStatus('JSON importado com sucesso.', 'ok');
      } catch (err) {
        alert('Não foi possível importar o JSON. Verifique o arquivo.');
      } finally {
        els.importFile.value = '';
      }
    };
    reader.readAsText(file, 'utf-8');
  }

  function exportHtml() {
    const html = Renderer.standaloneHtml(state.doc);
    const filename = Storage.safeFilename(state.doc.meta.title || 'informativo-rbm', 'html');
    Storage.downloadFile(filename, html, 'text/html;charset=utf-8');
  }

  global.RBM_APP = {
    state,
    setDoc,
    renderAll,
    addBlock,
    addPage
  };

  document.addEventListener('DOMContentLoaded', init);
})(window);
