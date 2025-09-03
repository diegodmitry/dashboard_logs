#!/bin/bash

# Script para testar conexão SSH com configurações de compatibilidade
# Equivalente ao comando: ssh -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedAlgorithms=+ssh-rsa

echo "🔐 Testando conexão SSH com configurações de compatibilidade..."

# Configurações SSH
SSH_HOST="${SSH_HOST:-10.17.145.128}"
SSH_USER="${SSH_USER:-ossadmin_altaia}"
SSH_KEY_PATH="${SSH_KEY_PATH:-~/.ssh/id_rsa}"

echo "📡 Conectando a: $SSH_USER@$SSH_HOST"
echo "🔑 Usando chave: $SSH_KEY_PATH"

# Testar conexão com configurações de compatibilidade
ssh -o HostKeyAlgorithms=+ssh-rsa \
    -o PubkeyAcceptedAlgorithms=+ssh-rsa \
    -o StrictHostKeyChecking=no \
    -i "$SSH_KEY_PATH" \
    "$SSH_USER@$SSH_HOST" \
    "echo '✅ Conexão SSH bem-sucedida!' && whoami && pwd"

if [ $? -eq 0 ]; then
    echo "🎉 Teste SSH passou com sucesso!"
else
    echo "❌ Falha na conexão SSH"
    exit 1
fi
