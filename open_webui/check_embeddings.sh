#!/bin/bash

# python3 -m venv pythonenv

pushd pythonenv
source bin/activate

# pip install ollama chromadb

python ../check_embeddings.py

popd
