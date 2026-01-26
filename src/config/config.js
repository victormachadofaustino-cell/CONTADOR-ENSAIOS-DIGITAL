/**
 * CONFIGURAÇÃO MESTRE DO ECOSSISTEMA
 * Este arquivo define as diretrizes globais de fallback e segurança.
 */

// Identidade do Administrador Supremo
export const MASTER_EMAIL = "victormachadofaustino@gmail.com";

// Neutralização Geográfica: Removido localidade fixa para evitar conflitos de jurisdição
export const LOCALIDADE_PADRAO = "Selecionar Localidade...";

/**
 * MATRIZ NACIONAL DE INSTRUMENTOS (Blueprint)
 * Utilizada para popular novas comuns com o padrão oficial da orquestra.
 * Saneado para cobrir todas as 166 comuns com precisão técnica.
 * * ATENÇÃO: IDs foram saneados (removido _) para compatibilidade total com 
 * o motor de busca e as regras de segurança v2.1.
 */
export const DEFAULT_INSTRUMENTS = {
    'Orquestra': [
        // CORDAS
        { id: 'violino', name: 'Violinos', section: 'Cordas' },
        { id: 'viola', name: 'Violas', section: 'Cordas' },
        { id: 'violoncelo', name: 'Violoncelos', section: 'Cordas' },
        
        // MADEIRAS
        { id: 'flauta', name: 'Flautas', section: 'Madeiras' },
        { id: 'clarinete', name: 'Clarinetes', section: 'Madeiras' },
        { id: 'oboe', name: 'Oboés', section: 'Madeiras' },
        { id: 'fagote', name: 'Fagotes', section: 'Madeiras' },
        
        // SAXOFONES
        { id: 'saxalto', name: 'Sax Alto', section: 'Saxofones' },
        { id: 'saxtenor', name: 'Sax Tenor', section: 'Saxofones' },
        { id: 'saxsoprano', name: 'Sax Soprano', section: 'Saxofones' },
        { id: 'saxbaritono', name: 'Sax Barítono', section: 'Saxofones' },
        
        // METAIS
        { id: 'trompete', name: 'Trompetes', section: 'Metais' },
        { id: 'trombone', name: 'Trombones', section: 'Metais' },
        { id: 'trompa', name: 'Trompas', section: 'Metais' },
        { id: 'eufonio', name: 'Eufônios', section: 'Metais' },
        { id: 'tuba', name: 'Tubas', section: 'Metais' },
        
        // TECLAS & OUTROS
        { id: 'orgao', name: 'Organistas', section: 'Organistas' },
        { id: 'acordeon', name: 'Acordeons', section: 'Teclas' }
    ]
};

/**
 * CONFIGURAÇÕES DE GOVERNANÇA
 */
export const APP_CONFIG = {
    versao: "2.1.0",
    ambiente: "producao",
    timeout_sincronizacao: 10000, // 10 segundos
    limite_eventos_lista: 20 // Máximo de ensaios exibidos por vez na tela inicial
};