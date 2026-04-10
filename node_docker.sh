docker run -it \
  -v $(pwd):/usr/src/app \
  -p 3000:3000 \
  node:24 bash -c "cd /usr/src/app && bash"
