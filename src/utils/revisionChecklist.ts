// Checklist técnico de revisão de garantia, organizado pelas mesmas
// categorias usadas nos manuais oficiais Shineray/SBM (sistema de
// combustível/aceleração, cabeçote/válvulas, embreagem, rodas/pneus,
// transmissão final, suspensão, freios, direção, elétrica e itens gerais).
// É um checklist único aplicado a qualquer revisão de garantia - não é
// específico por modelo (a linha Shineray/SBM tem dezenas de modelos com
// pequenas variações), mas cobre os mesmos pontos de verificação que
// aparecem consistentemente nos manuais reais.

export interface ChecklistItem {
  id: string;
  label: string;
  action: 'Verificar' | 'Ajustar' | 'Substituir' | 'Lubrificar' | 'Limpar';
}

export interface ChecklistCategory {
  category: string;
  items: ChecklistItem[];
}

export const REVISION_CHECKLIST_TEMPLATE: ChecklistCategory[] = [
  {
    category: 'Motor e Sistema de Alimentação',
    items: [
      { id: 'oleo-motor', label: 'Óleo do motor', action: 'Substituir' },
      { id: 'filtro-oleo', label: 'Filtro/tela de óleo', action: 'Limpar' },
      { id: 'acelerador', label: 'Funcionamento e folga do acelerador', action: 'Verificar' },
      { id: 'marcha-lenta', label: 'Rotação de marcha lenta', action: 'Verificar' },
      { id: 'vazamento-combustivel', label: 'Vazamentos no sistema de combustível', action: 'Verificar' },
      { id: 'filtro-ar', label: 'Elemento filtrante do filtro de ar', action: 'Limpar' },
      { id: 'vela-ignicao', label: 'Vela de ignição (folga entre eletrodos)', action: 'Ajustar' },
    ],
  },
  {
    category: 'Cabeçote e Válvulas',
    items: [
      { id: 'folga-valvulas', label: 'Folga das válvulas de admissão e escape', action: 'Verificar' },
      { id: 'admissao-ar', label: 'Sistema de admissão de ar (danos)', action: 'Verificar' },
    ],
  },
  {
    category: 'Embreagem',
    items: [
      { id: 'embreagem-func', label: 'Funcionamento, desengate e fechamento', action: 'Verificar' },
      { id: 'embreagem-curso', label: 'Curso livre do manípulo da embreagem', action: 'Ajustar' },
    ],
  },
  {
    category: 'Rodas, Pneus e Transmissão Final',
    items: [
      { id: 'pressao-pneus', label: 'Pressão dos pneus', action: 'Verificar' },
      { id: 'desgaste-pneus', label: 'Desgaste da banda de rodagem', action: 'Verificar' },
      { id: 'rolamentos-roda', label: 'Rolamentos das rodas', action: 'Verificar' },
      { id: 'corrente-lubrif', label: 'Lubrificação da corrente de transmissão', action: 'Lubrificar' },
      { id: 'corrente-folga', label: 'Folga da corrente de transmissão (10-20mm)', action: 'Ajustar' },
      { id: 'coroa-pinhao', label: 'Desgaste da coroa e do pinhão', action: 'Verificar' },
    ],
  },
  {
    category: 'Suspensão',
    items: [
      { id: 'susp-diant', label: 'Funcionamento do garfo dianteiro (curso suave)', action: 'Verificar' },
      { id: 'susp-tras', label: 'Funcionamento do amortecedor traseiro', action: 'Verificar' },
      { id: 'susp-vazamento', label: 'Vazamento de óleo na suspensão', action: 'Verificar' },
      { id: 'braco-oscilante', label: 'Funcionamento do braço oscilante', action: 'Verificar' },
    ],
  },
  {
    category: 'Freios',
    items: [
      { id: 'fluido-freio', label: 'Nível do fluido de freio (DOT4)', action: 'Verificar' },
      { id: 'pastilhas-freio', label: 'Desgaste das pastilhas de freio', action: 'Verificar' },
      { id: 'mangueiras-freio', label: 'Mangueiras de freio (vazamento/rachaduras)', action: 'Verificar' },
      { id: 'freio-func', label: 'Eficácia e funcionamento dos freios', action: 'Verificar' },
      { id: 'luz-freio', label: 'Interruptor da luz de freio', action: 'Verificar' },
    ],
  },
  {
    category: 'Direção e Sistema Elétrico',
    items: [
      { id: 'folga-direcao', label: 'Folga da direção/guidão', action: 'Verificar' },
      { id: 'luzes', label: 'Funcionamento de luzes e interruptores', action: 'Verificar' },
      { id: 'farol', label: 'Precisão/foco do farol dianteiro', action: 'Verificar' },
      { id: 'bateria', label: 'Carga e terminais da bateria', action: 'Verificar' },
      { id: 'cavalete-lateral', label: 'Interruptor do cavalete lateral', action: 'Verificar' },
    ],
  },
  {
    category: 'Geral',
    items: [
      { id: 'aperto-geral', label: 'Aperto geral de parafusos e porcas do chassi', action: 'Verificar' },
      { id: 'teste-rodagem', label: 'Teste de rodagem após os ajustes', action: 'Verificar' },
    ],
  },
];

export function flattenChecklistLabels(): string[] {
  return REVISION_CHECKLIST_TEMPLATE.flatMap((cat) => cat.items.map((i) => `${i.action} - ${i.label}`));
}
