/**
 * Registo de gastos Apple Pay -> Google Sheets
 *
 * 1. Muda o TOKEN abaixo para uma palavra secreta tua.
 * 2. Corre a função configurar() uma vez (cria as abas e o resumo).
 * 3. Implementa como Aplicação Web (ver README.md).
 */

const TOKEN = 'muda-isto-para-uma-palavra-secreta';

const ABA_GASTOS = 'Gastos';
const ABA_CATEGORIAS = 'Categorias';
const ABA_RESUMO = 'Resumo';
const FUSO = 'Europe/Lisbon';

const CABECALHO = ['Data', 'Comerciante', 'Valor (€)', 'Cartão', 'Categoria', 'Mês'];

// Palavra-chave encontrada no nome do comerciante -> categoria.
// Podes acrescentar linhas diretamente na aba "Categorias".
const CATEGORIAS_INICIAIS = [
  ['galp', 'Combustível'],
  ['repsol', 'Combustível'],
  ['prio', 'Combustível'],
  ['cepsa', 'Combustível'],
  ['bp ', 'Combustível'],
  ['via verde', 'Portagens'],
  ['brisa', 'Portagens'],
  ['lavagem', 'Lavagem do carro'],
  ['wash', 'Lavagem do carro'],
  ['continente', 'Supermercado'],
  ['pingo doce', 'Supermercado'],
  ['lidl', 'Supermercado'],
  ['aldi', 'Supermercado'],
  ['mercadona', 'Supermercado'],
  ['intermarch', 'Supermercado'],
  ['minipre', 'Supermercado'],
  ['mcdonald', 'Restauração'],
  ['burger king', 'Restauração'],
  ['glovo', 'Restauração'],
  ['uber eats', 'Restauração'],
  ['bolt food', 'Restauração'],
  ['farm', 'Saúde'],
  ['worten', 'Compras'],
  ['fnac', 'Compras'],
  ['amazon', 'Compras'],
];

/** Corre uma vez para preparar a folha. */
function configurar() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetLocale('pt_PT');
  ss.setSpreadsheetTimeZone(FUSO);

  // Aba Gastos (reaproveita a primeira aba se estiver vazia)
  let g = ss.getSheetByName(ABA_GASTOS);
  if (!g) {
    const primeira = ss.getSheets()[0];
    g = primeira.getLastRow() === 0 ? primeira.setName(ABA_GASTOS) : ss.insertSheet(ABA_GASTOS);
  }
  g.getRange(1, 1, 1, CABECALHO.length).setValues([CABECALHO])
    .setFontWeight('bold').setBackground('#1f4e79').setFontColor('#ffffff');
  g.setFrozenRows(1);
  g.getRange('A2:A').setNumberFormat('dd/mm/yyyy hh:mm');
  g.getRange('C2:C').setNumberFormat('#,##0.00 "€"');
  g.getRange('F2:F').setNumberFormat('@');
  [140, 220, 90, 140, 150, 80].forEach((w, i) => g.setColumnWidth(i + 1, w));

  // Aba Categorias
  let c = ss.getSheetByName(ABA_CATEGORIAS) || ss.insertSheet(ABA_CATEGORIAS);
  if (c.getLastRow() === 0) {
    c.getRange(1, 1, 1, 2).setValues([['Palavra-chave', 'Categoria']]);
    c.getRange(2, 1, CATEGORIAS_INICIAIS.length, 2).setValues(CATEGORIAS_INICIAIS);
  }
  c.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground('#1f4e79').setFontColor('#ffffff');
  c.setFrozenRows(1);
  c.setColumnWidth(1, 160);
  c.setColumnWidth(2, 160);
  c.getRange('D1').setValue('Escreve a palavra-chave em minúsculas. Se o nome do comerciante a contiver, o gasto recebe essa categoria. Sem correspondência fica "Outros".');

  // Aba Resumo
  let r = ss.getSheetByName(ABA_RESUMO) || ss.insertSheet(ABA_RESUMO);
  r.clear();
  r.getRange('A1').setValue('Resumo de gastos').setFontSize(14).setFontWeight('bold');

  r.getRange('A3').setValue('Total por mês').setFontWeight('bold');
  r.getRange('A4').setFormula(
    '=QUERY(Gastos!A:F,"select F, sum(C), count(C) where F is not null group by F order by F desc ' +
    'label F \'Mês\', sum(C) \'Total (€)\', count(C) \'Pagamentos\'",1)');

  r.getRange('E2').setValue('Mês a analisar (aaaa-mm):');
  r.getRange('E3').setNumberFormat('@')
    .setValue(Utilities.formatDate(new Date(), FUSO, 'yyyy-MM'))
    .setBackground('#ffff00').setFontColor('#0000ff');
  r.getRange('E4').setFormula(
    '=IFERROR(QUERY(Gastos!A:F,"select E, sum(C) where F = \'"&E3&"\' group by E order by sum(C) desc ' +
    'label E \'Categoria\', sum(C) \'Total (€)\'",1),"Sem gastos neste mês")');

  r.getRange('B5:B').setNumberFormat('#,##0.00 "€"');
  r.getRange('F5:F').setNumberFormat('#,##0.00 "€"');
  r.setColumnWidth(1, 110);
  r.setColumnWidth(5, 170);
  r.getRange('H3').setValue('Célula amarela (E3) é a única que alteras. O resto é calculado.');

  ss.setActiveSheet(g);
}

/** Recebe cada pagamento enviado pelo Atalho do iPhone. */
function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.token !== TOKEN) return resposta({ ok: false, erro: 'token inválido' });

    const valor = lerValor(d.valor);
    if (isNaN(valor)) return resposta({ ok: false, erro: 'valor inválido: ' + d.valor });

    const comerciante = String(d.comerciante || 'Desconhecido').trim();
    const cartao = String(d.cartao || '').trim();
    registar(comerciante, valor, cartao);
    return resposta({ ok: true, comerciante: comerciante, valor: valor });
  } catch (err) {
    return resposta({ ok: false, erro: String(err) });
  }
}

/** Abrir o URL no browser serve para confirmar que está a funcionar. */
function doGet() {
  return ContentService.createTextOutput('Registo de gastos ativo.');
}

function registar(comerciante, valor, cartao) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const g = ss.getSheetByName(ABA_GASTOS);
    const agora = new Date();
    const mes = Utilities.formatDate(agora, FUSO, 'yyyy-MM');
    g.appendRow([agora, comerciante, valor, cartao, categorizar(comerciante), mes]);
  } finally {
    lock.releaseLock();
  }
}

function categorizar(comerciante) {
  const nome = ' ' + comerciante.toLowerCase() + ' ';
  const c = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABA_CATEGORIAS);
  if (!c || c.getLastRow() < 2) return 'Outros';
  const regras = c.getRange(2, 1, c.getLastRow() - 1, 2).getValues();
  for (const [chave, categoria] of regras) {
    if (chave && nome.includes(String(chave).toLowerCase())) return categoria;
  }
  return 'Outros';
}

/** Aceita 12.5, "12,50 €", "€1.234,56", "1,234.56". */
function lerValor(v) {
  if (typeof v === 'number') return Math.abs(v);
  let s = String(v).replace(/[^\d,.\-]/g, '');
  if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else {
    s = s.replace(/,/g, '');
  }
  return Math.abs(parseFloat(s));
}

function resposta(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Cria uma linha de teste sem precisar do iPhone. */
function testar() {
  registar('Galp Lisboa', lerValor('45,30 €'), 'Teste');
}
