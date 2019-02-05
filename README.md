# Nubli

Nubli is a Node.JS library for Nuki Smart Locks (**Nu**ki **B**luetooth **Li**brary)

![NPM](https://nodei.co/npm/nubli.png?compact=true)](https://npmjs.org/package/nubli)

# Features
* Get Lock State of Nuki Smart Lock (including door sensor)
* Unlock/Lock Door

# Supported devices
- Nuki Smart Lock v2.0

# Setup / Installation
1. `npm install nubli`
2. See [Examples](examples/) or documentation
3. Star the repository ;)

# Notes
This library is a work in progress and not yet stable. Use at your own risk. New features will be added as needed.

# Usage
```typescript
    const nubli = require('nubli');

    nubli.onReadyToScan()
    .then(() => {
        //nubli.startScanning();
    })
    .catch((err) => {
        console.log(err);
    });
```

## Actions

### Start Scanning for Nuki devices
```typescript
    nubli.startScanning(): void;
```

**Note**: Scanning requires the bluetooth device to be powered on. This may take a few milliseconds. Make sure to wait for the promise ```nubli.readyToScan()``` to resolve first.

### Stop Scanning for Nuki devices
```typescript
    nubli.stopScanning(): void;
```

### Connect to a Smart Lock
```typescript
    smartlock.connect(): Promise<void>;
```

### Disconnect from a Smart Lock
```typescript
    smartlock.disconnect(): Promise<void>;
```

**Note**: Before you can connect to a Smart Lock you need to call ```nubli.stopScanning()```

### Check if a config for the Smart Lock already exists
```typescript
    smartlock.configExists(path?: string): boolean;
```

### Read Smart Lock config
```typescript
    smartlock.readConfig(path?: string): Promise<void>);
```

### Save Smart Lock config
```typescript
    smartlock.saveConfig(path?: string): Promise<void>;
```

### Pair with a Smart Lock
```typescript
    smartlock.pair(): Promise<void>;
```

### Read lock state from Smart Lock
```typescript
    smartlock.readLockState(): Promise<SmartLockResponse>;
```

### Unlock door
```typescript
    smartlock.unlock(): Promise<SmartLockResponse>;
```

### Lock door
```typescript
    smartlock.lock(): Promise<SmartLockResponse>;
```

## Properties

### Check whether a Smart Lock is already paired
```typescript
    smartlock.paired: boolean;
```
## Events

### Nubli Smart Lock Discovered Event
```typescript
    nubli.on('smartLockDiscovered', (smartlock: SmartLock) => void);
```

### Nubli started scanning
```typescript
    nubli.on('startedScanning', () => void);
```

### Nubli stopped scanning
```typescript
    nubli.on('stoppedScanning', () => void);
```

### Smart Lock Connected Event
```typescript
    smartlock.on('connected', () => void);
```

### Smart Lock Disconnected Event
```typescript
    smartlock.on('disconnected', () => void);
```

### Smart Lock Error Event
```typescript
    smartlock.on('error', (err: string) => void);
```

# Help
If you have any questions or help please open an issue on the GitHub project page.

# Contributing
Pull requests are always welcome. If you have an issue or feature request please open a GitHub issue.

# License
The project is subject to the MIT license unless otherwise noted. A copy can be found in the root directory of the project [LICENSE](LICENSE).
