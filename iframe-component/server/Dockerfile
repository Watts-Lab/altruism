FROM node:16-alpine 

ENV PORT=3001

WORKDIR /app/server
COPY ./package.json ./
RUN npm install
COPY server.js .
EXPOSE ${PORT}
CMD ["node", "server.js"]