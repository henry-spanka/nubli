import { PairingError, GeneralError, KeyturnerError }  from "./states";

export class ErrorHandler {
    static errorToMessage(errCode: number): string {
        switch (errCode) {
            case PairingError.NOT_PAIRING:
                return "The SmartLock is not in pairing mode";
            case PairingError.BAD_AUTHENTICATOR:
                return "The received authenticator does not matched the calculated one";
            case PairingError.BAD_PARAMETER:
                return "Parameter out of range";
            case PairingError.MAX_USER:
                return "Maximum number of users reached";
            case GeneralError.BAD_CRC:
                return "CRC does not match";
            case GeneralError.BAD_LENGTH:
                return "Unexpected length of payload";
            case GeneralError.UNKNOWN:
                return "Unknown error";
            case KeyturnerError.BAD_PIN:
                return "The provided PIN is invalid";

            default:
                return "Unknown error - code: 0x" + errCode.toString(16);
        }
    }
}
