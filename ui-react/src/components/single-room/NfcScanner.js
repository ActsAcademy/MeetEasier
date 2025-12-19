import React, { Component } from 'react';
import PropTypes from 'prop-types';

/**
 * NfcScanner Component for Qbic TD-1050 Pro
 *
 * This component captures NFC tag UIDs from the device's HID keyboard mode.
 * When an NFC tag is scanned, the TD-1050 "types" the UID as keyboard input,
 * typically followed by an Enter key.
 *
 * The component listens for rapid keystrokes (characteristic of HID input)
 * and displays the captured UID.
 */
class NfcScanner extends Component {
  constructor(props) {
    super(props);
    this.state = {
      lastScannedUid: '',
      isScanning: false,
      scanHistory: []
    };

    // Buffer for accumulating keystrokes
    this._inputBuffer = '';
    this._lastKeyTime = 0;

    // HID readers typically type faster than 50ms between keystrokes
    this._HID_THRESHOLD_MS = 50;

    // Timeout to clear buffer if no rapid input continues
    this._bufferTimeout = null;
  }

  componentDidMount() {
    // Listen for keyboard events globally
    document.addEventListener('keydown', this.handleKeyDown);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleKeyDown);
    if (this._bufferTimeout) {
      clearTimeout(this._bufferTimeout);
    }
  }

  handleKeyDown = (event) => {
    const currentTime = Date.now();
    const timeSinceLastKey = currentTime - this._lastKeyTime;

    // Check if this is rapid input (HID keyboard mode)
    const isRapidInput = timeSinceLastKey < this._HID_THRESHOLD_MS;

    // If it's been too long since last key, reset the buffer
    if (!isRapidInput && this._inputBuffer.length > 0 && timeSinceLastKey > 200) {
      this._inputBuffer = '';
    }

    // Enter key signals end of NFC scan
    if (event.key === 'Enter') {
      if (this._inputBuffer.length > 0) {
        this.processScannedUid(this._inputBuffer);
        this._inputBuffer = '';
        event.preventDefault();
      }
      return;
    }

    // Only capture alphanumeric characters (UIDs are typically hex)
    if (event.key.length === 1 && /[a-fA-F0-9]/.test(event.key)) {
      // If this is rapid input or starting a new scan
      if (isRapidInput || this._inputBuffer.length === 0) {
        this._inputBuffer += event.key.toUpperCase();
        this._lastKeyTime = currentTime;

        // Show scanning state
        if (!this.state.isScanning) {
          this.setState({ isScanning: true });
        }

        // Clear buffer timeout and set a new one
        if (this._bufferTimeout) {
          clearTimeout(this._bufferTimeout);
        }

        // Auto-process after 500ms of no input (fallback if no Enter key)
        this._bufferTimeout = setTimeout(() => {
          if (this._inputBuffer.length >= 4) {
            this.processScannedUid(this._inputBuffer);
          }
          this._inputBuffer = '';
          this.setState({ isScanning: false });
        }, 500);

        // Prevent default to avoid interfering with other inputs
        event.preventDefault();
      }
    }
  }

  processScannedUid = (uid) => {
    const formattedUid = uid.toUpperCase();

    // eslint-disable-next-line no-console
    console.log('NFC Tag Scanned - UID:', formattedUid);

    // Update state with the scanned UID
    this.setState(prevState => ({
      lastScannedUid: formattedUid,
      isScanning: false,
      scanHistory: [
        { uid: formattedUid, timestamp: new Date() },
        ...prevState.scanHistory.slice(0, 4) // Keep last 5 scans
      ]
    }));

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
    const { lastScannedUid, isScanning, scanHistory } = this.state;
    const { showHistory } = this.props;

    return (
      <div className="nfc-scanner">
        <div className="nfc-scanner__status">
          {isScanning ? (
            <div className="nfc-scanner__scanning">
              <span className="nfc-scanner__icon">📡</span>
              <span>Scanning...</span>
            </div>
          ) : (
            <div className="nfc-scanner__ready">
              <span className="nfc-scanner__icon">💳</span>
              <span>Ready to scan NFC tag</span>
            </div>
          )}
        </div>

        {lastScannedUid && (
          <div className="nfc-scanner__result">
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
