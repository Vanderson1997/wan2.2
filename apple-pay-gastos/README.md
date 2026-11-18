# Registo de gastos Apple Pay

Cada pagamento feito com Apple Pay no iPhone fica registado numa folha Google Sheets, com categoria automática e resumo mensal.

```
iPhone (pagas com Apple Pay)
  -> Atalhos: automação "Transação"
  -> envia valor, comerciante e cartão para o URL do Apps Script
  -> o script escreve uma linha na aba "Gastos"
  -> a aba "Resumo" atualiza sozinha
```

Precisas de: iPhone com iOS 17 ou superior, conta Google. Não precisas de Mac nem de pagar nada.

## Parte 1: a folha (computador, cerca de 10 minutos)

1. Abre https://sheets.new e dá o nome `Gastos Apple Pay` à folha.
2. Menu **Extensões > Apps Script**.
3. Apaga o código que lá estiver e cola todo o conteúdo do ficheiro `Code.gs`.
4. Na linha `const TOKEN = '...'` troca o texto por uma palavra secreta tua (por exemplo `gastos-k7p2-8273`). Guarda-a, vais precisar dela no iPhone.
5. Grava (ícone da disquete).
6. No topo, escolhe a função `configurar` e carrega em **Executar**. A Google vai pedir autorização: escolhe a tua conta, **Avançadas**, **Aceder a ... (não seguro)**, **Permitir**. O aviso aparece porque o script é teu e não foi verificado pela Google; é normal.
7. Volta à folha: deves ver as abas **Gastos**, **Categorias** e **Resumo**.
8. Opcional: escolhe a função `testar` e executa. Aparece uma linha "Galp Lisboa 45,30 €" em Gastos. Apaga-a depois.

## Parte 2: publicar o script como endereço web

1. No Apps Script: **Implementar > Nova implementação**.
2. Na roda dentada escolhe **Aplicação Web**.
3. **Executar como:** Eu. **Quem tem acesso:** Qualquer pessoa.
4. **Implementar** e copia o **URL da aplicação Web** (termina em `/exec`).
5. Cola esse URL no browser. Se aparecer "Registo de gastos ativo." está tudo certo.

"Qualquer pessoa" significa que qualquer um com o URL pode enviar pedidos, mas sem o teu TOKEN o script rejeita-os. Não partilhes o URL nem o token.

Se um dia alterares o código, faz **Implementar > Gerir implementações > editar (lápis) > Versão: Nova versão**. Sem isso o URL continua a correr o código antigo.

## Parte 3: automação no iPhone

1. App **Atalhos > Automação > +** (ou "Nova automação").
2. Escolhe **Transação**.
3. Seleciona os cartões que queres seguir (podes deixar todos).
4. Escolhe **Executar imediatamente** e desativa "Notificar ao executar" se quiseres. Avança.
5. **Nova automação em branco** e adiciona a ação **Obter conteúdo do URL**.
6. Configura a ação:
   - URL: o teu URL `/exec`
   - Método: **POST**
   - Corpo do pedido: **JSON**
   - Adiciona 4 campos, todos do tipo **Texto**:

| Chave | Valor |
|---|---|
| `token` | a tua palavra secreta |
| `valor` | variável **Montante** (da Transação) |
| `comerciante` | variável **Comerciante** |
| `cartao` | variável **Cartão ou passe** |

Para inserir as variáveis, toca no campo de valor e escolhe-as na barra por cima do teclado ("Entrada do atalho" ou "Transação" e depois o detalhe). Os nomes exatos podem variar ligeiramente com a versão do iOS.

7. Guarda. No próximo pagamento com Apple Pay a linha aparece na folha em poucos segundos.

## Usar a folha

- **Gastos**: uma linha por pagamento. Podes corrigir a categoria à mão.
- **Categorias**: palavra-chave (minúsculas) e categoria. Se o nome do comerciante contiver a palavra, o gasto recebe essa categoria. Acrescenta as tuas, por exemplo a bomba onde abasteces.
- **Resumo**: total por mês e, para o mês escrito na célula amarela E3 (formato `2026-11`), o total por categoria.

## Limitações

- Só regista pagamentos com Apple Pay feitos a partir do momento em que ativas a automação. Cartão físico, MB WAY e débitos diretos não entram.
- Reembolsos e devoluções não são detetados.
- Se o iPhone estiver sem rede no momento do pagamento, esse pedido perde-se.
- A categoria aplica-se só a gastos novos. Mudar uma regra não altera linhas antigas.

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| Nada aparece na folha | Token diferente no script e no Atalho, ou URL errado (tem de terminar em `/exec`) |
| Funcionou e depois deixou de funcionar após editar o código | Faltou criar uma nova versão da implementação |
| Valor vazio ou "valor inválido" | O campo `valor` não tem a variável Montante inserida |
| Tudo fica em "Outros" | Nenhuma palavra-chave corresponde; acrescenta-a na aba Categorias |
