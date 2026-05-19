
# Übung 1

npm install @langchain/openai @langchain/core express ollama-api-facade-js

# Übung 2

[ node client --> Windows (local) ]

Open Web UI --> Linux (192.168.178.XXX:3000)

Ollama API facade --> Windows (192.168.178.YYY:11434)

LM Studio --> Linux (192.168.178.XXX:1234)

* start LM Studio AppImage with "--no-sandbox"

# Übung 3

npm install undici

to use burp suite

# Übung 4

npm install cheerio @langchain/community

# next

npm install zod

# next

npm install vectra --force

# qdrant

npm install @qdrant/js-client-rest --force

Console query für qdrant qg entries:

```
POST collections/vector-db-qg-chunking-md/points/scroll
{
  "limit": 10,
  "with_payload": ["files", "sentence_indices", "question"],
  "filter": {
    "must": [
      {
        "key": "files",
        "match": {
          "any": [
            "LLM07_SystemPromptLeakage.md"
          ]
        }
      },
      {
        "key": "sentence_indices",
        "match": {
          "any": [48]
        }
      }
    ]
  }
}
```

# sicherheit

- user prompt embedded und gegen embeddings bekannter böser prompts testen - und dann nicht an AI weitergeben

- Generierte Antwort zuerst an eine AI schicken, mit der Aufgabe, auf Betrug zu testen, Antwort als einfaches JSON
-- entweder dann doch antwort an den user, oder halt vorenthalten






