import { useState } from "react";
import { ethers } from "ethers";
import toast from "react-hot-toast";

const TOKEN_ADDRESS = "0x9faEA50ed06Ca785221Eb153A2683663f7AF6579";
const USER_ADDRESS = "0x7d63Fb667BEd96D864e8a259d4CF3F0C2F5A8259";

const DebugBalances = () => {
  const [results, setResults] = useState([]);

  const addLog = (message) => {
    setResults((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] ${message}`,
    ]);
  };

  const checkWithMetaMask = async () => {
    try {
      addLog("=== Checking with MetaMask Provider ===");

      if (!window.ethereum) {
        addLog("ERROR: MetaMask not found!");
        return;
      }

      addLog("MetaMask detected");
      const provider = new ethers.BrowserProvider(window.ethereum);

      // Request accounts
      const accounts = await provider.send("eth_requestAccounts", []);
      addLog(`Connected account: ${accounts[0]}`);

      // Check network
      const network = await provider.getNetwork();
      addLog(`Network: ${network.name} (Chain ID: ${network.chainId})`);

      if (network.chainId !== 11155111n) {
        addLog("WARNING: Not on Sepolia! Please switch to Sepolia testnet");
        return;
      }

      // Check ETH balance
      const ethBalance = await provider.getBalance(accounts[0]);
      addLog(`ETH Balance (wei): ${ethBalance.toString()}`);
      addLog(`ETH Balance (formatted): ${ethers.formatEther(ethBalance)} ETH`);

      // Check ENGC token balance
      const TOKEN_ABI = ["function balanceOf(address) view returns (uint256)"];
      const tokenContract = new ethers.Contract(
        TOKEN_ADDRESS,
        TOKEN_ABI,
        provider
      );

      addLog(`Calling balanceOf for: ${accounts[0]}`);
      const tokenBalance = await tokenContract.balanceOf(accounts[0]);
      addLog(`ENGC Balance (wei): ${tokenBalance.toString()}`);
      addLog(
        `ENGC Balance (formatted): ${ethers.formatUnits(tokenBalance, 18)} ENGC`
      );

      toast.success("Balance check complete! See results below.");
    } catch (error) {
      addLog(`ERROR: ${error.message}`);
      console.error(error);
      toast.error("Error checking balances");
    }
  };

  const checkHardcodedAddress = async () => {
    try {
      addLog("=== Checking Hardcoded Address ===");
      addLog(`Address: ${USER_ADDRESS}`);

      if (!window.ethereum) {
        addLog("ERROR: MetaMask not found!");
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);

      // Check network
      const network = await provider.getNetwork();
      addLog(`Network: ${network.name} (Chain ID: ${network.chainId})`);

      // Check ETH balance
      const ethBalance = await provider.getBalance(USER_ADDRESS);
      addLog(`ETH Balance: ${ethers.formatEther(ethBalance)} ETH`);

      // Check ENGC token balance
      const TOKEN_ABI = ["function balanceOf(address) view returns (uint256)"];
      const tokenContract = new ethers.Contract(
        TOKEN_ADDRESS,
        TOKEN_ABI,
        provider
      );

      const tokenBalance = await tokenContract.balanceOf(USER_ADDRESS);
      addLog(`ENGC Balance: ${ethers.formatUnits(tokenBalance, 18)} ENGC`);

      toast.success("Balance check complete!");
    } catch (error) {
      addLog(`ERROR: ${error.message}`);
      console.error(error);
      toast.error("Error checking balances");
    }
  };

  return (
    <div className="min-h-screen bg-carbon-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold gradient-text mb-8">
          🔍 Debug Balance Checker
        </h1>

        <div className="glass-card mb-6">
          <h2 className="text-2xl font-semibold mb-4">Contract Info</h2>
          <div className="space-y-2 text-sm font-mono">
            <p>
              <span className="text-gray-400">Token Contract:</span>{" "}
              <span className="text-neon-green">{TOKEN_ADDRESS}</span>
            </p>
            <p>
              <span className="text-gray-400">Test Address:</span>{" "}
              <span className="text-neon-cyan">{USER_ADDRESS}</span>
            </p>
          </div>
        </div>

        <div className="glass-card mb-6">
          <h2 className="text-2xl font-semibold mb-4">Test Actions</h2>
          <div className="flex gap-4">
            <button onClick={checkWithMetaMask} className="neon-button">
              Check My MetaMask Address
            </button>
            <button onClick={checkHardcodedAddress} className="neon-button">
              Check Hardcoded Address
            </button>
            <button
              onClick={() => setResults([])}
              className="px-6 py-3 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
            >
              Clear Logs
            </button>
          </div>
        </div>

        <div className="glass-card">
          <h2 className="text-2xl font-semibold mb-4">Results</h2>
          <div className="bg-carbon-800 rounded-lg p-4 font-mono text-sm h-96 overflow-y-auto">
            {results.length === 0 ? (
              <p className="text-gray-500">
                Click a button above to run a test...
              </p>
            ) : (
              results.map((log, i) => (
                <div key={i} className="mb-1">
                  {log.includes("ERROR") ? (
                    <span className="text-red-400">{log}</span>
                  ) : log.includes("WARNING") ? (
                    <span className="text-yellow-400">{log}</span>
                  ) : log.includes("===") ? (
                    <span className="text-neon-cyan font-bold">{log}</span>
                  ) : (
                    <span className="text-gray-300">{log}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugBalances;
