FROM node:20-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
ARG VITE_VAPI_PUBLIC_KEY=""
ENV VITE_VAPI_PUBLIC_KEY=$VITE_VAPI_PUBLIC_KEY
RUN npm run build

FROM python:3.12-slim
WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .
COPY --from=frontend-build /app/frontend/dist ./static

ENV PORT=8000
EXPOSE 8000
CMD uvicorn main:app --host 0.0.0.0 --port $PORT
