FROM oven/bun
WORKDIR /app
COPY index.ts .
COPY package.json .
RUN bun install
EXPOSE 8000

CMD ["bun", "run", "index.ts"]
