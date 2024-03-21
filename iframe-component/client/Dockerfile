FROM node:16-alpine 

ENV PORT=3000

WORKDIR /app/client
COPY ./package.json ./
RUN npm install 
COPY . .
EXPOSE ${PORT}
CMD ["npm", "start"]


# FROM python:3.8-buster

# ENV POETRY_VERSION=1.0.8

# RUN pip install "poetry==$POETRY_VERSION"
# RUN mkdir /templates
# WORKDIR /app/
# COPY pyproject.toml /app/
# COPY poetry.lock /app/
# RUN poetry install --no-dev
# COPY . /app/
# CMD ["poetry", "run", "uvicorn", "main:app", "--host", "0.0.0.0"]


# Stage 1: Build React frontend
# FROM --platform=linux/amd64 public.ecr.aws/bitnami/node:20 AS client-build
# WORKDIR /app/client
# COPY package*.json ./
# RUN npm install
# COPY ./ ./
# RUN npm run build

# Stage 2: Build Express backend
# FROM --platform=linux/amd64 public.ecr.aws/bitnami/node:20 AS server-build
# WORKDIR /app/server
# COPY package*.json ./
# RUN npm install
# COPY server.js ./

# Stage 3: Setup Nginx
# FROM --platform=linux/amd64 public.ecr.aws/nginx/nginx:latest
# FROM nginx:alpine
# ARG GITHUB_HASH=local
# ENV GITHUB_HASH=${GITHUB_HASH}
# ARG GITHUB_BRANCH=local
# ENV GITHUB_BRANCH=${GITHUB_BRANCH}
# COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from React frontend
# COPY --from=node:16-alpine /app/client/dist /var/www/html

# Copy Express backend
# COPY --from=node:16-alpine /app/server /usr/src/app

# Expose port 80
# EXPOSE 80

# Start Nginx and Express server
# CMD apt-get update && echo "Y" | apt-get install nodejs && service nginx start && cd /usr/src/app && node server.js
