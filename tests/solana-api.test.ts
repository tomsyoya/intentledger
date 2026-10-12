import test from "node:test";
import assert from "node:assert/strict";
import { createSolanaAPI } from "../src/api/solana.ts";
const address = "11111111111111111111111111111111";
test("rpc_balance_posts_directly_and_preserves_uint64", async () => {
 const api = createSolanaAPI("https://api.testnet.solana.com", async (url, init) => {
 assert.equal(String(url), "https://api.testnet.solana.com/");
 assert.equal(init?.method, "POST");
 const body = JSON.parse(String(init?.body));
 assert.equal(body.method, "getBalance");
 assert.deepEqual(body.params, [address, {commitment:"confirmed"}]);
 return new Response('{"jsonrpc":"2.0","id":'+body.id+',"result":{"context":{"slot":9007199254740993},"value":18446744073709551615}}');
 }, "testnet");
 const result = await api.balance(address);
 assert.equal(result.data.lamports,"18446744073709551615");
 assert.equal(result.data.sol,"18446744073.709551615");
 assert.equal(result.data.slot,"9007199254740993");
 assert.equal(result.cluster,"testnet");
});
test("rpc_rejects_invalid_input_before_fetch", async () => {
 const api = createSolanaAPI("http://127.0.0.1:8899",async()=>{throw Error("must not fetch")}, "localnet");
 await assert.rejects(api.balance("invalid"), /address/i);
 await assert.rejects(api.transaction("abc"), /signature/i);
 assert.throws(()=>createSolanaAPI("file:///tmp/rpc"), /HTTP/);
});
test("rpc_handles_null_transaction_rpc_errors_and_malformed_data", async () => {
 for (const result of [null, {slot:-1}]) {
 const api = createSolanaAPI("https://api.testnet.solana.com",async(_,init)=>Response.json({jsonrpc:"2.0", id:JSON.parse(String(init?.body)).id,result}));
 await assert.rejects(api.transaction("1".repeat(64)),result === null ? /not found/i : /invalid response/i);
 }
 const api = createSolanaAPI("https://api.testnet.solana.com",async(_,init)=>Response.json({jsonrpc:"2.0",id:JSON.parse(String(init?.body)).id,error:{code:-32602,message:"Invalid params"}}));
 await assert.rejects(api.balance(address), /RPC error/);
});
test("rpc_network_failure_mentions_cors_without_fixture_fallback", async () => {
 const api = createSolanaAPI("https://api.testnet.solana.com", async()=>{throw TypeError("Failed to fetch")});
 await assert.rejects(api.balance(address), /CORS/);
});
test("rpc_transaction_preserves_original_json_and_execution", async () => {
 const api = createSolanaAPI("https://api.testnet.solana.com",async(_,init)=>{
 const body=JSON.parse(String(init?.body));
 assert.equal(body.method,"getTransaction");
 assert.equal(body.params[1].encoding,"jsonParsed");
 return new Response('{"jsonrpc":"2.0","id":'+body.id+',"result":{"slot":9007199254740993,"blockTime":null,"version":0,"meta":{"err":null,"fee":5000}}}');
 });
 const r=await api.transaction("1".repeat(64));
 assert.equal(r.data.status,"confirmed");
 assert.equal(r.data.feeLamports,"5000");
 assert.match(r.data.rawJSON,/9007199254740993/);
});
