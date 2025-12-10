import React, { useState } from 'react';

const NfcScanner = ({ roomId, onUidRegistered }) => {
 const [scanning, setScanning] = useState(false);
 const [error, setError] = useState('');

 const startScan = async () => {
   if (!navigator.nfc) {
     setError('Web NFC not supported. Use Chrome on Android.');
     return;
   }

   try {
     setScanning(true);
     setError('');

     const reading = await navigator.nfc.scan({
       techs: ['nfcA'],  // For NTAG215 (Type A)
       stayConnected: false,
       maxNumReadings: 1  // One tag scan
     });

     reading.onreading = (event) => {
       const uid = Array.from(event.serialNumber)  // Gets UID as byte array; convert to hex
         .map(b => b.toString(16).padStart(2, '0'))
         .join('').toUpperCase();

       console.log('NTAG215 UID:', uid);
       setScanning(false);

       // Trigger registration (e.g., send to Airtable)
       onUidRegistered(uid, roomId);
     };

     reading.onerror = () => {
       setError('Scan failed.');
       setScanning(false);
     };
   } catch (err) {
     setError(err.message || 'Scan error.');
     setScanning(false);
   }
 };

 return (
   <div>
     <button onClick={startScan} disabled={scanning}>
       {scanning ? 'Scanning...' : 'Tap NTAG215 Tag to Register'}
     </button>
     {error && <p style={{color: 'red'}}>{error}</p>}
   </div>
 );
};

export default NfcScanner;
