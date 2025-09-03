# Configuração SSH para Servidores Legados

Este documento explica como configurar a conexão SSH para servidores que usam algoritmos de criptografia legados (como `ssh-rsa`).

## 🚨 Problema

Servidores SSH mais antigos podem usar algoritmos de criptografia que não são mais suportados por padrão nas versões mais recentes do OpenSSH. Isso resulta em erros como:

```
Unable to negotiate with 10.17.145.128 port 22: no matching host key type found. Their offer: ssh-rsa
```

## ✅ Solução

### Opção 1: Arquivo de Configuração SSH (Recomendado)

1. **Copie o arquivo de configuração**:
```bash
cp backend/ssh_config ~/.ssh/config
```

2. **Ajuste as permissões**:
```bash
chmod 600 ~/.ssh/config
```

3. **Teste a conexão**:
```bash
ssh ossadmin_altaia@10.17.145.128
```

### Opção 2: Comando SSH com Opções

Use o comando SSH com as opções de compatibilidade:

```bash
ssh -o HostKeyAlgorithms=+ssh-rsa \
    -o PubkeyAcceptedAlgorithms=+ssh-rsa \
    ossadmin_altaia@10.17.145.128
```

### Opção 3: Script de Teste

Execute o script de teste incluído:

```bash
# No diretório backend
npm run test:ssh:bash

# Ou diretamente
./scripts/testSSHConnection.sh
```

## 🔧 Configurações Incluídas

O arquivo `backend/ssh_config` inclui:

- `HostKeyAlgorithms +ssh-rsa` - Aceita chaves de host ssh-rsa
- `PubkeyAcceptedAlgorithms +ssh-rsa` - Aceita chaves públicas ssh-rsa
- `KexAlgorithms +diffie-hellman-group1-sha1` - Algoritmos de troca de chaves
- `Ciphers +aes128-cbc,3des-cbc` - Cifras de compatibilidade
- `MACs +hmac-sha1,hmac-sha1-96` - Algoritmos de MAC
- `StrictHostKeyChecking no` - Não verifica chaves de host (desenvolvimento)

## 🧪 Testando no Código

### Teste TypeScript
```bash
npm run test:ssh
```

### Teste Bash
```bash
npm run test:ssh:bash
```

## 📝 Variáveis de Ambiente

Configure no arquivo `.env`:

```env
SSH_HOST=10.17.145.128
SSH_USER=ossadmin_altaia
SSH_PORT=22
SSH_KEY_PATH=/path/to/your/private/key
SSH_TIMEOUT=15000
```

## ⚠️ Considerações de Segurança

- **Desenvolvimento**: As configurações são seguras para desenvolvimento
- **Produção**: Considere atualizar o servidor SSH para algoritmos mais modernos
- **Chaves**: Mantenha suas chaves SSH seguras (permissão 600)

## 🔍 Troubleshooting

### Erro: "Permission denied (publickey)"
- Verifique se a chave SSH está correta
- Confirme as permissões da chave (600)
- Verifique se o usuário SSH está correto

### Erro: "Connection timed out"
- Verifique se o servidor está acessível
- Confirme a porta SSH (22)
- Teste conectividade de rede

### Erro: "Algorithm negotiation failed"
- Use o arquivo `ssh_config` fornecido
- Ou execute com as opções de compatibilidade
