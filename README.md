# SkinsNFT

Marketplace de NFTs para skins de jogos construído com Next.js e Ethereum blockchain real.

## Pré-requisitos

- Node.js 18+
- npm ou yarn

## Configuração

### 1. Instalar dependências

```bash
cd skinsnft
npm install
```

### 2. Configurar variáveis de ambiente

Copie o arquivo `env.sample` para `.env`:

```bash
cp env.sample .env
```

### 3. Iniciar o nó Hardhat local

Em um terminal separado:

```bash
npm run hardhat:node
```

Isso iniciará um nó Ethereum local em `http://127.0.0.1:8545` com contas pré-financiadas.

### 4. Fazer deploy do contrato

```bash
npm run hardhat:deploy
```

Copie o endereço do contrato mostrado e adicione ao `.env`:

```
CONTRACT_ADDRESS=0x...
```

### 5. Configurar a chave privada do admin

Use a primeira conta do Hardhat (pré-financiada com 10000 ETH):

```
ADMIN_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

### 6. Executar o seed

```bash
npm run db:seed
```

### 7. Iniciar o servidor de desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Credenciais padrão

- **Admin**: `admin@local` / `admin123`

## Arquitetura

- **Smart Contract**: ERC-721 com marketplace integrado (listing/buy/cancel)
- **Backend**: Next.js API Routes com SQLite para dados de usuário
- **Blockchain**: Hardhat local ou Sepolia testnet
- **Frontend**: React com TailwindCSS

## Scripts disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia o servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run hardhat:node` | Inicia nó Ethereum local |
| `npm run hardhat:compile` | Compila os contratos |
| `npm run hardhat:deploy` | Deploy no localhost |
| `npm run hardhat:deploy:sepolia` | Deploy na Sepolia testnet |
| `npm run db:seed` | Popula o banco de dados |

## Deploy na Sepolia (Testnet)

1. Obtenha ETH de teste em [sepoliafaucet.com](https://sepoliafaucet.com)
2. Configure no `.env`:
   ```
   RPC_URL=https://rpc.sepolia.org
   DEPLOYER_PRIVATE_KEY=sua_chave_privada
   ADMIN_PRIVATE_KEY=sua_chave_privada
   ```
3. Execute:
   ```bash
   npm run hardhat:deploy:sepolia
   ```

## Fluxo de uso

1. Faça login (ou registre uma nova conta)
2. Cada usuário recebe uma wallet Ethereum automaticamente
3. Para comprar NFTs, você precisa de ETH na sua wallet
4. O admin pode enviar ETH para usuários via painel admin
5. Liste suas skins para venda definindo um preço em ETH
6. Outros usuários podem comprar enviando ETH diretamente pelo contrato
