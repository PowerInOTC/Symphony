"use strict";
//import { wrapperOpenQuoteMM } from
Object.defineProperty(exports, "__esModule", { value: true });
exports.test = void 0;
const ethers_1 = require("ethers");
const blockchain_client_1 = require("@pionerfriends/blockchain-client");
const rpcURL = 'https://rpc.sonic.fantom.network/';
const rpcKey = '';
const provider = new ethers_1.ethers.JsonRpcProvider(`${rpcURL}${rpcKey}`);
const wallet1 = new ethers_1.ethers.Wallet('578c436136413ec3626d3451e89ce5e633b249677851954dff6b56fad50ac6fe', provider);
const wallet2 = new ethers_1.ethers.Wallet('b63a221a15a6e40e2a79449c0d05b9a1750440f383b0a41b4d6719d7611607b4', provider);
const blockchainInterface = new blockchain_client_1.BlockchainInterface(blockchain_client_1.networks.sonic.pionerChainId, wallet1);
async function test() {
    const pionerV1OpenDomain = (0, blockchain_client_1.getTypedDataDomain)(blockchain_client_1.contracts.PionerV1Open, blockchain_client_1.networks.sonic.pionerChainId);
    const openQuoteSignValue = {
        isLong: true,
        bOracleId: 0,
        price: ethers_1.ethers.parseUnits('50', 18),
        amount: ethers_1.ethers.parseUnits('10', 18),
        interestRate: ethers_1.ethers.parseUnits('1', 17),
        isAPayingAPR: true,
        frontEnd: wallet2.address,
        affiliate: wallet2.address,
        authorized: wallet1.address,
        nonce: 0,
    };
    const openQuoteSignType = {
        Quote: [
            { name: 'isLong', type: 'bool' },
            { name: 'bOracleId', type: 'uint256' },
            { name: 'price', type: 'uint256' },
            { name: 'amount', type: 'uint256' },
            { name: 'interestRate', type: 'uint256' },
            { name: 'isAPayingAPR', type: 'bool' },
            { name: 'frontEnd', type: 'address' },
            { name: 'affiliate', type: 'address' },
            { name: 'authorized', type: 'address' },
            { name: 'nonce', type: 'uint256' },
        ],
    };
    const openQuoteSignature = await wallet2.signTypedData(pionerV1OpenDomain, openQuoteSignType, openQuoteSignValue);
    const pionerV1wrapperDomain = (0, blockchain_client_1.getTypedDataDomain)(blockchain_client_1.contracts.PionerV1Wrapper, blockchain_client_1.networks.sonic.pionerChainId);
    const bOracleSignValue = {
        x: '0x20568a84796e6ade0446adfd2d8c4bba2c798c2af0e8375cc3b734f71b17f5fd',
        parity: 0,
        maxConfidence: ethers_1.ethers.parseUnits('1', 18),
        assetHex: ethers_1.ethers.encodeBytes32String('forex.EURUSD/forex.GBPUSD'),
        maxDelay: 600,
        precision: 5,
        imA: ethers_1.ethers.parseUnits('10', 16),
        imB: ethers_1.ethers.parseUnits('10', 16),
        dfA: ethers_1.ethers.parseUnits('25', 15),
        dfB: ethers_1.ethers.parseUnits('25', 15),
        expiryA: 60,
        expiryB: 60,
        timeLock: 1440 * 30 * 3,
        signatureHashOpenQuote: openQuoteSignature,
        nonce: 0,
    };
    const bOracleSignType = {
        bOracleSign: [
            { name: 'x', type: 'uint256' },
            { name: 'parity', type: 'uint8' },
            { name: 'maxConfidence', type: 'uint256' },
            { name: 'assetHex', type: 'bytes32' },
            { name: 'maxDelay', type: 'uint256' },
            { name: 'precision', type: 'uint256' },
            { name: 'imA', type: 'uint256' },
            { name: 'imB', type: 'uint256' },
            { name: 'dfA', type: 'uint256' },
            { name: 'dfB', type: 'uint256' },
            { name: 'expiryA', type: 'uint256' },
            { name: 'expiryB', type: 'uint256' },
            { name: 'timeLock', type: 'uint256' },
            { name: 'signatureHashOpenQuote', type: 'bytes' },
            { name: 'nonce', type: 'uint256' },
        ],
    };
    const signaturebOracleSign = await wallet2.signTypedData(pionerV1wrapperDomain, bOracleSignType, bOracleSignValue);
    const _acceptPrice = ethers_1.ethers.parseUnits('50', 18);
    const tx = await blockchainInterface.wrapperOpenQuoteMM(bOracleSignValue, signaturebOracleSign, openQuoteSignValue, openQuoteSignature, _acceptPrice);
    const receipt = await tx.wait();
    console.log(receipt);
}
exports.test = test;