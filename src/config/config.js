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
 */
export const DEFAULT_INSTRUMENTS = {
    'Orquestra': [
        // CORDAS
        { id: 'vln', name: 'Violinos', section: 'Cordas' },
        { id: 'vla', name: 'Violas', section: 'Cordas' },
        { id: 'vcl', name: 'Violoncelos', section: 'Cordas' },
        
        // MADEIRAS
        { id: 'flt', name: 'Flautas', section: 'Madeiras' },
        { id: 'clt', name: 'Clarinetes', section: 'Madeiras' },
        { id: 'oboe', name: 'Oboés', section: 'Madeiras' },
        { id: 'fgt', name: 'Fagotes', section: 'Madeiras' },
        
        // SAXOFONES
        { id: 'sax_alto', name: 'Sax Alto', section: 'Saxofones' },
        { id: 'sax_tenor', name: 'Sax Tenor', section: 'Saxofones' },
        { id: 'sax_soprano', name: 'Sax Soprano', section: 'Saxofones' },
        { id: 'sax_baritono', name: 'Sax Barítono', section: 'Saxofones' },
        
        // METAIS
        { id: 'tpt', name: 'Trompetes', section: 'Metais' },
        { id: 'tbn', name: 'Trombones', section: 'Metais' },
        { id: 'trp', name: 'Trompas', section: 'Metais' },
        { id: 'euf', name: 'Eufônios', section: 'Metais' },
        { id: 'tub', name: 'Tubas', section: 'Metais' },
        
        // TECLAS & OUTROS
        { id: 'org', name: 'Organistas', section: 'Organistas' },
        { id: 'acd', name: 'Acordeons', section: 'Teclas' }
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