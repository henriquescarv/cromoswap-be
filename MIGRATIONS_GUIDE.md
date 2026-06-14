# 📋 Guia de Migrations - CromoSwap Backend

## 🎯 O que são Migrations?

Migrations são arquivos de controle de versão para o banco de dados. Permitem:
- ✅ Controle de versão do schema do banco
- ✅ Histórico de mudanças rastreável
- ✅ Rollback seguro em caso de problemas
- ✅ Sincronização entre ambientes (dev, staging, prod)
- ✅ Colaboração entre desenvolvedores

---

## ⚠️ IMPORTANTE: Sync foi REMOVIDO

**O código `sequelize.sync({ alter: true })` foi COMPLETAMENTE REMOVIDO.** 

❌ **NUNCA mais use:**
```javascript
sequelize.sync({ alter: true })  // PERIGOSO!
```

✅ **SEMPRE use migrations:**
```bash
npm run migrate
```

---

## 🚀 Comandos Principais

### Executar Migrations (Criar/Atualizar Tabelas)
```bash
npm run migrate
```

### Ver Status das Migrations
```bash
npm run migrate:status
```

### Desfazer Última Migration
```bash
npm run migrate:undo
```

### Deploy (Roda migrations + inicia servidor)
```bash
npm run deploy
```

---

## 📝 Como Criar uma Nova Migration

### 1. Gerar arquivo de migration
```bash
npx sequelize-cli migration:generate --name add-profile-picture-to-users
```

### 2. Editar o arquivo criado em `migrations/`
```javascript
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'profilePicture', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Users', 'profilePicture');
  }
};
```

### 3. Executar a migration
```bash
npm run migrate
```

---

## 🔄 Fluxo de Trabalho Recomendado

### Desenvolvimento Local
```bash
# 1. Fazer mudança no código
# 2. Criar migration
npx sequelize-cli migration:generate --name sua-mudanca

# 3. Editar arquivo de migration
# 4. Executar migration
npm run migrate

# 5. Testar
npm start
```

### Em Produção
```bash
# No script de deploy, sempre rodar migrations ANTES do servidor
npm run migrate
npm start

# OU usar o comando combinado
npm run deploy
```

---

## 🛠️ Exemplos Comuns de Migrations

### Adicionar Coluna
```javascript
await queryInterface.addColumn('TableName', 'columnName', {
  type: Sequelize.STRING,
  allowNull: false,
  defaultValue: 'default value'
});
```

### Remover Coluna
```javascript
await queryInterface.removeColumn('TableName', 'columnName');
```

### Criar Índice
```javascript
await queryInterface.addIndex('TableName', ['columnName'], {
  unique: true,
  name: 'unique_column_name'
});
```

### Alterar Tipo de Coluna
```javascript
await queryInterface.changeColumn('TableName', 'columnName', {
  type: Sequelize.TEXT,
  allowNull: true
});
```

### Renomear Coluna
```javascript
await queryInterface.renameColumn('TableName', 'oldName', 'newName');
```

---

## 🚨 Boas Práticas

### ✅ SEMPRE FAZER:
1. **Testar a migration localmente** antes de fazer deploy
2. **Escrever o método `down`** para permitir rollback
3. **Commitar migrations no git** junto com o código
4. **Rodar migrations ANTES** de iniciar o servidor
5. **Usar nomes descritivos** para as migrations

### ❌ NUNCA FAZER:
1. **Editar migrations já executadas** em produção
2. **Deletar arquivos de migration** que já foram executados
3. **Usar sync()** em qualquer ambiente
4. **Rodar migrations manualmente** no banco de produção
5. **Esquecer de commitar** arquivos de migration

---

## 📊 Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run migrate` | Executa todas as migrations pendentes |
| `npm run migrate:undo` | Desfaz a última migration executada |
| `npm run migrate:status` | Mostra status de todas as migrations |
| `npm run deploy` | Executa migrations + inicia servidor |
| `npm start` | Inicia o servidor (sem rodar migrations) |

---

## 🐛 Troubleshooting

### Problema: "SequelizeMeta not found"
**Solução:** Execute as migrations:
```bash
npm run migrate
```

### Problema: Migration falhou
**Solução:** Desfaça a migration e corrija:
```bash
npm run migrate:undo
# Edite o arquivo de migration
npm run migrate
```

### Problema: Banco está diferente da migration
**Solução:** Em desenvolvimento, você pode:
1. Fazer backup dos dados
2. Dropar todas as tabelas
3. Rodar as migrations do zero

```bash
# CUIDADO: Isso apaga TODOS os dados!
npx sequelize-cli db:migrate:undo:all
npm run migrate
```

---

## 📚 Referências

- [Sequelize Migrations Docs](https://sequelize.org/docs/v6/other-topics/migrations/)
- [Sequelize CLI](https://github.com/sequelize/cli)

---

**⚡ Lembre-se:** Migrations são o coração do controle de versão do banco de dados. Use-as sempre!
