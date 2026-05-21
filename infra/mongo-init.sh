#!/bin/bash
# Inicializa o replica set rs0 (necessário para Change Streams do serviço jobs).
# Executado pelo docker-entrypoint-initdb.d apenas na primeira inicialização.
mongosh -u admin -p secret --authenticationDatabase admin --eval '
  rs.initiate({
    _id: "rs0",
    members: [{ _id: 0, host: "localhost:27017" }]
  })
'
