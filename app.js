
class ArbiCoinGame {
    constructor() {
        this.gameState = {
            coins: 0,
            totalTaps: 0,
            level: 1,
            energy: 1000,
            maxEnergy: 1000,
            energyRegenRate: 1,
            tapPower: 1,
            upgrades: {
                tapPower: { level: 1, cost: 10 },
                energyBoost: { level: 1, cost: 25 },
                energyRegen: { level: 1, cost: 50 }
            }
        };

        this.wallet = {
            connected: false,
            address: null,
            balance: null,
            provider: null,
            signer: null
        };

        this.ARBITRUM_CHAIN_ID = '0xa4b1'; // Arbitrum One
        this.ARBITRUM_RPC = 'https://arb1.arbitrum.io/rpc';

        this.initializeGame();
        this.loadGameState();
        this.updateUI();
        this.startEnergyRegen();
    }

    initializeGame() {
        // Coin tap functionality
        document.getElementById('coinButton').addEventListener('click', () => this.tapCoin());

        // Upgrade buttons
        document.getElementById('upgradeTapPower').addEventListener('click', () => this.buyUpgrade('tapPower'));
        document.getElementById('upgradeEnergyBoost').addEventListener('click', () => this.buyUpgrade('energyBoost'));
        document.getElementById('upgradeEnergyRegen').addEventListener('click', () => this.buyUpgrade('energyRegen'));

        // Wallet connection
        document.getElementById('connectWallet').addEventListener('click', () => this.connectWallet());

        // Check if MetaMask is available
        if (typeof window.ethereum !== 'undefined') {
            console.log('MetaMask detected');
        } else {
            console.log('MetaMask not detected');
            document.getElementById('connectWallet').textContent = 'Install MetaMask';
            document.getElementById('connectWallet').disabled = true;
        }
    }

    tapCoin() {
        if (this.gameState.energy > 0) {
            this.gameState.energy--;
            this.gameState.coins += this.gameState.tapPower;
            this.gameState.totalTaps++;

            // Level progression
            const newLevel = Math.floor(this.gameState.totalTaps / 100) + 1;
            if (newLevel > this.gameState.level) {
                this.gameState.level = newLevel;
                this.showNotification(`Level Up! You're now level ${newLevel}!`);
            }

            this.createTapAnimation();
            this.updateUI();
            this.saveGameState();
        }
    }

    createTapAnimation() {
        const container = document.querySelector('.tap-animation-container');
        const animation = document.createElement('div');
        animation.className = 'tap-animation';
        animation.textContent = `+${this.gameState.tapPower}`;
        
        // Random position around the coin
        const randomX = (Math.random() - 0.5) * 100;
        const randomY = (Math.random() - 0.5) * 100;
        animation.style.left = `${randomX}px`;
        animation.style.top = `${randomY}px`;
        
        container.appendChild(animation);
        
        setTimeout(() => {
            container.removeChild(animation);
        }, 1000);
    }

    buyUpgrade(upgradeType) {
        const upgrade = this.gameState.upgrades[upgradeType];
        
        if (this.gameState.coins >= upgrade.cost) {
            this.gameState.coins -= upgrade.cost;
            upgrade.level++;
            
            switch(upgradeType) {
                case 'tapPower':
                    this.gameState.tapPower++;
                    upgrade.cost = Math.floor(upgrade.cost * 1.5);
                    break;
                case 'energyBoost':
                    this.gameState.maxEnergy += 100;
                    this.gameState.energy = this.gameState.maxEnergy;
                    upgrade.cost = Math.floor(upgrade.cost * 1.8);
                    break;
                case 'energyRegen':
                    this.gameState.energyRegenRate++;
                    upgrade.cost = Math.floor(upgrade.cost * 2);
                    break;
            }
            
            this.updateUI();
            this.saveGameState();
            this.showNotification(`${upgradeType} upgraded!`);
        }
    }

    startEnergyRegen() {
        setInterval(() => {
            if (this.gameState.energy < this.gameState.maxEnergy) {
                this.gameState.energy = Math.min(
                    this.gameState.maxEnergy,
                    this.gameState.energy + this.gameState.energyRegenRate
                );
                this.updateUI();
            }
        }, 1000);
    }

    updateUI() {
        // Update stats
        document.getElementById('coinCount').textContent = this.gameState.coins.toLocaleString();
        document.getElementById('level').textContent = this.gameState.level;
        document.getElementById('totalTaps').textContent = this.gameState.totalTaps.toLocaleString();
        
        // Update energy
        document.getElementById('energyCount').textContent = this.gameState.energy;
        document.getElementById('maxEnergy').textContent = this.gameState.maxEnergy;
        const energyPercentage = (this.gameState.energy / this.gameState.maxEnergy) * 100;
        document.getElementById('energyFill').style.width = `${energyPercentage}%`;
        
        // Update upgrades
        this.updateUpgradeUI('tapPower', this.gameState.tapPower);
        this.updateUpgradeUI('energyBoost', this.gameState.maxEnergy);
        this.updateUpgradeUI('energyRegen', this.gameState.energyRegenRate);

        // Disable coin button if no energy
        document.getElementById('coinButton').disabled = this.gameState.energy === 0;
    }

    updateUpgradeUI(upgradeType, value) {
        const upgrade = this.gameState.upgrades[upgradeType];
        document.getElementById(`${upgradeType}Level`).textContent = upgrade.level;
        document.getElementById(`${upgradeType}Cost`).textContent = upgrade.cost;
        
        if (upgradeType === 'tapPower') {
            document.getElementById('tapPowerBonus').textContent = value;
        } else if (upgradeType === 'energyBoost') {
            document.getElementById('energyBoostValue').textContent = value;
        } else if (upgradeType === 'energyRegen') {
            document.getElementById('energyRegenRate').textContent = value;
        }
        
        const button = document.getElementById(`upgrade${upgradeType.charAt(0).toUpperCase() + upgradeType.slice(1)}`);
        button.disabled = this.gameState.coins < upgrade.cost;
    }

    async connectWallet() {
        if (typeof window.ethereum === 'undefined') {
            alert('Please install MetaMask to connect your wallet!');
            return;
        }

        try {
            // Request account access
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            if (accounts.length === 0) {
                throw new Error('No accounts found');
            }

            this.wallet.provider = new ethers.providers.Web3Provider(window.ethereum);
            this.wallet.signer = this.wallet.provider.getSigner();
            this.wallet.address = accounts[0];
            this.wallet.connected = true;

            // Switch to Arbitrum network
            await this.switchToArbitrum();
            
            // Get balance
            await this.updateWalletBalance();
            
            this.updateWalletUI();
            this.showNotification('Wallet connected successfully!');

            // Listen for account changes
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length === 0) {
                    this.disconnectWallet();
                } else {
                    this.wallet.address = accounts[0];
                    this.updateWalletBalance();
                    this.updateWalletUI();
                }
            });

            // Listen for network changes
            window.ethereum.on('chainChanged', (chainId) => {
                this.updateWalletUI();
            });

        } catch (error) {
            console.error('Failed to connect wallet:', error);
            this.showNotification('Failed to connect wallet. Please try again.');
        }
    }

    async switchToArbitrum() {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: this.ARBITRUM_CHAIN_ID }],
            });
        } catch (switchError) {
            // This error code indicates that the chain has not been added to MetaMask
            if (switchError.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [
                            {
                                chainId: this.ARBITRUM_CHAIN_ID,
                                chainName: 'Arbitrum One',
                                nativeCurrency: {
                                    name: 'Ethereum',
                                    symbol: 'ETH',
                                    decimals: 18,
                                },
                                rpcUrls: [this.ARBITRUM_RPC],
                                blockExplorerUrls: ['https://arbiscan.io/'],
                            },
                        ],
                    });
                } catch (addError) {
                    console.error('Failed to add Arbitrum network:', addError);
                }
            }
        }
    }

    async updateWalletBalance() {
        if (this.wallet.connected && this.wallet.provider) {
            try {
                const balance = await this.wallet.provider.getBalance(this.wallet.address);
                this.wallet.balance = ethers.utils.formatEther(balance);
            } catch (error) {
                console.error('Failed to get balance:', error);
            }
        }
    }

    updateWalletUI() {
        const connectButton = document.getElementById('connectWallet');
        const walletInfo = document.getElementById('walletInfo');
        
        if (this.wallet.connected) {
            connectButton.style.display = 'none';
            walletInfo.classList.remove('hidden');
            
            document.getElementById('walletAddress').textContent = 
                `Address: ${this.wallet.address.slice(0, 6)}...${this.wallet.address.slice(-4)}`;
            
            if (this.wallet.balance) {
                document.getElementById('ethBalance').textContent = 
                    `Balance: ${parseFloat(this.wallet.balance).toFixed(4)} ETH`;
            }
            
            // Check network
            const currentChainId = window.ethereum.chainId;
            const networkStatus = document.getElementById('networkStatus');
            if (currentChainId === this.ARBITRUM_CHAIN_ID) {
                networkStatus.textContent = '🟢 Arbitrum One';
                networkStatus.style.color = '#4CAF50';
            } else {
                networkStatus.textContent = '🔴 Wrong Network';
                networkStatus.style.color = '#F44336';
            }
        } else {
            connectButton.style.display = 'block';
            walletInfo.classList.add('hidden');
        }
    }

    disconnectWallet() {
        this.wallet.connected = false;
        this.wallet.address = null;
        this.wallet.balance = null;
        this.wallet.provider = null;
        this.wallet.signer = null;
        this.updateWalletUI();
    }

    showNotification(message) {
        // Create a simple notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(76, 175, 80, 0.9);
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    saveGameState() {
        localStorage.setItem('arbiCoinGame', JSON.stringify(this.gameState));
    }

    loadGameState() {
        const saved = localStorage.getItem('arbiCoinGame');
        if (saved) {
            const savedState = JSON.parse(saved);
            this.gameState = { ...this.gameState, ...savedState };
        }
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ArbiCoinGame();
});

// Add CSS for notification animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(style);
