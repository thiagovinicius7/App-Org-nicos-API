export interface Crop {
  id?: string;
  nome: string;
  cientifico: string;
  dias: number;
  duracao: number;
}

export interface Purchase {
  id: string; // e.g., COMP-YYMMDD-RAND
  docId?: string; // Firestore document ID
  data: string; // YYYY-MM-DD
  fornecedor: string;
  nf: string;
  tipo: "Muda" | "Semente";
  cultura: string;
  quantidade: number;
  saldo: number;
  status: "Ativo" | "Esgotado" | string;
}

export interface Planting {
  id: string; // e.g., PLAN-YYMMDD-RAND
  idLote: string; // purchase id
  data: string; // YYYY-MM-DD
  cultura: string;
  tipo: "Muda" | "Semente" | "Perene";
  talhao: string;
  quantidade: number;
  previsao: string; // estimated first harvest YYYY-MM-DD or DD/MM/YYYY
  status: "No campo" | "Esperando colheita" | "Colhendo" | "Finalizado";
  totalColhido: number;
  unidade: string; // "Unidades" or "m²"
  aduboQt?: number;
  aduboComp?: string;
  dataFim?: string | null;
  perdas?: number;
  obs?: string;
}

export interface Harvest {
  id?: string;
  idSessao: string;
  idPlantio: string;
  data: string; // YYYY-MM-DD
  cultura: string;
  talhao: string;
  qtd: number;
}

export interface WeatherDay {
  data: string; // DD/MM
  max: number;
  min: number;
  chuvaProb: number;
  chuvaMm: number;
}

export interface SystemMetadata {
  id?: string;
  seloValidade: string;
  seloVisita: string;
}
