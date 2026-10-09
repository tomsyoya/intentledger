package solana

import (
	"context"
	"flag"
	"testing"
	"time"
)

var liveRPC = flag.Bool("live-rpc", false, "Run optional read-only public devnet smoke test")

func TestClient_live_devnet_reads(t *testing.T) {
	if !*liveRPC {
		t.Skip("opt-in live devnet read; use -args -live-rpc")
	}
	client, err := NewClient(DevnetURL, nil)
	if err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 25*time.Second)
	defer cancel()
	balance, err := client.GetBalance(ctx, address)
	if err != nil {
		t.Fatal(err)
	}
	t.Logf("devnet balance: %s SOL at slot %s", balance.SOL, balance.Slot)
	history, err := client.GetSignatures(ctx, address, 1)
	if err != nil {
		t.Fatal(err)
	}
	if len(history) == 0 {
		t.Log("no retained signatures for the system program account")
		return
	}
	tx, err := client.GetTransaction(ctx, history[0].Signature)
	if err != nil {
		t.Fatal(err)
	}
	t.Logf("devnet transaction: status=%s, slot=%s, version=%s", tx.Status, tx.Slot, tx.Version)
}
