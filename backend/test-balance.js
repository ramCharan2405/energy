const { ethers } = require('ethers');

// Configuration
const RPC_URL = 'https://eth-sepolia.g.alchemy.com/v2/ehJHDUZHkbco8umrsZFH1XfD7o-zDJPJC0';
const TOKEN_ADDRESS = '0x9faEA50ed06Ca785221Eb153A2683663f7AF6579';
const USER_ADDRESS = '0x7d63Fb667BEd96D864e8a259d4CF3F0C2F5A8259';

// Token ABI (only what we need)
const TOKEN_ABI = [
    'function balanceOf(address owner) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
    'function totalSupply() view returns (uint256)'
];

async function checkBalance() {
    try {
        console.log('Connecting to Sepolia...');
        const provider = new ethers.JsonRpcProvider(RPC_URL);

        console.log('Creating token contract instance...');
        const tokenContract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, provider);

        console.log('\n=== Token Information ===');
        const symbol = await tokenContract.symbol();
        console.log('Symbol:', symbol);

        const decimals = await tokenContract.decimals();
        console.log('Decimals:', decimals);

        const totalSupply = await tokenContract.totalSupply();
        console.log('Total Supply:', ethers.formatUnits(totalSupply, decimals), symbol);

        console.log('\n=== User Balance ===');
        console.log('Address:', USER_ADDRESS);

        const balanceWei = await tokenContract.balanceOf(USER_ADDRESS);
        console.log('Balance (wei):', balanceWei.toString());
        console.log('Balance (tokens):', ethers.formatUnits(balanceWei, decimals), symbol);

        // Also check ETH balance
        console.log('\n=== ETH Balance ===');
        const ethBalance = await provider.getBalance(USER_ADDRESS);
        console.log('ETH Balance:', ethers.formatEther(ethBalance), 'ETH');

    } catch (error) {
        console.error('Error:', error.message);
        console.error(error);
    }
}

checkBalance();
