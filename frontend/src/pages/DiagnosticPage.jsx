import { useState, useEffect } from "react";
import {
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
} from "react-icons/fa";

const DiagnosticPage = () => {
  const [diagnostics, setDiagnostics] = useState({
    metamaskInstalled: false,
    metamaskUnlocked: false,
    correctNetwork: false,
    accountConnected: false,
    backendReachable: false,
    details: {},
  });
  const [testing, setTesting] = useState(true);
  const [logs, setLogs] = useState([]);

  const addLog = (message, type = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { timestamp, message, type }]);
    console.log(`[Diagnostic ${type}]`, message);
  };

  useEffect(() => {
    runDiagnostics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runDiagnostics = async () => {
    setTesting(true);
    setLogs([]);
    const results = {
      metamaskInstalled: false,
      metamaskUnlocked: false,
      correctNetwork: false,
      accountConnected: false,
      backendReachable: false,
      details: {},
    };

    try {
      // Test 1: MetaMask Installation
      addLog("Checking MetaMask installation...", "info");
      if (typeof window.ethereum !== "undefined") {
        results.metamaskInstalled = true;
        results.details.ethereumObject = "Found";
        addLog("✓ MetaMask is installed", "success");

        // Test 2: MetaMask Provider
        try {
          const accounts = await window.ethereum.request({
            method: "eth_accounts",
          });

          if (accounts.length > 0) {
            results.metamaskUnlocked = true;
            results.accountConnected = true;
            results.details.account = accounts[0];
            addLog(
              `✓ MetaMask is unlocked and connected: ${accounts[0]}`,
              "success"
            );
          } else {
            results.metamaskUnlocked = true;
            results.details.account = "Not connected";
            addLog(
              "⚠ MetaMask is unlocked but not connected to this site",
              "warning"
            );
          }

          // Test 3: Network Check
          const chainId = await window.ethereum.request({
            method: "eth_chainId",
          });
          const chainIdDecimal = parseInt(chainId, 16);
          results.details.chainId = chainIdDecimal;
          results.details.chainIdHex = chainId;

          if (chainIdDecimal === 11155111) {
            results.correctNetwork = true;
            addLog("✓ Connected to Sepolia testnet", "success");
          } else {
            addLog(
              `⚠ Wrong network: ${chainIdDecimal} (expected 11155111 for Sepolia)`,
              "warning"
            );
          }

          // Test 4: Get Balance
          if (accounts.length > 0) {
            const balance = await window.ethereum.request({
              method: "eth_getBalance",
              params: [accounts[0], "latest"],
            });
            const ethBalance = parseInt(balance, 16) / 1e18;
            results.details.ethBalance = ethBalance.toFixed(4);
            addLog(`Balance: ${ethBalance.toFixed(4)} ETH`, "info");
          }
        } catch (error) {
          addLog(`✗ Error checking MetaMask: ${error.message}`, "error");
          results.details.metamaskError = error.message;
        }
      } else {
        addLog("✗ MetaMask is NOT installed", "error");
        results.details.ethereumObject = "Not found";
      }

      // Test 5: Backend Connection
      addLog("Checking backend connection...", "info");
      try {
        // Try the base API endpoint first
        const response = await fetch("http://localhost:5000/api/v1", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.ok || response.status === 404) {
          // 404 is actually good - means backend is running but route doesn't exist
          results.backendReachable = true;
          addLog("✓ Backend is reachable", "success");
        } else {
          addLog(`⚠ Backend returned status: ${response.status}`, "warning");
        }
      } catch (error) {
        addLog(`✗ Cannot reach backend: ${error.message}`, "error");
        addLog(
          "Make sure backend is running: cd backend && npm run dev",
          "error"
        );
        results.details.backendError = error.message;
      }

      // Browser Info
      results.details.browser = navigator.userAgent;
      addLog(
        `Browser: ${navigator.userAgent.split(" ").slice(-2).join(" ")}`,
        "info"
      );
    } catch (error) {
      addLog(`✗ Unexpected error: ${error.message}`, "error");
      results.details.unexpectedError = error.message;
    }

    setDiagnostics(results);
    setTesting(false);
    addLog("Diagnostic complete!", "success");
  };

  const testConnection = async () => {
    addLog("Attempting to connect to MetaMask...", "info");
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      addLog(`✓ Connected to account: ${accounts[0]}`, "success");
      runDiagnostics(); // Re-run diagnostics
    } catch (error) {
      addLog(`✗ Connection failed: ${error.message}`, "error");
      if (error.code === 4001) {
        addLog("User rejected the connection request", "warning");
      }
    }
  };

  const StatusIcon = ({ status }) => {
    if (status) return <FaCheckCircle className="text-green-500 text-2xl" />;
    return <FaTimesCircle className="text-red-500 text-2xl" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800 rounded-lg shadow-2xl p-8 border border-gray-700">
          <h1 className="text-3xl font-bold text-white mb-2">
            Wallet Connection Diagnostics
          </h1>
          <p className="text-gray-400 mb-6">
            Testing all components of the wallet connection
          </p>

          <button
            onClick={runDiagnostics}
            disabled={testing}
            className="mb-6 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {testing ? "Testing..." : "Run Tests Again"}
          </button>

          {/* Status Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-gray-700 rounded-lg p-4 flex items-center justify-between">
              <span className="text-white font-medium">MetaMask Installed</span>
              <StatusIcon status={diagnostics.metamaskInstalled} />
            </div>
            <div className="bg-gray-700 rounded-lg p-4 flex items-center justify-between">
              <span className="text-white font-medium">MetaMask Unlocked</span>
              <StatusIcon status={diagnostics.metamaskUnlocked} />
            </div>
            <div className="bg-gray-700 rounded-lg p-4 flex items-center justify-between">
              <span className="text-white font-medium">
                Correct Network (Sepolia)
              </span>
              <StatusIcon status={diagnostics.correctNetwork} />
            </div>
            <div className="bg-gray-700 rounded-lg p-4 flex items-center justify-between">
              <span className="text-white font-medium">Account Connected</span>
              <StatusIcon status={diagnostics.accountConnected} />
            </div>
            <div className="bg-gray-700 rounded-lg p-4 flex items-center justify-between">
              <span className="text-white font-medium">Backend Reachable</span>
              <StatusIcon status={diagnostics.backendReachable} />
            </div>
          </div>

          {/* Connect Button */}
          {diagnostics.metamaskInstalled && !diagnostics.accountConnected && (
            <div className="mb-6 p-4 bg-yellow-900/30 border border-yellow-600 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <FaExclamationTriangle className="text-yellow-500 text-xl" />
                <p className="text-yellow-200 font-medium">
                  MetaMask is not connected to this site
                </p>
              </div>
              <button
                onClick={testConnection}
                className="px-6 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition"
              >
                Connect MetaMask
              </button>
            </div>
          )}

          {/* Details */}
          <div className="bg-gray-700 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-white mb-3">Details</h3>
            <div className="space-y-2 text-sm font-mono">
              {Object.entries(diagnostics.details).map(([key, value]) => (
                <div
                  key={key}
                  className="flex justify-between border-b border-gray-600 pb-2"
                >
                  <span className="text-gray-400">{key}:</span>
                  <span className="text-gray-200 text-right ml-4 break-all max-w-md">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Console Logs */}
          <div className="bg-black rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">
              Console Output
            </h3>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className={`text-sm font-mono ${
                    log.type === "error"
                      ? "text-red-400"
                      : log.type === "warning"
                      ? "text-yellow-400"
                      : log.type === "success"
                      ? "text-green-400"
                      : "text-gray-400"
                  }`}
                >
                  <span className="text-gray-600">[{log.timestamp}]</span>{" "}
                  {log.message}
                </div>
              ))}
            </div>
          </div>

          {/* Instructions */}
          {!diagnostics.metamaskInstalled && (
            <div className="mt-6 p-4 bg-red-900/30 border border-red-600 rounded-lg">
              <h4 className="text-red-400 font-semibold mb-2">
                MetaMask Not Detected
              </h4>
              <p className="text-gray-300 mb-3">
                Please install MetaMask browser extension to continue.
              </p>
              <a
                href="https://metamask.io/download/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition"
              >
                Install MetaMask
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiagnosticPage;
