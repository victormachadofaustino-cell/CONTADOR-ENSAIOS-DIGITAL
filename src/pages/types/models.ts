// src/types/models.ts
export type UserRole = 'Secretário da Música' | 'Encarregado Regional' | 'Encarregado Local' | 'Examinadora' | 'Instrutor' | 'Músico' | 'Organista' | 'Candidato';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  comum: string;
  comumId: string;
  cidadeId: string;
  regionalId: string;
  approved: boolean;
  disabled: boolean;
  isMaster: boolean;
  isComissao?: boolean;
  escopoRegional?: boolean;
  escopoCidade?: boolean;
  escopoLocal?: boolean;
  createdAt: number;
}

export interface Visitante {
  id: number;
  nome: string;
  min: string;
  inst: string;
  bairro: string;
  cidadeUf: string;
  contato: string;
  dataEnsaio: string;
  hora: string;
}