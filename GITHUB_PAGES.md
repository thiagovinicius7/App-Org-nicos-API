# Publicando no GitHub Pages (Geranium Orgânicos)

Este guia prático explica como publicar o sistema de gestão no seu **GitHub Pages** de forma automatizada.

---

## 🚀 Passo 1: Configurar o Repositório no GitHub

1. Crie um novo repositório no seu GitHub (público ou privado) com o nome desejado (ex: `geranium-organicos`).
2. Siga as instruções para empurrar seu código atual para lá:
   ```bash
   git init
   git add .
   git commit -m "feat: preparar para github pages"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
   git push -u origin main
   ```

---

## 🔒 Passo 2: Autorizar o seu Domínio no Firebase (Crucial para o Login funcionar)

Como o app usa o Google Sign-In do Firebase, o Firebase bloqueia logins vindos de domínios não autorizados. Você precisa adicionar o link do seu GitHub Pages:

1. Acesse o [Console do Firebase](https://console.firebase.google.com/).
2. Selecione o projeto do **Geranium Orgânicos**.
3. No menu lateral esquerdo, vá em **Authentication** e selecione a aba **Configurações** (Settings).
4. Clique em **Domínios autorizados** (Authorized domains).
5. Clique em **Adicionar domínio** (Add domain) e insira o domínio do seu GitHub Pages:
   ```text
   SEU-USUARIO.github.io
   ```
6. Clique em **Salvar**.

---

## 🤖 Passo 3: Deploy Automatizado com GitHub Actions

Nós já configuramos um arquivo de Workflow em `.github/workflows/deploy.yml`. 

1. No seu repositório no GitHub, clique na aba **Settings** (Configurações).
2. No menu lateral esquerdo, sob a seção "Code and automation", clique em **Actions** -> **General**.
3. Role até o final na seção **Workflow permissions** (Permissões de fluxo de trabalho).
4. Selecione a opção **Read and write permissions** (Permissões de leitura e gravação) e clique em **Save**.
5. Agora, toda vez que você der um `git push` na branch `main` ou `master`, o GitHub Actions irá automaticamente:
   * Instalar as dependências do app.
   * Compilar o projeto de forma otimizada para produção.
   * Publicar os arquivos compilados na branch `gh-pages`.

---

## 🌐 Passo 4: Ativar o GitHub Pages no GitHub

1. Vá na aba **Settings** do seu repositório no GitHub.
2. No menu esquerdo, sob a seção "Code and automation", clique em **Pages**.
3. Sob **Build and deployment**:
   * **Source**: Escolha `Deploy from a branch`.
   * **Branch**: Selecione `gh-pages` e a pasta `/ (root)`.
4. Clique em **Save**.
5. Em poucos instantes, o GitHub exibirá o link público do seu app, por exemplo:
   `https://SEU-USUARIO.github.io/SEU-REPOSITORIO/`
