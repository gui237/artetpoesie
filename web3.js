(function () {
  const connectButton = document.getElementById('connect-wallet');
  const addressEl = document.getElementById('wallet-address');
  const statusEl = document.getElementById('wallet-status');

  if (!connectButton || !addressEl || !statusEl) return;

  const setStatus = (message, type) => {
    statusEl.textContent = message;
    statusEl.className = 'wallet-status';
    if (type) statusEl.classList.add(type);
  };

  const showAddress = (address) => {
    addressEl.textContent = address;
    addressEl.title = address;
    addressEl.hidden = false;
    connectButton.textContent = 'Wallet connected';
  };

  const hasMetaMask = () => (
    typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask
  );

  if (!hasMetaMask()) {
    setStatus('MetaMask is not installed. Install the extension to connect a wallet.', 'error');
  }

  connectButton.addEventListener('click', async () => {
    if (!hasMetaMask()) {
      setStatus('MetaMask is not installed. Install the extension to connect a wallet.', 'error');
      return;
    }

    connectButton.disabled = true;
    const previousLabel = connectButton.textContent;
    connectButton.textContent = 'Connecting...';
    setStatus('Waiting for MetaMask...', '');

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const account = accounts && accounts[0];

      if (!account) {
        setStatus('No wallet address was returned by MetaMask.', 'error');
        connectButton.textContent = previousLabel;
        return;
      }

      showAddress(account);
      setStatus('Wallet connected. No payment, signature, or transaction was requested.', 'success');
    } catch (error) {
      const rejected = error && error.code === 4001;
      setStatus(
        rejected ? 'Wallet connection was cancelled.' : 'Unable to connect the wallet right now.',
        'error'
      );
      connectButton.textContent = previousLabel;
    } finally {
      connectButton.disabled = false;
    }
  });

  if (typeof window.ethereum !== 'undefined') {
    window.ethereum.on?.('accountsChanged', (accounts) => {
      const account = accounts && accounts[0];
      if (account) {
        showAddress(account);
        setStatus('Wallet address updated.', 'success');
      } else {
        addressEl.hidden = true;
        addressEl.textContent = '';
        addressEl.removeAttribute('title');
        connectButton.textContent = 'Connect Wallet';
        setStatus('Wallet disconnected.', '');
      }
    });
  }
}());
