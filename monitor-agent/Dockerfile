FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir psutil==6.1.1
COPY agent.py .
CMD ["python", "agent.py"]
