const nubli = require('../dist/index.js').default;

nubli.setDebug(true);

nubli.onReadyToScan()
    .then(() => {
        console.log("Ready to scan :)");
        nubli.startScanning();
    })
    .catch((err) => {
        console.log(err);
    });

nubli.on("smartLockDiscovered", (smartlock) => {
    console.log("Discovered smart lock");
});
