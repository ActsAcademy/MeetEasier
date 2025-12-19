import React, { Component } from 'react';
import PropTypes from 'prop-types';

/**
 * NfcScanner Component for Qbic TD-1050 Pro
 *
 * This component captures NFC tag UIDs from the device's HID keyboard mode.
 * It uses an actual input field to reliably capture keyboard input,
 * which works better than global event listeners in kiosk/embedded browsers.
 *
 * The TD-1050 outputs plain hex digits (no Enter key) when an NFC tag is scanned.
 */
class NfcScanner extends Component {
  constructor(props) {
    super(props);
    this.state = {
      inputValue: '',
      lastScannedUid: '',
      showSuccess: false,
      scanHistory: []
    };

    this.inputRef = React.createRef();
    this._processTimeout = null;
    this._focusInterval = null;

    // Time to wait after last keystroke before processing (ms)
    this._IDLE_TIMEOUT_MS = 500;
  }

  componentDidMount() {
    // Focus the input field initially
    this.focusInput();

    // Keep the input focused - check every 2 seconds
    // This ensures the input regains focus if something else takes it
    this._focusInterval = setInterval(() => {
      this.focusInput();
    }, 2000);

    // eslint-disable-next-line no-console
    console.log('NfcScanner: Component mounted, input field ready');
  }

  componentWillUnmount() {
    if (this._processTimeout) {
      clearTimeout(this._processTimeout);
    }
    if (this._focusInterval) {
      clearInterval(this._focusInterval);
    }
  }

  focusInput = () => {
    if (this.inputRef.current) {
      this.inputRef.current.focus();
    }
  }

  handleInputChange = (event) => {
    const value = event.target.value.toUpperCase();

    // Only keep hex characters (0-9, A-F)
    const hexOnly = value.replace(/[^0-9A-F]/g, '');

    this.setState({ inputValue: hexOnly });

    // eslint-disable-next-line no-console
    console.log('NfcScanner: Input changed:', hexOnly);

    // Clear any existing timeout
    if (this._processTimeout) {
      clearTimeout(this._processTimeout);
    }

    // Set timeout to process after idle period
    if (hexOnly.length > 0) {
      this._processTimeout = setTimeout(() => {
        this.processScannedUid(hexOnly);
      }, this._IDLE_TIMEOUT_MS);
    }
  }

  handleKeyDown = (event) => {
    // If Enter is pressed, process immediately
    if (event.key === 'Enter' && this.state.inputValue.length > 0) {
      if (this._processTimeout) {
        clearTimeout(this._processTimeout);
      }
      this.processScannedUid(this.state.inputValue);
      event.preventDefault();
    }
  }

  processScannedUid = (uid) => {
    if (uid.length < 4) {
      // eslint-disable-next-line no-console
      console.log('NfcScanner: UID too short, ignoring:', uid);
      this.setState({ inputValue: '' });
      return;
    }

    // eslint-disable-next-line no-console
    console.log('NfcScanner: Card scanned! UID:', uid);

    // Update state with the scanned UID
    this.setState(prevState => ({
      inputValue: '',
      lastScannedUid: uid,
      showSuccess: true,
      scanHistory: [
        { uid: uid, timestamp: new Date() },
        ...prevState.scanHistory.slice(0, 4)
      ]
    }));

    // Hide success message after 5 seconds
    setTimeout(() => {
      this.setState({ showSuccess: false });
    }, 5000);

    // Call the callback if provided
    if (this.props.onUidScanned) {
      this.props.onUidScanned(uid);
    }

    // Refocus input for next scan
    setTimeout(() => this.focusInput(), 100);
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
    const { inputValue, lastScannedUid, showSuccess, scanHistory } = this.state;
    const { showHistory } = this.props;

    return (
      <div className="nfc-scanner">
        {/* Input field for capturing NFC/keyboard input */}
        <div className="nfc-scanner__input-wrap">
          <label className="nfc-scanner__input-label">
            Scan NFC Tag:
          </label>
          <input
            ref={this.inputRef}
            type="text"
            className="nfc-scanner__input"
            value={inputValue}
            onChange={this.handleInputChange}
            onKeyDown={this.handleKeyDown}
            placeholder="Waiting for NFC scan..."
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />
        </div>

        {/* Status indicator */}
        <div className="nfc-scanner__status">
          {inputValue.length > 0 ? (
            <div className="nfc-scanner__receiving">
              <span className="nfc-scanner__icon">📡</span>
              <span>Receiving: {inputValue}</span>
            </div>
          ) : showSuccess ? (
            <div className="nfc-scanner__success">
              <span className="nfc-scanner__icon">✅</span>
              <span>Card Scanned!</span>
            </div>
          ) : (
            <div className="nfc-scanner__ready">
              <span className="nfc-scanner__icon">💳</span>
              <span>Ready - tap card or type UID</span>
            </div>
          )}
        </div>

        {/* Last scanned UID */}
        {lastScannedUid && (
          <div className={`nfc-scanner__result ${showSuccess ? 'nfc-scanner__result--highlight' : ''}`}>
            <div className="nfc-scanner__label">Last Scanned UID:</div>
            <div className="nfc-scanner__uid">{lastScannedUid}</div>
          </div>
        )}

        {/* Scan history */}
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
