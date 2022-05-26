FROM node:carbon-alpine

ADD ./package.json /app/package.json
ADD ./yarn.lock /app/yarn.lock
WORKDIR /app
RUN yarn install --production=false

ADD . /app
RUN yarn build

EXPOSE 8080
ENV PORT 8080
ENV HOST 0.0.0.0

ENTRYPOINT ["node", "./build/src/index.js"]
