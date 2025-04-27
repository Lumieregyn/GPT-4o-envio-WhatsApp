# Dockerfile para Railway
FROM node:18

# Definindo o diretório de trabalho
WORKDIR /app

# Copiando os arquivos de dependências
COPY package*.json ./

# Instalando dependências
RUN npm install

# Copiando todo o projeto
COPY . .

# Expondo a porta definida
EXPOSE 3000

# Comando para rodar o app
CMD ["npm", "start"]
