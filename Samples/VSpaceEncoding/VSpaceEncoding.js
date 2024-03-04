/* Copyright © 2024, Daniel Vaughan. All rights reserved.
   Licensed under the MIT license. See the LICENSE file. */

class Characters {
    static NonBreakingSpace = '\u00A0';
    static LineFeed = '\n';
    static HorizontalTab = '\t';
    static CarriageReturn = '\r';
    static Space = '\u0020';
    static SoftHyphen = '\u00AD';
}

const symbolsDefault = [Characters.Space, Characters.NonBreakingSpace, Characters.HorizontalTab];

class Base64PreEncoder {
    constructor() {
        this.symbolCount = 64;
    }

    encode(asciiText) {
        let base64String = btoa(encodeURIComponent(asciiText));

        // Strip '=' characters from the end of the Base64 encoded string
        let strippedBase64String = base64String.replace(/=+$/, '');
        return [...strippedBase64String].map(symbol => this.convertTo6Bit(symbol));
    }

    decode(values) {
        let base64String = values.map(value => this.convertFrom6Bit(value)).join('');
        let mod4 = base64String.length % 4;
        if (mod4 > 0) {
            base64String += '='.repeat(4 - mod4);
        }

        let decodedString = decodeURIComponent(atob(base64String));

        return decodedString;
    }

    convertTo6Bit(c) {
        if (c >= 'A' && c <= 'Z') {
            return c.charCodeAt(0) - 'A'.charCodeAt(0);
        }
        if (c >= 'a' && c <= 'z') {
            return c.charCodeAt(0) - 'a'.charCodeAt(0) + 26;
        }
        if (c >= '0' && c <= '9') {
            return c.charCodeAt(0) - '0'.charCodeAt(0) + 52;
        }
        if (c === '+') {
            return 62;
        }
        if (c === '/') {
            return 63;
        }

        throw new Error(`Invalid character for Base64 encoding: ${c}`);
    }

    convertFrom6Bit(value) {
        if (value < 26) {
            return String.fromCharCode('A'.charCodeAt(0) + value);
        }
        if (value < 52) {
            return String.fromCharCode('a'.charCodeAt(0) + value - 26);
        }
        if (value < 62) {
            return String.fromCharCode('0'.charCodeAt(0) + value - 52);
        }
        if (value === 62) {
            return '+';
        }
        if (value === 63) {
            return '/';
        }

        throw new Error("Invalid 6-bit value.");
    }
}

class AsciiVSpaceEncoder {
    constructor(symbols = null, preEncoder = null) {
        this.preEncoder = preEncoder || new Base64PreEncoder();
        this.symbols = symbols || symbolsDefault;
        if (this.symbols.length === 0) {
            throw new Error("Must not contain zero items.");
        }
        this.symbols.sort();
        this.charToIndexMap = {};
        this.symbols.forEach((symbol, index) => {
            this.charToIndexMap[symbol] = index;
        });
        this.symbolsNeeded = Math.ceil(Math.log(this.preEncoder.symbolCount) / Math.log(this.symbols.length));
    }

    encode(asciiText) {
        if (!asciiText) {
            throw new Error("asciiText is null");
        }
        if (!this.isExtendedAscii(asciiText)) {
            throw new Error("Expected standard Ascii and extended Ascii format.");
        }

        let inputValues = this.preEncoder.encode(asciiText);
        let encodedString = '';
        inputValues.forEach(inputValue => {
            let v = inputValue;
            for (let i = 0; i < this.symbolsNeeded; i++) {
                encodedString += this.symbols[v % this.symbols.length];
                v = Math.floor(v / this.symbols.length);
            }
        });

        return encodedString;
    }

    decode(encodedText) {
        let outputs = [];
        for (let i = 0; i < encodedText.length; i += this.symbolsNeeded) {
            let output = 0;
            for (let j = 0; j < this.symbolsNeeded; j++) {
                let index = this.charToIndexMap[encodedText.charAt(i + j)];
                if (index !== undefined) {
                    output += index * Math.pow(this.symbols.length, j);
                } else {
                    throw new Error(`Encoded text contains an invalid character: ${encodedText.charAt(i + j)}`);
                }
            }
            outputs.push(output);
        }
        return this.preEncoder.decode(outputs);
    }

    isExtendedAscii(text) {
        return [...text].every(c => c.charCodeAt(0) <= 255);
    }
}
