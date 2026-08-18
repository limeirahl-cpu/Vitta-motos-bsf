import { Client, Motorcycle, WarrantyRuleConfig } from '../types';
import { addMonths, maskCpfCnpj, maskPhone, maskPlate } from './formatters';
import { DEFAULT_WARRANTY_RULES } from './warrantyCalculator';

export interface ParsedNfeVehicle {
  brand: string;
  model: string;
  year: number;
  color: string;
  chassis: string;
  engineNumber: string;
  plate: string;
  renavam: string;
  potency?: string;
  cylinderCapacity?: string;
  unitValue?: number;
}

export interface ParsedNfeClient {
  name: string;
  cpfCnpj: string;
  phone: string;
  email: string;
  cep: string;
  address: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface WarrantyMilestoneSchedule {
  revisionNumber: number;
  targetKm: number;
  maxDate: string; // YYYY-MM-DD
  description: string;
  toleranceKm: number;
  toleranceDays: number;
  status: 'PENDENTE' | 'PROXIMA';
}

export interface ParsedNfeData {
  id: string; // Unique temporary ID for review
  rawFileName?: string;
  invoiceNumber: string;
  series: string;
  invoiceDate: string; // YYYY-MM-DD (Data de Faturamento)
  accessKey?: string;
  totalInvoiceValue: number;
  client: ParsedNfeClient;
  vehicle: ParsedNfeVehicle;
  
  // Warranty configuration generated from billing date
  warrantyConfig: {
    startDate: string; // Data de Faturamento
    planMonths: number; // 12, 24 ou 36 meses
    firstRevisionKm: number; // 1000
    subsequentIntervalKm: number; // 3000
    intervalMonths: number; // 6
    alertDaysTolerance: number; // 30
    alertKmTolerance: number; // 500
    schedule: WarrantyMilestoneSchedule[];
  };

  // State in UI
  selected: boolean;
  clientExists?: boolean;
  existingClientId?: string;
  motoExists?: boolean;
}

/**
 * Generates full warranty schedule from invoice billing date
 */
export function generateWarrantySchedule(
  billingDate: string,
  planMonths: number = 24,
  rules: WarrantyRuleConfig = DEFAULT_WARRANTY_RULES
): WarrantyMilestoneSchedule[] {
  const milestones: WarrantyMilestoneSchedule[] = [];
  const totalRevisions = Math.max(2, Math.floor(planMonths / (rules.intervalMonths || 6)));

  for (let i = 1; i <= totalRevisions; i++) {
    const targetKm =
      i === 1
        ? rules.firstRevisionKm
        : rules.firstRevisionKm + (i - 1) * rules.subsequentIntervalKm;

    const monthsOffset = i * (rules.intervalMonths || 6);
    const maxDate = addMonths(billingDate, monthsOffset);

    milestones.push({
      revisionNumber: i,
      targetKm,
      maxDate,
      description: `${i}ª Revisão Periódica de Garantia (${targetKm} km ou ${monthsOffset} meses)`,
      toleranceKm: rules.alertKmTolerance,
      toleranceDays: rules.alertDaysTolerance,
      status: i === 1 ? 'PROXIMA' : 'PENDENTE',
    });
  }

  return milestones;
}

/**
 * Helper to get clean text from an XML element tag
 */
function getTagText(parent: Element | Document, tagName: string): string {
  const el = parent.getElementsByTagName(tagName)[0];
  return el?.textContent?.trim() || '';
}

/**
 * Extracts a date from SEFAZ format (e.g. 2026-08-15T14:30:00-03:00 or 2026-08-15)
 */
function extractIsoDate(rawDate: string): string {
  if (!rawDate) return new Date().toISOString().split('T')[0];
  const match = rawDate.match(/^\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];
  try {
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch {
    // fallback
  }
  return new Date().toISOString().split('T')[0];
}

/**
 * Formats Shineray model description cleanly
 */
function cleanModelDescription(desc: string): string {
  if (!desc) return 'Shineray Moto 0km';
  let cleaned = desc
    .replace(/^MOTOCICLETA\s+/i, '')
    .replace(/^MOTO\s+/i, '')
    .replace(/^CICLOMOTOR\s+/i, '')
    .replace(/\s+ZERO\s*KM/i, '')
    .replace(/\s+0KM/i, '')
    .trim();

  // If starts with Shineray, normalize
  if (!cleaned.toUpperCase().startsWith('SHINERAY') && !cleaned.toUpperCase().startsWith('SH')) {
    cleaned = `Shineray ${cleaned}`;
  }
  return cleaned;
}

/**
 * Parses XML text of a Brazilian NF-e (Modelo 55 ou 65)
 */
export function parseNfeXml(xmlString: string, fileName?: string): ParsedNfeData[] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

  // Check for parser errors
  const parseError = xmlDoc.getElementsByTagName('parsererror');
  if (parseError.length > 0) {
    throw new Error('O arquivo selecionado não contém um formato XML válido.');
  }

  const results: ParsedNfeData[] = [];

  // Find all infNFe nodes (handles single NF-e or batch of NF-e)
  const infNFeNodes = xmlDoc.getElementsByTagName('infNFe');
  const targetNodes = infNFeNodes.length > 0 ? Array.from(infNFeNodes) : [xmlDoc.documentElement];

  targetNodes.forEach((node, nodeIdx) => {
    // 1. Ide (Identificação da Nota)
    const ide = node.getElementsByTagName('ide')[0];
    const nNF = ide ? getTagText(ide, 'nNF') : getTagText(node, 'nNF') || `NF-${Date.now()}`;
    const serie = ide ? getTagText(ide, 'serie') : getTagText(node, 'serie') || '1';
    const dhEmiRaw = ide
      ? getTagText(ide, 'dhEmi') || getTagText(ide, 'dEmi') || getTagText(ide, 'dhSaiEnt')
      : getTagText(node, 'dhEmi') || getTagText(node, 'dEmi');
    const invoiceDate = extractIsoDate(dhEmiRaw);

    // Chave de acesso
    const infNFeId = node.getAttribute('Id') || '';
    const accessKey = infNFeId.replace(/^NFe/i, '') || getTagText(node, 'chNFe') || '';

    // Total da Nota
    const totalEl = node.getElementsByTagName('total')[0];
    const vNFStr = totalEl ? getTagText(totalEl, 'vNF') : getTagText(node, 'vNF');
    const totalInvoiceValue = parseFloat(vNFStr) || 0;

    // 2. Destinatário (Cliente)
    const dest = node.getElementsByTagName('dest')[0];
    let clientName = 'Cliente Não Identificado';
    let cpfCnpj = '';
    let phone = '';
    let email = '';
    let cep = '29800-000';
    let address = 'Centro';
    let number = 'S/N';
    let complement = '';
    let neighborhood = 'Centro';
    let city = 'Barra de São Francisco';
    let state = 'ES';

    if (dest) {
      clientName = getTagText(dest, 'xNome') || clientName;
      cpfCnpj = getTagText(dest, 'CPF') || getTagText(dest, 'CNPJ') || '';
      email = getTagText(dest, 'email') || '';

      const enderDest = dest.getElementsByTagName('enderDest')[0];
      if (enderDest) {
        address = getTagText(enderDest, 'xLgr') || address;
        number = getTagText(enderDest, 'nro') || number;
        complement = getTagText(enderDest, 'xCpl') || '';
        neighborhood = getTagText(enderDest, 'xBairro') || neighborhood;
        city = getTagText(enderDest, 'xMun') || city;
        state = getTagText(enderDest, 'UF') || state;
        cep = getTagText(enderDest, 'CEP') || cep;
        phone = getTagText(enderDest, 'fone') || phone;
      }
    }

    // 3. Detalhes dos Itens / Veículos
    const detNodes = Array.from(node.getElementsByTagName('det'));

    detNodes.forEach((det, detIdx) => {
      const prod = det.getElementsByTagName('prod')[0] || det;
      const xProd = getTagText(prod, 'xProd') || 'Motocicleta Shineray 0km';
      const vProdStr = getTagText(prod, 'vProd');
      const vProd = parseFloat(vProdStr) || totalInvoiceValue;

      // Veículo novo (veicProd)
      const veicProd = prod.getElementsByTagName('veicProd')[0];

      let chassis = '';
      let engineNumber = '';
      let color = 'Vermelha';
      let year = new Date().getFullYear();
      let plate = '';
      let renavam = '';
      let potency = '';
      let cylinderCapacity = '';

      if (veicProd) {
        chassis = getTagText(veicProd, 'chassi');
        engineNumber = getTagText(veicProd, 'nMotor');
        color = getTagText(veicProd, 'xCor') || color;
        const anoModStr = getTagText(veicProd, 'anoMod');
        if (anoModStr) year = parseInt(anoModStr, 10);
        plate = getTagText(veicProd, 'placa');
        renavam = getTagText(veicProd, 'RENAVAM');
        potency = getTagText(veicProd, 'pot');
        cylinderCapacity = getTagText(veicProd, 'cilin');
      } else {
        // Fallback regex search on xProd / infAdProd
        const infAdProd = getTagText(det, 'infAdProd') + ' ' + xProd;
        const chassiMatch = infAdProd.match(/CHASS?I?[:\s]+([A-HJ-NPR-Z0-9]{17})/i);
        if (chassiMatch) chassis = chassiMatch[1];

        const motorMatch = infAdProd.match(/MOTOR[:\s]+([A-Z0-9-]+)/i);
        if (motorMatch) engineNumber = motorMatch[1];

        const corMatch = infAdProd.match(/COR[:\s]+([A-Za-zÀ-ÿ]+)/i);
        if (corMatch) color = corMatch[1];

        const anoMatch = infAdProd.match(/ANO[:\s]+(\d{4})/i);
        if (anoMatch) year = parseInt(anoMatch[1], 10);

        const placaMatch = infAdProd.match(/PLACA[:\s]+([A-Z0-9-]{7,8})/i);
        if (placaMatch) plate = placaMatch[1];
      }

      // Generate chassis fallback if not present in test files
      if (!chassis) {
        chassis = `9C2SH${nNF.padStart(6, '0')}NR${String(Date.now()).slice(-6)}`;
      }

      // Generate engine number fallback if not present
      if (!engineNumber) {
        engineNumber = `SH125-${nNF.padStart(6, '0')}`;
      }

      // Generate plate fallback if not registered yet
      if (!plate) {
        const hashLetters = 'SHI';
        const hashNum = String(nNF).slice(-3).padStart(3, '0');
        const hashChar = 'A';
        plate = `${hashLetters}${hashNum[0] || '8'}${hashChar}${hashNum.slice(1)}`;
      }

      // Model Name
      const model = cleanModelDescription(xProd);

      // Brand - strictly Shineray
      const brand = 'Shineray';

      // Warranty schedule generated from billing date
      const warrantyPlanMonths = 24; // 2 anos de fábrica padrão Shineray
      const warrantySchedule = generateWarrantySchedule(
        invoiceDate,
        warrantyPlanMonths,
        DEFAULT_WARRANTY_RULES
      );

      results.push({
        id: `nfe-item-${nodeIdx}-${detIdx}-${Date.now()}`,
        rawFileName: fileName,
        invoiceNumber: nNF,
        series: serie,
        invoiceDate,
        accessKey,
        totalInvoiceValue: vProd || totalInvoiceValue,
        client: {
          name: clientName,
          cpfCnpj: maskCpfCnpj(cpfCnpj),
          phone: maskPhone(phone || '27999887766'),
          email: email || '',
          cep,
          address,
          number,
          complement,
          neighborhood,
          city,
          state,
        },
        vehicle: {
          brand,
          model,
          year,
          color,
          chassis: chassis.toUpperCase(),
          engineNumber: engineNumber.toUpperCase(),
          plate: maskPlate(plate),
          renavam,
          potency,
          cylinderCapacity,
          unitValue: vProd,
        },
        warrantyConfig: {
          startDate: invoiceDate,
          planMonths: warrantyPlanMonths,
          firstRevisionKm: DEFAULT_WARRANTY_RULES.firstRevisionKm,
          subsequentIntervalKm: DEFAULT_WARRANTY_RULES.subsequentIntervalKm,
          intervalMonths: DEFAULT_WARRANTY_RULES.intervalMonths,
          alertDaysTolerance: DEFAULT_WARRANTY_RULES.alertDaysTolerance,
          alertKmTolerance: DEFAULT_WARRANTY_RULES.alertKmTolerance,
          schedule: warrantySchedule,
        },
        selected: true,
      });
    });
  });

  return results;
}

/**
 * Pre-defined Shineray sample invoices for quick 1-click test import
 */
export const SAMPLE_SHINERAY_NFES: { name: string; description: string; xml: string }[] = [
  {
    name: 'NF-e 8491 - Shineray SH 125 Worker (Faturamento Hoje)',
    description: 'Venda 0km de SH 125 Worker Vermelha para Marcos Silva com garantia de 24 meses',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNFe Id="NFe32260854315550000200550010000084911000849110">
      <ide>
        <cUF>32</cUF>
        <nNF>8491</nNF>
        <serie>1</serie>
        <dhEmi>${new Date().toISOString()}</dhEmi>
        <tpNF>1</tpNF>
      </ide>
      <emit>
        <CNPJ>54315550000200</CNPJ>
        <xNome>VITTA COMERCIO DE VEICULOS LTDA</xNome>
        <xFant>VITTA MOTOS SHINERAY</xFant>
      </emit>
      <dest>
        <CPF>12849201948</CPF>
        <xNome>MARCOS ANTONIO SILVA</xNome>
        <enderDest>
          <xLgr>AVENIDA EDVALDO RESENDE</xLgr>
          <nro>450</nro>
          <xBairro>CENTRO</xBairro>
          <cMun>3200803</cMun>
          <xMun>BARRA DE SAO FRANCISCO</xMun>
          <UF>ES</UF>
          <CEP>29800000</CEP>
          <fone>27999887766</fone>
        </enderDest>
        <email>marcos.silva@email.com</email>
      </dest>
      <det nItem="1">
        <prod>
          <cProd>MOTO-SH-WORKER</cProd>
          <xProd>MOTOCICLETA SHINERAY SH 125 WORKER ZERO KM</xProd>
          <NCM>87112010</NCM>
          <vProd>8990.00</vProd>
          <veicProd>
            <tpOp>1</tpOp>
            <chassi>9C2SH1250NR008491</chassi>
            <cCor>01</cCor>
            <xCor>VERMELHO</xCor>
            <pot>9.5</pot>
            <cilin>125</cilin>
            <nMotor>SH125-998811</nMotor>
            <anoMod>2026</anoMod>
            <anoFab>2026</anoFab>
            <placa>SHI8A49</placa>
            <RENAVAM>12839401928</RENAVAM>
          </veicProd>
        </prod>
      </det>
      <total>
        <ICMSTot>
          <vNF>8990.00</vNF>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
</nfeProc>`,
  },
  {
    name: 'NF-e 8492 - Shineray Jet 125 2X (Faturamento Recente)',
    description: 'Venda 0km de Jet 125 2X Preta para Camila Duarte com garantia e revisões',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNFe Id="NFe32260854315550000200550010000084921000849220">
      <ide>
        <cUF>32</cUF>
        <nNF>8492</nNF>
        <serie>1</serie>
        <dhEmi>${new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()}</dhEmi>
        <tpNF>1</tpNF>
      </ide>
      <emit>
        <CNPJ>54315550000200</CNPJ>
        <xNome>VITTA COMERCIO DE VEICULOS LTDA</xNome>
        <xFant>VITTA MOTOS SHINERAY</xFant>
      </emit>
      <dest>
        <CPF>55489102938</CPF>
        <xNome>CAMILA DUARTE PEREIRA</xNome>
        <enderDest>
          <xLgr>RUA JOAQUIM TEIXEIRA</xLgr>
          <nro>112</nro>
          <xBairro>IRMAOS FERNANDES</xBairro>
          <cMun>3200803</cMun>
          <xMun>BARRA DE SAO FRANCISCO</xMun>
          <UF>ES</UF>
          <CEP>29800000</CEP>
          <fone>27997654321</fone>
        </enderDest>
        <email>camila.duarte@gmail.com</email>
      </dest>
      <det nItem="1">
        <prod>
          <cProd>MOTO-JET-125</cProd>
          <xProd>MOTOCICLETA SHINERAY JET 125 2X ZERO KM</xProd>
          <NCM>87112010</NCM>
          <vProd>10490.00</vProd>
          <veicProd>
            <tpOp>1</tpOp>
            <chassi>9C2JET125NR008492</chassi>
            <cCor>02</cCor>
            <xCor>PRETA</xCor>
            <pot>8.0</pot>
            <cilin>125</cilin>
            <nMotor>JET125-776655</nMotor>
            <anoMod>2026</anoMod>
            <anoFab>2026</anoFab>
            <placa>JET8B92</placa>
            <RENAVAM>13940192847</RENAVAM>
          </veicProd>
        </prod>
      </det>
      <total>
        <ICMSTot>
          <vNF>10490.00</vNF>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
</nfeProc>`,
  },
  {
    name: 'NF-e 8493 - Shineray Storm 200 EFI (Lote Especial)',
    description: 'Venda de Storm 200 EFI Cinza Chumbo para Rodrigo Barbosa',
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNFe Id="NFe32260854315550000200550010000084931000849330">
      <ide>
        <cUF>32</cUF>
        <nNF>8493</nNF>
        <serie>1</serie>
        <dhEmi>${new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString()}</dhEmi>
        <tpNF>1</tpNF>
      </ide>
      <emit>
        <CNPJ>54315550000200</CNPJ>
        <xNome>VITTA COMERCIO DE VEICULOS LTDA</xNome>
        <xFant>VITTA MOTOS SHINERAY</xFant>
      </emit>
      <dest>
        <CPF>88392019482</CPF>
        <xNome>RODRIGO BARBOSA FAGUNDES</xNome>
        <enderDest>
          <xLgr>RUA DESEMBARGADOR FERREIRA</xLgr>
          <nro>88</nro>
          <xBairro>VILA LANDINHA</xBairro>
          <cMun>3200803</cMun>
          <xMun>BARRA DE SAO FRANCISCO</xMun>
          <UF>ES</UF>
          <CEP>29800000</CEP>
          <fone>27988112233</fone>
        </enderDest>
        <email>rodrigo.barbosa@hotmail.com</email>
      </dest>
      <det nItem="1">
        <prod>
          <cProd>MOTO-STORM-200</cProd>
          <xProd>MOTOCICLETA SHINERAY STORM 200 EFI ABS</xProd>
          <NCM>87112020</NCM>
          <vProd>18990.00</vProd>
          <veicProd>
            <tpOp>1</tpOp>
            <chassi>9C2STM200NR008493</chassi>
            <cCor>03</cCor>
            <xCor>CINZA FOSCO</xCor>
            <pot>20.4</pot>
            <cilin>200</cilin>
            <nMotor>STM200-443322</nMotor>
            <anoMod>2026</anoMod>
            <anoFab>2026</anoFab>
            <placa>STM8C93</placa>
            <RENAVAM>14019283746</RENAVAM>
          </veicProd>
        </prod>
      </det>
      <total>
        <ICMSTot>
          <vNF>18990.00</vNF>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
</nfeProc>`,
  },
];
