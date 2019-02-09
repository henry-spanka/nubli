const nubli = require('../dist/index.js');

nubli.setDebug(true);

nubli.onReadyToScan()
    .then(() => {
        console.log("Ready to scan :)");
        nubli.startScanning();
    })
    .catch((err) => {
        console.log(err);
    });

let start;


nubli.on("smartLockDiscovered", async (smartlock) => {
    nubli.stopScanning();

    smartlock.on("connected", () => {
        start = new Date();
        console.log("connected");

        setInterval(async () => {
            let lockState = await smartlock.readLockState();
            console.log(lockState);
        }, 5000);
    });
    

    smartlock.on("disconnected", () => {
        let end = new Date() - start;
        console.log("disconnected after: ", end, "ms");
    })

    if (smartlock.configExists()) {
        await smartlock.readConfig();
    }

    smartlock.connect();
});
