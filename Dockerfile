FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    WORLD_DATA_DIR=/data \
    PORT=8000

WORKDIR /app

COPY app.py world.py ./
COPY static ./static

RUN useradd --create-home --uid 10001 world \
    && mkdir -p /data \
    && chown -R world:world /app /data

USER world

EXPOSE 8000
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD python3 -c 'import urllib.request; urllib.request.urlopen("http://127.0.0.1:8000/api/health", timeout=3)'

CMD ["python3", "app.py"]

