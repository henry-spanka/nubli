export enum GeneralState {
    IDLE,
    RECEIVING_DATA,
}

export enum PairingState {
    IDLE,
    FAILED,
    REQ_PUB_KEY,
    REQ_PUB_KEY_FIN,
    REQ_CHALLENGE,
    REQ_CHALLENGE_FIN,
    REQ_CHALLENGE_AUTH,
    REQ_CHALLENGE_AUTH_FIN,
    REQ_AUTH_ID_A,
    REQ_AUTH_ID_B,
    REQ_AUTH_ID_C,
    REQ_AUTH_ID_D,
    REQ_AUTH_ID_FIN,
    REQ_AUTH_ID_CONFIRM,
    PAIRED
}

export enum Command {
    REQUEST_DATA = 0x01,
    PUBLIC_KEY = 0x03,
    ERROR_REPORT = 0x12,
    CHALLENGE = 0x04,
    AUTH_AUTHENTICATOR = 0x05,
    AUTH_DATA = 0x06,
    AUTH_ID = 0x07,
    REQUEST_AUTHORIZATION_ENTRIES = 0x09,
    AUTHORIZATION_ENTRY = 0x0A,
    REQUEST_CONFIG = 0x14,
    CONFIG = 0x15,
    AUTH_ID_CONFIRM = 0x1E,
    STATUS = 0x0E,
    KEYTURNER_STATES = 0x0C,
    LOCK_ACTION = 0x0D,
    AUTHORIZATION_ENTRY_COUNT = 0x27,
    REQUEST_ADVANCED_CONFIG = 0x36
}

export enum PairingError {
    NOT_PAIRING = 0x10,
    BAD_AUTHENTICATOR = 0x11,
    BAD_PARAMETER = 0x12,
    MAX_USER = 0x13
}

export enum GeneralError {
    BAD_CRC = 0xFD,
    BAD_LENGTH = 0xFE,
    UNKNOWN = 0xFF
}

export enum KeyturnerError {
    BAD_PIN = 0x21
}

export enum Status {
    COMPLETE = 0x00
}

export enum NukiState {
    UNINITIALIZED = 0x00,
    PAIRING_MODE = 0x01,
    DOOR_MODE = 0x02,
    MAINTENANCE_MODE = 0x04
}

export enum LockState {
    UNCALIBRATED = 0x00,
    LOCKED = 0x01,
    UNLOCKING = 0x02,
    UNLOCKED = 0x03,
    LOCKING = 0x04,
    UNLATCHED = 0x05,
    UNLOCKED_LOCK_N_GO = 0x06,
    UNLATCHING = 0x07,
    CALIBRATION = 0xFC,
    BOOT_RUN = 0xFD,
    MOTOR_BLOCKED = 0xFE,
    UNDEFINED = 0xFF
}

export enum LockAction {
    UNLOCK = 0x01,
    LOCK = 0x02,
    UNLATCH = 0x03,
    LOCK_N_GO = 0x04,
    LOCK_N_GO_UNLATCH = 0x05,
    FULL_LOCK = 0x06,
    FOB_ACTION_1 = 0x81,
    FOB_ACTION_2 = 0x82,
    FOB_ACTION_3 = 0x83
}

export enum Trigger {
    SYSTEM = 0x00,
    MANUAL = 0x01,
    BUTTON = 0x02,
    AUTOMATIC = 0x03
}

export enum DoorSensor {
    UNAVAILABLE = 0x00,
    DEACTIVATED = 0x01,
    CLOSED = 0x02,
    OPEN = 0x03,
    UNKNOWN = 0x04,
    CALIBRATING = 0x05
}

export enum HomeKit {
    NOT_AVAILABLE = 0x00,
    DISABLED = 0x01,
    ENABLED = 0x02,
    ENABLED_PAIRED = 0x03
}

export enum DstMode {
    DISABLED = 0x00,
    EUROPEAN = 0x01
}

export enum FOB_ACTION {
    NO_ACTION = 0x00,
    UNLOCK = 0x01,
    LOCK = 0x02,
    LOCK_N_GO = 0x03,
    INTELLIGENT = 0x04
}

export enum ADVERTISING_MODE {
    AUTOMATIC = 0x00,
    NORMAL = 0x01,
    SLOW = 0x02,
    SLOWEST = 0x03
}

export enum BUTTON_PRESS_ACTION {
    NO_ACTION = 0x00,
    INTELLIGENT = 0x01,
    UNLOCK = 0x02,
    LOCK = 0x03,
    UNLATCH = 0x04,
    LOCK_N_GO = 0x05,
    SHOW_STATUS = 0x06
}

export enum BATTERY_TYPE {
    ALKALINE = 0x00,
    AKKUMULATORS = 0x01,
    LITHIUM = 0x02
}
