(function (global) {
  'use strict';

  const blocksApi = global.RBM_BLOCKS;

  function fallbackId(prefix) {
    return `${prefix || 'id'}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function block(type, data) {
    if (blocksApi && typeof blocksApi.make === 'function') {
      const created = blocksApi.make(type);
      created.data = Object.assign({}, created.data, data || {});
      return created;
    }
    return { id: fallbackId('block'), type, data: data || {} };
  }

  function page(title, pageBlocks, extra) {
    const base = blocksApi && typeof blocksApi.page === 'function'
      ? blocksApi.page({ title, blocks: pageBlocks || [] })
      : { id: fallbackId('page'), title, blocks: pageBlocks || [] };
    return Object.assign(base, extra || {});
  }

  const templates = [
    {
      id: 'provisoes_ferias_13',
      name: 'Provisões de 13º e Férias',
      description: 'Modelo cliente com capa, explicação, vantagens e botões.',
      create() {
        return {
          meta: {
            title: 'Provisões de 13º e Férias',
            subtitle: 'Organização mensal para evitar surpresas no caixa da empresa.',
            layout: 'boxed',
            accent: '#C8A24A',
            background: '#FFFFFF',
            logo: 'https://rbmgroupassessoria.com.br/wp-content/uploads/2025/05/Logo-RBM.webp',
            footer: 'RBM Contabilidade | Informativo ao cliente',
            showHeader: true,
            showFooter: true
          },
          pages: [
            page('Capa', [
              block('cover', {
                eyebrow: 'INFORMATIVO RBM',
                title: 'Provisões de 13º e Férias',
                subtitle: 'Uma forma simples de acompanhar mensalmente os valores que a empresa deve reservar para obrigações trabalhistas futuras.',
                imageUrl: '',
                imageOpacity: 100,
                colorKey: 'gold',
                bgKey: 'goldSoft'
              }),
              block('highlight', {
                title: 'Por que acompanhar mensalmente?',
                text: 'As provisões mostram, mês a mês, o valor estimado de 13º salário, férias e encargos. Isso ajuda a empresa a se organizar financeiramente antes dos períodos de maior desembolso.',
                colorKey: 'gold',
                bgKey: 'soft',
                style: 'soft'
              }),
              block('columns', {
                title: 'Vantagens para a empresa',
                count: 3,
                columns: [
                  { title: 'Previsibilidade', text: 'Ajuda a enxergar os compromissos futuros com antecedência.' },
                  { title: 'Controle de caixa', text: 'Evita que férias e 13º impactem o financeiro de surpresa.' },
                  { title: 'Gestão trabalhista', text: 'Facilita decisões e acompanhamento dos custos com pessoal.' }
                ],
                colorKey: 'gold',
                bgKey: 'white'
              })
            ]),
            page('Detalhes', [
              block('title', {
                title: 'Como será enviado',
                subtitle: 'O relatório poderá ser encaminhado mensalmente junto com as rotinas da folha de pagamento.',
                level: 'h2',
                colorKey: 'gold',
                bgKey: 'white'
              }),
              block('paragraph', {
                text: 'A provisão não é uma guia para pagamento imediato. Ela funciona como um controle gerencial, demonstrando valores estimados que tendem a ser pagos futuramente, conforme férias, 13º salário e encargos incidentes.'
              }),
              block('checklist', {
                title: 'O relatório pode demonstrar',
                items: [
                  'Valor estimado de 13º salário acumulado no período.',
                  'Valor estimado de férias proporcionais e adicionais.',
                  'Encargos vinculados às provisões, quando aplicável.',
                  'Resumo por empregado e total geral da empresa.'
                ],
                colorKey: 'gold',
                bgKey: 'white'
              }),
              block('buttons', {
                title: 'Deseja receber esse acompanhamento?',
                colorKey: 'blue',
                buttons: [
                  { label: 'Quero receber mensalmente', url: '#', style: 'primary' },
                  { label: 'Tirar dúvidas', url: '#', style: 'secondary' }
                ]
              })
            ])
          ]
        };
      }
    },
    {
      id: 'comunicado_curto',
      name: 'Comunicado curto RBM',
      description: 'Modelo rápido para avisos objetivos de folha, prazo ou orientação.',
      create() {
        return {
          meta: {
            title: 'Comunicado aos Clientes',
            subtitle: 'Orientação importante para manter os processos em dia.',
            layout: 'boxed',
            accent: '#C8A24A',
            background: '#FFFFFF',
            logo: 'https://rbmgroupassessoria.com.br/wp-content/uploads/2025/05/Logo-RBM.webp',
            footer: 'RBM Contabilidade | Comunicado',
            showHeader: true,
            showFooter: true
          },
          pages: [
            page('Comunicado', [
              block('title', {
                title: 'Comunicado importante',
                subtitle: 'Use este espaço para explicar o assunto principal em poucas linhas.',
                level: 'h1',
                colorKey: 'gold',
                bgKey: 'white'
              }),
              block('paragraph', {
                text: 'Prezado cliente,\n\nInformamos que este é um modelo de comunicado curto. Substitua este texto pela orientação desejada, mantendo frases objetivas, linguagem clara e boa separação visual.'
              }),
              block('highlight', {
                title: 'Atenção ao prazo',
                text: 'Insira aqui a data, o prazo ou a ação necessária do cliente.',
                colorKey: 'gold',
                bgKey: 'soft',
                style: 'soft'
              }),
              block('buttons', {
                title: 'Ações',
                buttons: [
                  { label: 'Confirmar recebimento', url: '#', style: 'primary' },
                  { label: 'Falar com a RBM', url: '#', style: 'secondary' }
                ]
              })
            ])
          ]
        };
      }
    },
    {
      id: 'fundo_total',
      name: 'Modelo fundo total',
      description: 'Página com fundo colorido/visual preenchido para peças mais fortes.',
      create() {
        return {
          meta: {
            title: 'Informativo Visual',
            subtitle: 'Modelo com fundo total e blocos em destaque.',
            layout: 'full',
            accent: '#C8A24A',
            background: '#F4F7FA',
            logo: 'https://rbmgroupassessoria.com.br/wp-content/uploads/2025/05/Logo-RBM.webp',
            footer: 'RBM Contabilidade | Material informativo',
            showHeader: true,
            showFooter: true
          },
          pages: [
            page('Página visual', [
              block('cover', {
                eyebrow: 'RBM CONTABILIDADE',
                title: 'Título forte do informativo',
                subtitle: 'Use este modelo quando quiser uma página com mais presença visual e fundo preenchido.',
                imageUrl: '',
                imageOpacity: 100,
                colorKey: 'gold',
                bgKey: 'goldSoft'
              }),
              block('columns', {
                title: 'Resumo em etapas',
                count: 2,
                columns: [
                  { title: 'O que muda', text: 'Explique a mudança principal com linguagem simples.' },
                  { title: 'O que fazer', text: 'Mostre a ação recomendada para o cliente.' }
                ],
                colorKey: 'gold',
                bgKey: 'white'
              }),
              block('institution', {
                title: 'Orientação RBM',
                text: 'Nossa equipe acompanha as rotinas e orienta sobre os próximos passos necessários.'
              })
            ], { backgroundColor: '#F4F7FA', backgroundMode: 'gradient', backgroundOpacity: 100 })
          ]
        };
      }
    }
  ];

  global.RBM_TEMPLATES = {
    list: templates,
    get(id) {
      return templates.find((tpl) => tpl.id === id) || null;
    },
    create(id) {
      const tpl = this.get(id);
      return tpl ? tpl.create() : null;
    }
  };
})(window);
