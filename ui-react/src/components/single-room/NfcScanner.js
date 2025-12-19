import React, { Component } from 'react';
import PropTypes from 'prop-types';

/**
 * NfcScanner Component for Qbic TD-1050 Pro
 *
 * This component captures NFC tag UIDs from the device's HID keyboard mode.
 * When an NFC tag is scanned, the TD-1050 "types" the UID as keyboard input
 * (hex digits only, no Enter key sent).
 *
 * The component captures all alphanumeric keystrokes and uses a timeout
 * to detect when the scan is complete.
 */
class NfcScanner extends Component {
  constructor(props) {
    super(props);
    this.state = {
      lastScannedUid: '',
      currentBuffer: '',
      isReceiving: false,
      showSuccess: false,
      scanHistory: []
    };

    // Buffer for accumulating keystrokes
    this._inputBuffer = '';

    // Timeout to detect end of input (no Enter key from TD-1050)
    this._bufferTimeout = null;

    // Timeout to hide success message
    this._successTimeout = null;

    // Idle time before processing buffer (ms)
    this._IDLE_TIMEOUT_MS = 300;
  }

  componentDidMount() {
    // Listen for keyboard events globally
    document.addEventListener('keydown', this.handleKeyDown);
    // eslint-disable-next-line no-console
    console.log('NfcScanner: Component mounted, listening for keyboard input');
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleKeyDown);
    if (this._bufferTimeout) {
      clearTimeout(this._bufferTimeout);
    }
    if (this._successTimeout) {
      clearTimeout(this._successTimeout);
    }
  }

  handleKeyDown = (event) => {
    // Enter key - process buffer immediately if we have content
    if (event.key === 'Enter') {
      if (this._inputBuffer.length > 0) {
        this.processScannedUid(this._inputBuffer);
        this._inputBuffer = '';
        event.preventDefault();
      }
      return;
    }

    // Capture alphanumeric characters (UIDs are hex: 0-9, A-F)
    // Also accept lowercase a-f which we'll convert to uppercase
    if (event.key.length === 1 && /[a-fA-F0-9]/.test(event.key)) {
      // Add character to buffer
      this._inputBuffer += event.key.toUpperCase();

      // Update UI to show receiving state
      this.setState({
        isReceiving: true,
        currentBuffer: this._inputBuffer,
        showSuccess: false
      });

      // Clear any existing timeout
      if (this._bufferTimeout) {
        clearTimeout(this._bufferTimeout);
      }

      // Set timeout to process buffer after idle period
      this._bufferTimeout = setTimeout(() => {
        if (this._inputBuffer.length >= 4) {
          this.processScannedUid(this._inputBuffer);
        } else {
          // Too short, probably not an NFC scan - clear it
          // eslint-disable-next-line no-console
          console.log('NfcScanner: Buffer too short, clearing:', this._inputBuffer);
        }
        this._inputBuffer = '';
        this.setState({
          isReceiving: false,
          currentBuffer: ''
        });
      }, this._IDLE_TIMEOUT_MS);

      // Prevent character from being typed elsewhere
      event.preventDefault();
    }
  }

  processScannedUid = (uid) => {
    const formattedUid = uid.toUpperCase();

    // eslint-disable-next-line no-console
    console.log('NfcScanner: Card scanned! UID:', formattedUid);

    // Clear success timeout if exists
    if (this._successTimeout) {
      clearTimeout(this._successTimeout);
    }

    // Update state with the scanned UID
    this.setState(prevState => ({
      lastScannedUid: formattedUid,
      isReceiving: false,
      currentBuffer: '',
      showSuccess: true,
      scanHistory: [
        { uid: formattedUid, timestamp: new Date() },
        ...prevState.scanHistory.slice(0, 4) // Keep last 5 scans
      ]
    }));

    // Hide success message after 5 seconds
    this._successTimeout = setTimeout(() => {
      this.setState({ showSuccess: false });
    }, 5000);

    // Call the callback if provided
    if (this.props.onUidScanned) {
      this.props.onUidScanned(formattedUid);
    }
  }

  formatTimestamp = (date) => {
    return date.toLocaleTimeString('en-GB', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  render() {
    const { lastScannedUid, currentBuffer, isReceiving, showSuccess, scanHistory } = this.state;
    const { showHistory } = this.props;

    return (
      <div className="nfc-scanner">
        <div className="nfc-scanner__status">
          {isReceiving ? (
            <div className="nfc-scanner__receiving">
              <span className="nfc-scanner__icon">📡</span>
              <span>Receiving: {currentBuffer}</span>
            </div>
          ) : showSuccess ? (
            <div className="nfc-scanner__success">
              <span className="nfc-scanner__icon">✅</span>
              <span>Card Scanned!</span>
            </div>
          ) : (
            <div className="nfc-scanner__ready">
              <span className="nfc-scanner__icon">💳</span>
              <span>Ready to scan NFC tag</span>
            </div>
          )}
        </div>

        {lastScannedUid && (
          <div className={`nfc-scanner__result ${showSuccess ? 'nfc-scanner__result--highlight' : ''}`}>
            <div className="nfc-scanner__label">Last Scanned UID:</div>
            <div className="nfc-scanner__uid">{lastScannedUid}</div>
          </div>
        )}

        {showHistory && scanHistory.length > 0 && (
          <div className="nfc-scanner__history">
            <div className="nfc-scanner__history-title">Scan History:</div>
            <ul className="nfc-scanner__history-list">
              {scanHistory.map((scan, index) => (
                <li key={index} className="nfc-scanner__history-item">
                  <span className="nfc-scanner__history-uid">{scan.uid}</span>
                  <span className="nfc-scanner__history-time">
                    {this.formatTimestamp(scan.timestamp)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }
}

NfcScanner.propTypes = {
  onUidScanned: PropTypes.func,
  showHistory: PropTypes.bool
};

NfcScanner.defaultProps = {
  showHistory: false
};

export default NfcScanner;
