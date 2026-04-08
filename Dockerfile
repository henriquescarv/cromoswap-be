# Estágio 1: Build
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
# Instalando as dependências dentro do container (limpo)
RUN npm install
COPY . .

# Estágio 2: Runner (Imagem leve para o ECR)
FROM node:20-slim
WORKDIR /app

# Definindo variáveis de ambiente padrão
ENV NODE_ENV=production
ENV PORT=3000

# Copiando apenas o necessário do builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app ./

# Porta que o App Runner vai monitorar (deve bater com o console da AWS)
EXPOSE 3000

CMD ["npm", "start"]