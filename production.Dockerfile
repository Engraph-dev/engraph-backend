# Use NodeJS LTS (As of writing, 2024-11-25, v22.11.0)
FROM node:lts

WORKDIR /services/engraph-backend

# Copy package files for next step
COPY tsconfig.json /services/engraph-backend/
COPY package.json /services/engraph-backend/
COPY package-lock.json /services/engraph-backend/
COPY prisma /services/engraph-backend/prisma
# Run ci instead of install
# ci requires package files to exist previously
RUN ["npm", "ci"]

# Copy source files
COPY src /services/engraph-backend/src

# Build the server files, output will be stored in dist
RUN ["npm", "run", "build"]

COPY dist/ /services/engraph-backend/dist/
COPY .env /services/engraph-backend/

EXPOSE ${PORT}

CMD ["npm", "start"]