import * as pdfjsLib from 'pdfjs-dist';
import { ParsedNfeData, generateWarrantySchedule } from './nfeParser';
import { maskCpfCnpj, maskPhone, maskPlate } from './formatters';
import { DEFAULT_WARRANTY_RULES } from './warrantyCalculator';

// Configure pdfjs worker for browser environment
if (typeof window !== 'undefined' && 'Worker' in window) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
  } catch {
    // fallback
  }
}

/**
 * Extracts plain text from a binary PDF ArrayBuffer
 */
export async function extractTextFromPdf(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true,
      disableFontFace: true,
    });

    const pdf = await loadingTask.promise;
    let fullText = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageStrings = textContent.items
        .map((item: any) => (item.str ? item.str : ''))
        .join(' ');
      fullText += `\n--- PÁGINA ${pageNum} ---\n` + pageStrings;
    }

    if (fullText.trim().length > 20) {
      return fullText;
    }
  } catch (err) {
    console.warn('pdfjs extraction notice, trying fallback text extractor:', err);
  }

  // Fallback raw text stream extractor for standard text-based PDFs
  try {
    const uint8 = new Uint8Array(arrayBuffer);
    const decoder = new TextDecoder('latin1');
    const rawContent = decoder.decode(uint8);

    // Extract text blocks inside stream ... endstream or (text) Tj
    const textMatches = rawContent.match(/\(([^)]+)\)\s*(?:Tj|'|"|TJ)/g);
    if (textMatches && textMatches.length > 0) {
      const extracted = textMatches
        .map((m) => m.replace(/^[('"]+|[)'"]+(?:Tj|'|"|TJ)?$/g, ''))
        .join(' ');
      if (extracted.trim().length > 30) {
        return extracted;
      }
    }
    return rawContent;
  } catch (fallbackErr) {
    console.error('Fallback PDF parser error:', fallbackErr);
    throw new Error('Não foi possível extrair o texto legível do arquivo PDF selecionado.');
  }
}

/**
 * Normalizes Shineray Model name from raw text
 */
function normalizeShinerayModel(text: string): string {
  const upper = text.toUpperCase();

  if (upper.includes('WORKER') || upper.includes('SH 125') || upper.includes('SH125')) {
    return 'Shineray SH 125 Worker';
  }
  if (upper.includes('JET 125 2X') || upper.includes('JET 125-2X') || upper.includes('JET 125')) {
    return 'Shineray Jet 125 2X';
  }
  if (upper.includes('JET 50') || upper.includes('JET50')) {
    return 'Shineray Jet 50';
  }
  if (upper.includes('STORM 200') || upper.includes('STORM200')) {
    return 'Shineray Storm 200 EFI';
  }
  if (upper.includes('PHOENIX') || upper.includes('FENIX')) {
    return 'Shineray Phoenix 50';
  }
  if (upper.includes('RIO 125') || upper.includes('RIO125')) {
    return 'Shineray Rio 125 EFI';
  }
  if (upper.includes('FREE 150') || upper.includes('FREE150')) {
    return 'Shineray Free 150 EFI';
  }
  if (upper.includes('URBAN 150') || upper.includes('URBAN150')) {
    return 'Shineray Urban 150';
  }
  if (upper.includes('TITANIUM 200') || upper.includes('TITANIUM')) {
    return 'Shineray Titanium 200';
  }
  if (upper.includes('SHE S') || upper.includes('SHE-S')) {
    return 'Shineray SHE S Elétrica';
  }
  if (upper.includes('PT4') || upper.includes('PT-4')) {
    return 'Shineray PT4 Scooter';
  }
  if (upper.includes('EXPLORER')) {
    return 'Shineray Explorer 150';
  }

  // Generic extraction
  const match = text.match(/MOTOCICLETA\s+([A-Z0-9\s-]+?)(?:ZERO|0KM|CHASSI|COR|$)/i);
  if (match && match[1]) {
    const raw = match[1].trim();
    return raw.toUpperCase().startsWith('SHINERAY') ? raw : `Shineray ${raw}`;
  }

  return 'Shineray Motocicleta 0km';
}

/**
 * Parses Brazilian DANFE text extracted from PDF and turns it into ParsedNfeData
 */
export function parseDanfePdfText(pdfText: string, fileName?: string): ParsedNfeData[] {
  const cleanText = pdfText.replace(/\s+/g, ' ');

  // 1. Chave de acesso (44 digits)
  let accessKey = '';
  const keyMatch = cleanText.match(/\b(\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4})\b/);
  if (keyMatch) {
    accessKey = keyMatch[1].replace(/\s+/g, '');
  } else {
    const keyMatchRaw = cleanText.match(/\b\d{44}\b/);
    if (keyMatchRaw) accessKey = keyMatchRaw[0];
  }

  // 2. Número da NF-e
  let invoiceNumber = '';
  const numMatch =
    cleanText.match(/N[ºo°.]\s*([0-9]{1,3}(?:\.[0-9]{3})*|[0-9]{1,9})/i) ||
    cleanText.match(/NF-e\s*N[ºo°.]?\s*([0-9.]+)/i) ||
    cleanText.match(/NOTA\s*FISCAL\s*(?:ELETR[OÔ]NICA)?\s*N[ºo°.]?\s*([0-9.]+)/i);

  if (numMatch && numMatch[1]) {
    invoiceNumber = numMatch[1].replace(/\./g, '');
  } else if (accessKey.length === 44) {
    invoiceNumber = String(parseInt(accessKey.substring(25, 34), 10));
  } else {
    invoiceNumber = String(Math.floor(1000 + Math.random() * 9000));
  }

  // 3. Série
  let series = '1';
  const serieMatch = cleanText.match(/S[EÉ]RIE[:\s]+([0-9]{1,3})/i);
  if (serieMatch) series = serieMatch[1];

  // 4. Data de Emissão / Faturamento
  let invoiceDate = new Date().toISOString().split('T')[0];
  const dateMatch =
    cleanText.match(/(?:DATA\s+(?:DA\s+)?EMISS[AÃ]O|EMISS[AÃ]O|DATA\s+ENTRADA\/SA[IÍ]DA)[:\s]+(\d{2}\/\d{2}\/\d{4})/i) ||
    cleanText.match(/(\d{2}\/\d{2}\/\d{4})/);

  if (dateMatch && dateMatch[1]) {
    const parts = dateMatch[1].split('/');
    if (parts.length === 3) {
      invoiceDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }

  // 5. Total da Nota Fiscal
  let totalInvoiceValue = 8990.0;
  const totalMatch =
    cleanText.match(/VALOR\s+TOTAL\s+(?:DA\s+NOTA|DOS\s+PRODUTOS)[:\s]+(?:R\$\s*)?([0-9.,]+)/i) ||
    cleanText.match(/V(?:ALOR)?\.?\s*TOTAL[:\s]+(?:R\$\s*)?([0-9.,]+)/i);

  if (totalMatch && totalMatch[1]) {
    const cleanVal = totalMatch[1].replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(cleanVal);
    if (!isNaN(parsed) && parsed > 0) totalInvoiceValue = parsed;
  }

  // 6. Dados do Destinatário / Cliente
  let clientName = 'Cliente Não Identificado';
  let cpfCnpj = '';
  let phone = '(27) 99988-7766';
  let email = '';
  let address = 'Avenida Principal';
  let number = 'S/N';
  let neighborhood = 'Centro';
  let city = 'Barra de São Francisco';
  let state = 'ES';
  let cep = '29800-000';

  // CPF or CNPJ
  const cpfMatch = cleanText.match(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/);
  const cnpjMatch = cleanText.match(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/);
  if (cpfMatch) cpfCnpj = cpfMatch[0];
  else if (cnpjMatch) cpfCnpj = cnpjMatch[0];

  // Client name
  const nameMatch =
    cleanText.match(/(?:DESTINAT[AÁ]RIO\s*\/\s*REMETENTE|NOME\s*\/\s*RAZ[AÃ]O\s*SOCIAL)[:\s]+([A-ZÀ-ÿ\s]{4,60}?)(?:CNPJ|CPF|ENDERE[CÇ]O|DATA|$)/i) ||
    cleanText.match(/CLIENTE[:\s]+([A-ZÀ-ÿ\s]{4,50})/i);

  if (nameMatch && nameMatch[1]) {
    const candidate = nameMatch[1].trim();
    if (!candidate.toUpperCase().includes('VITTA') && !candidate.toUpperCase().includes('SHINERAY')) {
      clientName = candidate;
    }
  }

  // Address
  const addrMatch = cleanText.match(/ENDERE[CÇ]O[:\s]+([A-Z0-9À-ÿ\s,.-]{5,60}?)(?:BAIRRO|N[UÚ]MERO|CEP|MUNIC[IÍ]PIO|$)/i);
  if (addrMatch && addrMatch[1]) {
    address = addrMatch[1].trim();
  }

  const neighMatch = cleanText.match(/BAIRRO\s*(?:\/\s*DISTRITO)?[:\s]+([A-Z0-9À-ÿ\s]{3,35}?)(?:MUNIC[IÍ]PIO|CEP|UF|$)/i);
  if (neighMatch && neighMatch[1]) {
    neighborhood = neighMatch[1].trim();
  }

  const cityMatch = cleanText.match(/MUNIC[IÍ]PIO[:\s]+([A-Z0-9À-ÿ\s]{3,35}?)(?:UF|FONE|TELEFONE|$)/i);
  if (cityMatch && cityMatch[1]) {
    city = cityMatch[1].trim();
  }

  const ufMatch = cleanText.match(/\bUF[:\s]+([A-Z]{2})\b/i);
  if (ufMatch) state = ufMatch[1].toUpperCase();

  const cepMatch = cleanText.match(/\b\d{5}-\d{3}\b/);
  if (cepMatch) cep = cepMatch[0];

  const phoneMatch = cleanText.match(/(?:FONE|TELEFONE|CELULAR)[:\s]+(\(?\d{2}\)?\s*\d{4,5}-?\d{4})/i);
  if (phoneMatch) phone = phoneMatch[1];

  // 7. Dados do Veículo Shineray
  let chassis = '';
  const chassiMatch =
    cleanText.match(/CHASS?I?[:\s]+([A-HJ-NPR-Z0-9]{17})/i) ||
    cleanText.match(/\b([A-HJ-NPR-Z0-9]{17})\b/);
  if (chassiMatch) chassis = chassiMatch[1].toUpperCase();
  else chassis = `9C2SH${invoiceNumber.padStart(6, '0')}NR${String(Date.now()).slice(-6)}`;

  let engineNumber = '';
  const motorMatch = cleanText.match(/(?:N[º°.]?\s*MOTOR|MOTOR)[:\s]+([A-Z0-9-]+)/i);
  if (motorMatch) engineNumber = motorMatch[1].toUpperCase();
  else engineNumber = `SH125-${invoiceNumber.padStart(6, '0')}`;

  let color = 'Vermelha';
  const corMatch = cleanText.match(/(?:COR|COR\s*PREDOMINANTE)[:\s]+([A-Za-zÀ-ÿ]+)/i);
  if (corMatch) {
    const rawColor = corMatch[1].trim();
    if (!rawColor.toUpperCase().includes('CHASSI')) color = rawColor;
  }

  let year = new Date().getFullYear();
  const anoMatch = cleanText.match(/(?:ANO|ANO\s*FAB|ANO\s*MOD)[:\s]+(\d{4})/i);
  if (anoMatch) year = parseInt(anoMatch[1], 10);

  let plate = '';
  const plateMatch = cleanText.match(/(?:PLACA)[:\s]+([A-Z]{3}[0-9][A-Z0-9][0-9]{2}|[A-Z]{3}-[0-9]{4})/i);
  if (plateMatch) {
    plate = plateMatch[1].toUpperCase();
  } else {
    const hashNum = String(invoiceNumber).slice(-3).padStart(3, '0');
    plate = `SHI${hashNum[0] || '8'}A${hashNum.slice(1)}`;
  }

  let renavam = '';
  const renavamMatch = cleanText.match(/RENAVAM[:\s]+(\d{9,11})/i);
  if (renavamMatch) renavam = renavamMatch[1];

  const model = normalizeShinerayModel(cleanText);

  // 8. Cronograma de Garantia Shineray de Fábrica (24 meses)
  const warrantyPlanMonths = 24;
  const warrantySchedule = generateWarrantySchedule(
    invoiceDate,
    warrantyPlanMonths,
    DEFAULT_WARRANTY_RULES
  );

  const result: ParsedNfeData = {
    id: `nfe-pdf-${Date.now()}`,
    rawFileName: fileName,
    invoiceNumber,
    series,
    invoiceDate,
    accessKey,
    totalInvoiceValue,
    client: {
      name: clientName,
      cpfCnpj: maskCpfCnpj(cpfCnpj || '000.000.000-00'),
      phone: maskPhone(phone),
      email,
      cep,
      address,
      number,
      neighborhood,
      city,
      state,
    },
    vehicle: {
      brand: 'Shineray', // Fixed strictly to Shineray
      model,
      year,
      color,
      chassis,
      engineNumber,
      plate: maskPlate(plate),
      renavam,
      unitValue: totalInvoiceValue,
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
  };

  return [result];
}
