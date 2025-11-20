import { google } from 'googleapis';

export const MONTHS = [
  "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
  "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"
];

export const SPREADSHEET_ID = import.meta.env.SPREADSHEET_ID;

// 1. Autenticação
export async function getAuthSheets() {
  try {
    let privateKey = import.meta.env.GOOGLE_PRIVATE_KEY;
    if (!privateKey) throw new Error("Chave privada ausente no .env");
    
    const cleanKey = privateKey.replace(/\\n/g, '\n');

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: import.meta.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: cleanKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const client = await auth.getClient();
    return google.sheets({ version: 'v4', auth: client });
  } catch (error) {
    console.error("🔴 ERRO NA AUTENTICAÇÃO:", error.message);
    throw error;
  }
}

export function getCurrentMonthSheetName() {
  const d = new Date();
  return MONTHS[d.getMonth()];
}

// 2. Busca Inteligente de Abas
export async function findRealSheetName(sheets, targetName) {
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const allSheets = meta.data.sheets.map(s => s.properties.title);
    
    if (allSheets.includes(targetName)) return targetName;
    
    // Procura ignorando maiúsculas/espaços
    const match = allSheets.find(s => s.trim().toUpperCase() === targetName.trim().toUpperCase());
    return match || null;
  } catch (e) {
    return targetName;
  }
}

// 3. Atualizar Linha (ESTAVA FALTANDO ESSA!)
export async function updateRow(month, rowIndex, rowData) {
  const sheets = await getAuthSheets();
  // rowIndex é base 0, planilha é base 1 + cabeçalho = +2
  const r = parseInt(rowIndex) + 2;
  const range = `'${month}'!A${r}:L${r}`;
  
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [rowData] },
  });
}

// 4. Pegar dados de todos os meses
export async function getAllMonthsData() {
  const sheets = await getAuthSheets();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const availableTabs = meta.data.sheets.map(s => s.properties.title);

  const promises = availableTabs.map(async (realTabName) => {
    const isMonthTab = MONTHS.some(m => realTabName.trim().toUpperCase() === m);
    if (!isMonthTab) return [];

    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${realTabName}'!A2:L1000`, 
      });
      const rows = response.data.values || [];
      return rows.map(row => ({ ...row, _month: realTabName })); 
    } catch (e) {
      return []; 
    }
  });

  const results = await Promise.all(promises);
  return results.flat();
}