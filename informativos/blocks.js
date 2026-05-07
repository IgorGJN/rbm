(function (global) {
  'use strict';

  const COLORS = [
    { key: 'gold', label: 'Dourado RBM', value: '#C8A24A' },
    { key: 'navy', label: 'Azul Navy', value: '#0B1F33' },
    { key: 'blue', label: 'Azul Institucional', value: '#123C5A' },
    { key: 'blue2', label: 'Azul Médio', value: '#1F5F87' },
    { key: 'green', label: 'Verde Confiança', value: '#117A46' },
    { key: 'red', label: 'Vermelho Alerta', value: '#B42318' },
    { key: 'gray', label: 'Cinza Elegante', value: '#64748B' }
  ];

  const BLOCK_BACKGROUNDS = [
    { key: 'white', label: 'Branco', value: '#FFFFFF', text: '#1E293B', title: '#0B1F33', muted: '#64748B', border: '#D8E0E8' },
    { key: 'soft', label: 'Cinza claro RBM', value: '#F4F7FA', text: '#1E293B', title: '#0B1F33', muted: '#64748B', border: '#D8E0E8' },
    { key: 'goldSoft', label: 'Dourado suave', value: '#FFF7E0', text: '#1E293B', title: '#5E4612', muted: '#6B5B2A', border: '#E8D8A8' },
    { key: 'gold', label: 'Dourado forte', value: '#C8A24A', text: '#0B1F33', title: '#0B1F33', muted: '#2F3F50', border: '#B89034' },
    { key: 'navy', label: 'Azul navy', value: '#0B1F33', text: '#FFFFFF', title: '#FFFFFF', muted: '#E6EDF3', border: '#123C5A' },
    { key: 'blue', label: 'Azul institucional', value: '#123C5A', text: '#FFFFFF', title: '#FFFFFF', muted: '#DCEAF3', border: '#1F5F87' },
    { key: 'blue2', label: 'Azul médio', value: '#1F5F87', text: '#FFFFFF', title: '#FFFFFF', muted: '#E4F0F7', border: '#123C5A' },
    { key: 'green', label: 'Verde confiança', value: '#117A46', text: '#FFFFFF', title: '#FFFFFF', muted: '#E5F6EE', border: '#0D6338' },
    { key: 'red', label: 'Vermelho alerta', value: '#B42318', text: '#FFFFFF', title: '#FFFFFF', muted: '#FBE8E6', border: '#8F1D14' },
    { key: 'gray', label: 'Cinza elegante', value: '#64748B', text: '#FFFFFF', title: '#FFFFFF', muted: '#EEF2F6', border: '#475569' }
  ];

  const BLOCKS = {
    cover: {
      label: 'Capa / Hero',
      description: 'Título principal com imagem opcional no fundo.',
      defaultData: () => ({
        eyebrow: 'INFORMATIVO RBM',
        title: 'Título do informativo',
        subtitle: 'Subtítulo curto com a ideia principal do comunicado.',
        imageUrl: '',
        imageOpacity: 100,
        colorKey: 'gold',
        bgKey: 'goldSoft'
      })
    },
    title: {
      label: 'Título de seção',
      description: 'Título grande com texto de apoio.',
      defaultData: () => ({
        level: 'h2',
        title: 'Título da seção',
        subtitle: 'Texto curto para contextualizar o conteúdo.',
        colorKey: 'gold'
      })
    },
    paragraph: {
      label: 'Texto',
      description: 'Parágrafo comum, com leitura confortável.',
      defaultData: () => ({
        text: 'Digite o texto aqui. Evite parágrafos muito longos para manter a leitura confortável no celular e na impressão.'
      })
    },
    highlight: {
      label: 'Destaque personalizável',
      description: 'Card com borda lateral e cor escolhida.',
      defaultData: () => ({
        title: 'Ponto de atenção',
        text: 'Use este bloco para destacar informações importantes sem pesar o visual.',
        colorKey: 'gold',
        bgKey: 'soft',
        style: 'soft'
      })
    },
    institution: {
      label: 'Bloco institucional',
      description: 'Bloco escuro premium para fechamento ou aviso importante.',
      defaultData: () => ({
        title: 'Conte com a RBM',
        text: 'Nossa equipe está à disposição para orientar sua empresa e manter os processos em dia.',
        bgKey: 'navy'
      })
    },
    columns: {
      label: 'Colunas numeradas',
      description: 'Lista em 1 a 6 colunas, ideal para passos e vantagens.',
      defaultData: () => ({
        title: 'Como funciona',
        count: 3,
        colorKey: 'gold',
        bgKey: 'white',
        columns: [
          { title: 'Primeiro passo', text: 'Descreva a primeira etapa.' },
          { title: 'Segundo passo', text: 'Descreva a segunda etapa.' },
          { title: 'Terceiro passo', text: 'Descreva a terceira etapa.' }
        ]
      })
    },
    checklist: {
      label: 'Checklist',
      description: 'Itens com marcação visual.',
      defaultData: () => ({
        title: 'Principais pontos',
        colorKey: 'gold',
        bgKey: 'white',
        items: ['Item importante do informativo', 'Outra informação relevante', 'Orientação prática para o cliente']
      })
    },
    image: {
      label: 'Imagem',
      description: 'Imagem suave dentro do documento.',
      defaultData: () => ({
        imageUrl: '',
        caption: '',
        height: 42,
        opacity: 100
      })
    },
    buttons: {
      label: 'Botões de ação',
      description: 'Botões para WhatsApp, dúvidas ou confirmação.',
      defaultData: () => ({
        title: 'Próximo passo',
        colorKey: 'blue',
        buttons: [
          { label: 'Quero solicitar', url: '#', style: 'primary' },
          { label: 'Tenho dúvidas', url: '#', style: 'secondary' }
        ]
      })
    },
    divider: {
      label: 'Divisor',
      description: 'Linha fina para separar seções.',
      defaultData: () => ({ colorKey: 'gold' })
    },
    spacer: {
      label: 'Espaço',
      description: 'Ajuste fino de respiro entre blocos.',
      defaultData: () => ({ size: 10 })
    }
  };

  function uid(prefix) {
    return `${prefix || 'id'}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function colorByKey(key) {
    return COLORS.find((item) => item.key === key) || COLORS[0];
  }

  function blockBackgroundByKey(key) {
    return BLOCK_BACKGROUNDS.find((item) => item.key === key) || BLOCK_BACKGROUNDS[0];
  }

  function make(type, overrides) {
    const def = BLOCKS[type] || BLOCKS.paragraph;
    return Object.assign({
      id: uid('block'),
      type,
      data: def.defaultData()
    }, clone(overrides || {}));
  }

  function page(overrides) {
    return Object.assign({
      id: uid('page'),
      title: 'Página',
      backgroundColor: '#FFFFFF',
      backgroundImage: '',
      backgroundMode: 'gradient',
      backgroundOpacity: 100,
      blocks: []
    }, clone(overrides || {}));
  }

  global.RBM_BLOCKS = {
    registry: BLOCKS,
    order: ['cover', 'title', 'paragraph', 'highlight', 'institution', 'columns', 'checklist', 'image', 'buttons', 'divider', 'spacer'],
    colors: COLORS,
    blockBackgrounds: BLOCK_BACKGROUNDS,
    make,
    page,
    uid,
    clone,
    colorByKey,
    blockBackgroundByKey
  };
})(window);
