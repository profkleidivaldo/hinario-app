# Hinário Adventista — PWA com leitura offline

Aplicativo web instalável (PWA), responsivo para celular e computador, com visual inspirado em um hinário impresso.

## O que esta versão já inclui

- **As letras do arquivo `hymns.js` enviado pelo usuário**, incorporadas ao projeto em `classes/hymns.js`.
- Catálogo de 613 números de hinos, com títulos e letras conforme os dados presentes no arquivo.
- Busca por número, título e palavras da letra.
- Leitura das estrofes, navegação entre hinos, favoritos e histórico local.
- Tema claro/escuro.
- Salvamento automático de todas as letras no armazenamento local do navegador (IndexedDB) na primeira abertura com o arquivo disponível.
- Service worker que armazena os arquivos essenciais, inclusive `classes/hymns.js`, no cache do navegador.
- Botão **Salvar letras offline** para repetir o salvamento quando necessário.
- Instalação como PWA por HTTPS/GitHub Pages.

## Como publicar no GitHub Pages

1. Baixe e extraia o ZIP.
2. Envie todos os arquivos e pastas para a raiz do seu repositório GitHub.
3. No repositório, abra **Settings → Pages**.
4. Em **Build and deployment**, selecione a branch `main` e a pasta `/ (root)` e salve.
5. Acesse a página publicada por HTTPS com internet e aguarde a mensagem **“Modo offline pronto: 613 hinos salvos neste dispositivo.”**
6. Se desejar, clique em **Salvar letras offline** para repetir o salvamento.
7. Use **Instalar app** no navegador compatível ou “Adicionar à tela inicial” no celular.

## Como funciona sem internet

A primeira abertura precisa ser feita com internet, para baixar a página e o arquivo de letras. O aplicativo então:
1. guarda uma cópia estruturada das letras no IndexedDB do dispositivo;
2. guarda a aplicação e o arquivo `classes/hymns.js` no cache do service worker;
3. usa a cópia local para exibir e pesquisar as letras quando ficar sem conexão.

Depois que a mensagem de modo offline pronto aparecer, abra o aplicativo pelo mesmo navegador/dispositivo. Se limpar os dados do navegador, trocar de navegador ou usar outro dispositivo, será necessário conectar-se novamente para baixar os dados.

**Importante:** o arquivo recebido contém letras e metadados, mas não contém gravações de áudio. Esta versão não promete reprodução de áudio offline.

## Atualização das letras

Quando houver conexão, o app salva novamente os dados fornecidos com a publicação atual. Para distribuir uma versão atualizada, substitua `classes/hymns.js` no repositório e publique a alteração. Se o dispositivo conservar uma versão antiga do service worker, feche e abra o app novamente com internet.

## Arquivos principais

- `index.html` — interface.
- `style.css` — visual responsivo.
- `app.js` — catálogo, busca, favoritos e armazenamento local.
- `classes/hymns.js` — letras e metadados dos hinos.
- `sw.js` — cache para funcionamento offline.
- `manifest.webmanifest` — configurações de instalação PWA.
