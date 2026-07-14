# Publicando no GitHub Pages (Geranium Orgânicos)

Este guia prático explica como publicar o sistema de gestão no seu **GitHub Pages** de forma 100% automatizada e moderna usando **GitHub Actions**.

---

## 🚀 Passo 1: Configurar o Repositório no GitHub

1. Crie um novo repositório no seu GitHub (público ou privado) com o nome desejado (ex: `geranium-organicos`).
2. Adicione todos os arquivos do projeto e envie-os para o seu repositório:
   ```bash
   git init
   git add .
   git commit -m "feat: preparar para github pages moderno"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
   git push -u origin main
   ```

---

## 🔒 Passo 2: Autorizar o seu Domínio no Firebase (Crucial para o Login funcionar)

Como o app usa o Google Sign-In do Firebase para garantir a segurança, o Firebase bloqueia tentativas de login vindas de origens não autorizadas. Você precisa registrar o seu link do GitHub Pages:

1. Acesse o [Console do Firebase](https://console.firebase.google.com/).
2. Selecione o projeto **Geranium Orgânicos** (ou o projeto correspondente).
3. No menu esquerdo, vá em **Authentication** e depois clique na aba **Configurações** (Settings) no topo.
4. Clique em **Domínios autorizados** (Authorized domains).
5. Clique em **Adicionar domínio** (Add domain) e insira o domínio principal do GitHub Pages:
   ```text
   SEU-USUARIO.github.io
   ```
6. Clique em **Salvar**.

---

## 🌐 Passo 3: Ativar o GitHub Pages com Origem "GitHub Actions"

Para que o deploy funcione de maneira moderna e automática sem precisar gerenciar branches secundárias (como `gh-pages`):

1. Acesse o seu repositório no GitHub.
2. Clique na aba **Settings** (Configurações) no topo.
3. No menu esquerdo, clique em **Pages**.
4. Sob a seção **Build and deployment**:
   * Em **Source** (Origem), altere de `Deploy from a branch` para **`GitHub Actions`**.
5. **Pronto!** Não precisa configurar branches nem salvar. O próprio GitHub Actions cuidará de gerar o build e publicar o site.

---

## 🤖 Passo 4: Acompanhar o Build e Ver o Link Publicado

Agora que a origem está configurada para **GitHub Actions**:

1. Toda vez que você fizer um `git push` na branch `main` ou `master`, um processo automático será iniciado.
2. Clique na aba **Actions** no seu repositório do GitHub para acompanhar o progresso.
3. Clique no workflow **Deploy to GitHub Pages**.
4. Quando o status ficar verde (Sucesso), você verá o link oficial de publicação diretamente na tela do job ou no topo da aba **Pages**, no formato:
   `https://SEU-USUARIO.github.io/SEU-REPOSITORIO/`
