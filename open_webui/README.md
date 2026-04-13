# Installation OpenWeb UI

Modelle per Hand runterladen:

docker exec -it CONTAINER ollama pull MODELLNAME

Modelle:
* qwen3-4b-2507
* multilingual-e5-base-gguf

Beispiel:

docker exec -it ollama ollama pull llama3
docker exec -it ollama ollama pull yxchia/multilingual-e5-base
docker exec -it ollama ollama pull bge-m3
docker exec -it ollama ollama pull jina/jina-embeddings-v2-base-de
docker exec -it ollama ollama pull qllama/multilingual-e5-base
docker exec -it ollama ollama pull qllama/multilingual-e5-large

docker exec -it ollama ollama pull nomic-embed-text
docker exec -it ollama ollama pull kamekichi128/qwen3-4b-instruct-2507

# Test

## nomic-embed-text

curl http://localhost:11434/api/embeddings -d '{
  "model": "nomic-embed-text",
  "prompt": "Wie funktionieren Embeddings?"
}'

--> OK

## qllama/multilingual-e5-base

curl http://localhost:11434/api/embeddings -d '{
  "model": "qllama/multilingual-e5-base",
  "prompt": "Wie funktionieren Embeddings?"
}'

--> ERROR

## bge-m3

curl http://localhost:11434/api/embeddings -d '{
  "model": "bge-m3",
  "prompt": "Wie funktionieren Embeddings?"
}' 

--> OK

## qllama/multilingual-e5-large

curl http://localhost:11434/api/embeddings -d '{
  "model": "qllama/multilingual-e5-large",
  "prompt": "Wie funktionieren Embeddings?"
}' 

--> ERROR



# LM Studio

curl -fsSL https://lmstudio.ai/install.sh | bash

export PATH="/home/danielzoba/.lmstudio/bin:$PATH"

lms daemon up

lms server start

Daemon runs here: http://localhost:1234

lms get qwen/qwen3-4b-2507

Which embedding model to download???

lms get e5-base ??? does not work


