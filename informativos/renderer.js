(function (global) {
  'use strict';

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function normalizeUrl(value) {
    let url = String(value || '').trim();
    if (!url) return '';
    url = url.replace(/^[\"']|[\"']$/g, '').trim();

    const driveFile = url.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
    const driveId = driveFile ? driveFile[1] : (url.match(/[?&]id=([^&]+)/i) || [])[1];
    if (/drive\.google\.com/i.test(url) && driveId) {
      return `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveId)}&sz=w2000`;
    }

    if (/^www\./i.test(url)) return `https://${url}`;
    if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(url) && !/^[a-z][a-z0-9+.-]*:/i.test(url)) {
      return `https://${url}`;
    }

    return url;
  }

  function sanitizeUrl(value) {
    const url = normalizeUrl(value);
    if (!url) return '';
    if (/^(https?:|data:image\/|blob:|#|mailto:|tel:)/i.test(url)) return url;
    if (socialSafeRelativeUrl(url)) return url;
    return '';
  }

  function socialSafeRelativeUrl(url) {
    if (/^(\.?\.?\/|assets\/|img\/|images\/|imagens\/)/i.test(url)) return true;
    return /^[^\\/:*?"<>|]+\.(png|jpe?g|webp|gif|svg)$/i.test(url);
  }

  function cssUrl(value) {
    return String(value || '')
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/[\r\n]/g, '');
  }

  function nl2p(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    return text
      .split(/\n{2,}/)
      .map((part) => `<p>${escapeHtml(part).replace(/\n/g, '<br>')}</p>`)
      .join('');
  }

  function color(block, doc) {
    const api = global.RBM_BLOCKS;
    const key = block?.data?.colorKey;
    if (api && typeof api.colorByKey === 'function') return api.colorByKey(key).value;
    return doc?.meta?.accent || '#C8A24A';
  }

  function blockBackground(block) {
    const api = global.RBM_BLOCKS;
    const key = block?.data?.bgKey;
    if (api && typeof api.blockBackgroundByKey === 'function') return api.blockBackgroundByKey(key);
    return { value: '#FFFFFF', text: '#1E293B', title: '#0B1F33', muted: '#64748B', border: '#D8E0E8' };
  }

  function isColor(value) {
    return /^#[0-9a-f]{6}$/i.test(String(value || '').trim());
  }

  function pickColor(value, fallback) {
    const raw = String(value || '').trim();
    return isColor(raw) ? raw : fallback;
  }

  function optionValue(value, allowed, fallback) {
    const raw = String(value || '').trim();
    return allowed.includes(raw) ? raw : fallback;
  }

  function spaceMm(value) {
    const key = optionValue(value, ['none', 'small', 'normal', 'large'], 'none');
    return { none: 0, small: 1.5, normal: 3, large: 5 }[key];
  }

  function lineHeightValue(value) {
    const key = optionValue(value, ['compact', 'normal', 'relaxed'], 'normal');
    return { compact: 1.35, normal: 1.5, relaxed: 1.62 }[key];
  }

  function titleBaseSize(block, data) {
    const type = block?.type || '';
    if (type === 'cover') return 34;
    if (type === 'title') return data.level === 'h1' ? 34 : 24;
    if (type === 'institution') return 23;
    if (type === 'columns') return 24;
    if (type === 'custom') return 21;
    return 21;
  }

  function textBaseSize(block) {
    const type = block?.type || '';
    if (type === 'cover') return 19;
    if (type === 'paragraph') return 18;
    if (type === 'custom') return 17;
    if (type === 'columns') return 16;
    if (type === 'image') return 14;
    return 18;
  }

  function fontPx(base, value) {
    const key = optionValue(value, ['small', 'normal', 'large', 'xlarge'], 'normal');
    const delta = { small: -2, normal: 0, large: 2, xlarge: 4 }[key];
    return Math.max(16, base + delta);
  }

  function blockSpacingVars(data) {
    return [
      `--block-mt:${spaceMm(data.spaceTop)}mm`,
      `--block-mb:${spaceMm(data.spaceBottom)}mm`
    ].join(';');
  }

  function ratio(value, fallback) {
    const raw = Number(value);
    const safe = Number.isFinite(raw) ? raw : Number(fallback || 100);
    const clamped = Math.max(0, Math.min(100, safe));
    return (clamped / 100).toFixed(2);
  }

  function inverseRatio(value, fallback) {
    const raw = Number(value);
    const safe = Number.isFinite(raw) ? raw : Number(fallback || 100);
    const clamped = Math.max(0, Math.min(100, safe));
    return ((100 - clamped) / 100).toFixed(2);
  }

  function blockMenu(block) {
    return `<div class="block-menu" aria-hidden="true">
      <button data-action="up" data-block-id="${escapeHtml(block.id)}">↑</button>
      <button data-action="down" data-block-id="${escapeHtml(block.id)}">↓</button>
      <button data-action="duplicate" data-block-id="${escapeHtml(block.id)}">Copiar</button>
      <button data-action="remove" data-block-id="${escapeHtml(block.id)}">Excluir</button>
    </div>`;
  }

  function blockCssVars(block, doc) {
    const data = block.data || {};
    const accent = pickColor(data.accentColor, color(block, doc));
    const bg = blockBackground(block);
    const blockBg = block.type === 'custom' ? pickColor(data.bgColor, bg.value) : bg.value;
    const title = pickColor(data.titleColor, bg.title);
    const text = pickColor(data.textColor, bg.text);
    const muted = pickColor(data.subtitleColor || data.mutedColor, bg.muted);
    const border = pickColor(data.borderColor, bg.border);
    return [
      `--accent:${escapeHtml(accent)}`,
      `--block-bg:${escapeHtml(blockBg)}`,
      `--block-text:${escapeHtml(text)}`,
      `--block-title:${escapeHtml(title)}`,
      `--block-muted:${escapeHtml(muted)}`,
      `--block-border:${escapeHtml(border)}`,
      `--block-title-size:${fontPx(titleBaseSize(block, data), data.titleSize)}px`,
      `--block-text-size:${fontPx(textBaseSize(block), data.textSize)}px`,
      `--block-line-height:${lineHeightValue(data.lineHeight)}`,
      `--button-text:${escapeHtml(pickColor(data.buttonTextColor, '#FFFFFF'))}`,
      `--button-secondary-text:${escapeHtml(pickColor(data.secondaryTextColor, accent))}`,
      `--caption-color:${escapeHtml(pickColor(data.captionColor, '#64748B'))}`,
      `--item-title:${escapeHtml(pickColor(data.itemTitleColor, title))}`,
      `--item-text:${escapeHtml(pickColor(data.itemTextColor, text))}`,
      `--number-text:${escapeHtml(pickColor(data.numberColor || data.checkColor, '#FFFFFF'))}`
    ].join(';');
  }

  function customWidthClass(width) {
    const value = String(width || '100');
    if (['100', '75', '67', '50', '33', '25'].includes(value)) return ` width-${value}`;
    return ' width-100';
  }

  function renderCustomBlock(block, doc, style) {
    const data = block.data || {};
    const src = sanitizeUrl(data.imageUrl);
    const items = Array.isArray(data.items) ? data.items : [];
    const imagePosition = ['top', 'left', 'right'].includes(data.imagePosition) ? data.imagePosition : 'top';
    const align = ['left', 'center', 'right', 'justify'].includes(data.align) ? data.align : 'left';
    const padding = Math.max(3, Math.min(10, Number(data.padding || 5)));
    const radius = Math.max(0, Math.min(28, Number(data.radius || 14)));
    const imageHeight = Math.max(18, Math.min(70, Number(data.imageHeight || 28)));
    const borderStyle = data.borderStyle || 'normal';
    const shadowClass = data.shadow ? ' has-shadow' : '';
    const borderClass = borderStyle === 'side' ? ' border-side' : borderStyle === 'none' ? ' border-none' : '';
    const buttonColor = pickColor(data.buttonColor, doc?.meta?.accent || '#123C5A');

    const imageHtml = src && data.showImage ? `<figure class="custom-image"><img src="${escapeHtml(src)}" alt=""></figure>` : '';
    const textHtml = `<div class="custom-body">
      ${data.showTitle ? `<h3>${escapeHtml(data.title || '')}</h3>` : ''}
      ${data.showText ? `<div class="custom-text">${nl2p(data.text || '')}</div>` : ''}
      ${data.showItems && items.length ? `<ul class="custom-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}
      ${data.showButton ? `<a class="custom-button" href="${escapeHtml(sanitizeUrl(data.buttonUrl || '#'))}">${escapeHtml(data.buttonLabel || 'Saiba mais')}</a>` : ''}
    </div>`;

    return `<section class="custom-card image-${escapeHtml(imagePosition)} align-${escapeHtml(align)}${shadowClass}${borderClass}" style="${style};--custom-padding:${padding}mm;--custom-radius:${radius}px;--custom-img-height:${imageHeight}mm;--custom-button-bg:${escapeHtml(buttonColor)}">
      ${imagePosition === 'right' ? `${textHtml}${imageHtml}` : `${imageHtml}${textHtml}`}
    </section>`;
  }

  function renderBlock(block, doc, selectedId) {
    const data = block.data || {};
    const selected = selectedId === block.id ? ' selected-block' : '';
    const style = blockCssVars(block, doc);
    let html = '';

    switch (block.type) {
      case 'cover': {
        const safeImage = sanitizeUrl(data.imageUrl);
        const imageOpacity = ratio(data.imageOpacity, 100);
        const overlayOpacity = safeImage ? inverseRatio(data.imageOpacity, 100) : '0.00';
        const coverStyle = [
          style,
          `--cover-img-opacity:${imageOpacity}`,
          `--cover-overlay-opacity:${overlayOpacity}`,
          `--cover-wash-opacity:${overlayOpacity}`,
          `--cover-eyebrow-color:${escapeHtml(pickColor(data.eyebrowColor, pickColor(data.titleColor, blockBackground(block).title)))}`,
          `--cover-title-color:${escapeHtml(pickColor(data.titleColor, blockBackground(block).title))}`,
          `--cover-subtitle-color:${escapeHtml(pickColor(data.subtitleColor, blockBackground(block).muted))}`
        ].join(';');
        html = `<section class="cover-block" style="${coverStyle}">
          ${safeImage ? `<img class="cover-bg-img" src="${escapeHtml(safeImage)}" alt="">` : ''}
          <div class="cover-accent-wash" aria-hidden="true"></div>
          ${safeImage ? `<div class="cover-overlay" aria-hidden="true"></div>` : ''}
          <div class="cover-eyebrow">${escapeHtml(data.eyebrow)}</div>
          <h1 class="cover-title">${escapeHtml(data.title)}</h1>
          <p class="cover-subtitle">${escapeHtml(data.subtitle)}</p>
        </section>`;
        break;
      }
      case 'title': {
        const tag = data.level === 'h1' ? 'h1' : 'h2';
        html = `<section class="section-title" style="${style}">
          <${tag}>${escapeHtml(data.title)}</${tag}>
          ${data.subtitle ? `<p>${escapeHtml(data.subtitle)}</p>` : ''}
        </section>`;
        break;
      }
      case 'paragraph': {
        const align = ['left', 'center', 'right', 'justify'].includes(data.align) ? data.align : 'justify';
        html = `<section class="paragraph-block align-${escapeHtml(align)}" style="${style}">${nl2p(data.text)}</section>`;
        break;
      }
      case 'highlight': {
        const highlightClass = data.style === 'clean' ? ' clean' : ' soft';
        html = `<section class="highlight-block${highlightClass}" style="${style}">
          <h3>${escapeHtml(data.title)}</h3>
          <p>${escapeHtml(data.text)}</p>
        </section>`;
        break;
      }
      case 'institution': {
        html = `<section class="institution-block" style="${style}">
          <h3>${escapeHtml(data.title)}</h3>
          <p>${escapeHtml(data.text)}</p>
        </section>`;
        break;
      }
      case 'columns': {
        const cols = Math.max(1, Math.min(6, Number(data.count || 3)));
        const columns = Array.isArray(data.columns) ? data.columns : [];
        html = `<section class="columns-block" style="${style};--cols:${cols}">
          <h3>${escapeHtml(data.title)}</h3>
          <div class="columns-grid">
            ${columns.map((item, index) => `<article class="column-card">
              <span class="column-number">${index + 1}</span>
              <h4>${escapeHtml(item.title)}</h4>
              <p>${escapeHtml(item.text)}</p>
            </article>`).join('')}
          </div>
        </section>`;
        break;
      }
      case 'checklist': {
        const items = Array.isArray(data.items) ? data.items : [];
        html = `<section class="checklist-block" style="${style}">
          <h3>${escapeHtml(data.title)}</h3>
          <ul class="checklist">
            ${items.map((item) => `<li><span class="check-icon">✓</span><span>${escapeHtml(item)}</span></li>`).join('')}
          </ul>
        </section>`;
        break;
      }
      case 'image': {
        const src = sanitizeUrl(data.imageUrl);
        html = `<figure class="image-block" style="${style};--image-height:${Number(data.height || 42)}mm;--image-opacity:${ratio(data.opacity, 100)}">
          ${src ? `<img src="${escapeHtml(src)}" alt="Imagem do informativo">` : `<div class="highlight-block soft"><h3>Imagem não informada</h3><p>Cole a URL da imagem no painel de edição.</p></div>`}
          ${data.caption ? `<figcaption>${escapeHtml(data.caption)}</figcaption>` : ''}
        </figure>`;
        break;
      }
      case 'buttons': {
        const buttons = Array.isArray(data.buttons) ? data.buttons : [];
        html = `<section class="buttons-block" style="${style}">
          ${data.title ? `<h3>${escapeHtml(data.title)}</h3>` : ''}
          <div class="buttons-row">
            ${buttons.map((btn) => `<a class="action-button ${btn.style === 'secondary' ? 'secondary' : ''}" href="${escapeHtml(sanitizeUrl(btn.url))}">${escapeHtml(btn.label)}</a>`).join('')}
          </div>
        </section>`;
        break;
      }
      case 'custom': {
        html = renderCustomBlock(block, doc, style);
        break;
      }
      case 'divider': {
        html = `<div class="divider-block" style="${style}"></div>`;
        break;
      }
      case 'spacer': {
        html = `<div class="spacer-block" style="--space:${Number(data.size || 10)}mm"></div>`;
        break;
      }
      default: {
        html = `<section class="highlight-block soft"><h3>Bloco desconhecido</h3><p>Tipo: ${escapeHtml(block.type)}</p></section>`;
      }
    }

    const widthClass = block.type === 'custom' ? customWidthClass(data.width) : '';
    const equalClass = block.type === 'custom' && data.equalHeight === false ? ' no-equal-height' : '';
    const outerStyle = [style, blockSpacingVars(data)].join(';');
    return `<div class="block${selected}${widthClass}${equalClass}" role="button" tabindex="0" data-block-id="${escapeHtml(block.id)}" data-block-type="${escapeHtml(block.type)}" style="${outerStyle}">${blockMenu(block)}${html}</div>`;
  }

  function header(doc) {
    const meta = doc.meta || {};
    if (!meta.showHeader) return '';
    const logo = sanitizeUrl(meta.logo);
    return `<header class="rbm-header">
      <div class="brand-mark">
        ${logo ? `<img src="${escapeHtml(logo)}" alt="RBM">` : ''}
        <div class="brand-text">
          <strong>${escapeHtml(meta.title || 'Informativo RBM')}</strong>
          <span>${escapeHtml(meta.subtitle || 'Material informativo')}</span>
        </div>
      </div>
      <div class="header-gold-line"></div>
    </header>`;
  }

  function footer(doc, pageIndex, totalPages) {
    const meta = doc.meta || {};
    if (!meta.showFooter) return '';
    return `<footer class="rbm-footer">
      <span>${escapeHtml(meta.footer || 'RBM Contabilidade')}</span>
      <span>Página ${pageIndex + 1} de ${totalPages}</span>
    </footer>`;
  }

  function renderPage(page, doc, pageIndex, totalPages, selected) {
    const meta = doc.meta || {};
    const layout = meta.layout === 'full' ? 'layout-full' : 'layout-boxed';
    const selectedPage = selected.pageId === page.id ? ' selected-page' : '';
    const bgColor = page.backgroundColor || meta.background || '#FFFFFF';
    const bgImage = sanitizeUrl(page.backgroundImage);
    const bgOpacity = ratio(page.backgroundOpacity, 100);
    const bgOverlayOpacity = bgImage ? inverseRatio(page.backgroundOpacity, 100) : '0.00';
    const bgMode = page.backgroundMode === 'solid' ? 'page-bg-solid' : 'page-bg-gradient';
    return `<section class="page ${layout} ${bgMode}${selectedPage}" data-page-id="${escapeHtml(page.id)}" style="--doc-bg:${escapeHtml(bgColor)};--accent:${escapeHtml(meta.accent || '#C8A24A')};--page-bg-opacity:${bgOpacity};--page-bg-overlay-opacity:${bgOverlayOpacity}">
      ${bgImage ? `<div class="page-bg-image"><img src="${escapeHtml(bgImage)}" alt=""></div><div class="page-bg-overlay"></div>` : ''}
      <div class="page-toolbar" aria-hidden="true"><button data-page-action="select" data-page-id="${escapeHtml(page.id)}">Página ${pageIndex + 1}</button></div>
      <div class="content">
        ${header(doc)}
        <main class="blocks">
          ${(page.blocks || []).map((block) => renderBlock(block, doc, selected.blockId)).join('')}
        </main>
      </div>
      ${footer(doc, pageIndex, totalPages)}
    </section>`;
  }

  function renderDocument(doc, selected) {
    const pages = Array.isArray(doc.pages) && doc.pages.length ? doc.pages : [];
    const safeSelected = selected || {};
    return pages.map((page, index) => renderPage(page, doc, index, pages.length, safeSelected)).join('');
  }

  function exportCss() {
    const style = document.querySelector('link[href="styles.css"]');
    const embedded = Array.from(document.styleSheets)
      .filter((sheet) => {
        try { return sheet.href && sheet.href.includes('styles.css'); } catch (err) { return false; }
      })
      .map((sheet) => {
        try { return Array.from(sheet.cssRules).map((rule) => rule.cssText).join('\n'); } catch (err) { return ''; }
      })
      .join('\n');
    if (embedded) return embedded;
    return style ? '' : '';
  }

  function standaloneHtml(doc) {
    const css = exportCss();
    const body = renderDocument(doc, {});
    return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(doc?.meta?.title || 'Informativo RBM')}</title>
${css ? `<style>${css}</style>` : '<link rel="stylesheet" href="styles.css">'}
</head>
<body>
<div class="pages-preview">${body}</div>
</body>
</html>`;
  }

  function checkOverflow(root) {
    const pages = Array.from(root.querySelectorAll('.page'));
    let count = 0;
    pages.forEach((page) => {
      const content = page.querySelector('.content');
      if (!content) return;
      const hasOverflow = content.scrollHeight > content.clientHeight + 2;
      page.classList.toggle('has-overflow', hasOverflow);
      if (hasOverflow) count += 1;
    });
    return count;
  }

  global.RBM_RENDERER = {
    escapeHtml,
    normalizeUrl,
    sanitizeUrl,
    renderBlock,
    renderPage,
    renderDocument,
    standaloneHtml,
    checkOverflow
  };
})(window);
