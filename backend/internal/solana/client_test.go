package solana

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"testing"
)

const address = "11111111111111111111111111111111"

var signature = strings.Repeat("1", 64)

type transportFunc func(*http.Request) (*http.Response, error)

func (f transportFunc) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }
func testClient(t *testing.T, reply string, inspect func(map[string]interface{})) *Client {
	t.Helper()
	c, err := NewClient("https://api.devnet.solana.com", &http.Client{Transport: transportFunc(func(r *http.Request) (*http.Response, error) {
		if r.Method != "POST" || r.Header.Get("Content-Type") != "application/json" {
			t.Fatalf("unexpected RPC request: %s", r.Method)
		}
		var body map[string]interface{}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Fatal(err)
		}
		if body["jsonrpc"] != "2.0" || body["id"] != float64(1) {
			t.Fatalf("invalid envelope: %#v", body)
		}
		if inspect != nil {
			inspect(body)
		}
		return &http.Response{StatusCode: 200, Body: io.NopCloser(strings.NewReader(reply)), Header: make(http.Header)}, nil
	})})
	if err != nil {
		t.Fatal(err)
	}
	return c
}
func TestClient_balance_preserves_uint64_precision(t *testing.T) {
	c := testClient(t, `{"jsonrpc":"2.0","id":1,"result":{"context":{"slot":9007199254740993},"value":18446744073709551615}}`, func(body map[string]interface{}) {
		if body["method"] != "getBalance" {
			t.Fatal(body)
		}
		params := body["params"].([]interface{})
		if params[0] != address || params[1].(map[string]interface{})["commitment"] != "confirmed" {
			t.Fatal(params)
		}
	})
	balance, err := c.GetBalance(context.Background(), address)
	if err != nil {
		t.Fatal(err)
	}
	if balance.Lamports != "18446744073709551615" || balance.SOL != "18446744073.709551615" || balance.Slot != "9007199254740993" {
		t.Fatalf("precision lost: %#v", balance)
	}
}
func TestClient_validation_rejects_invalid_input_before_rpc(t *testing.T) {
	c := testClient(t, "", func(_ map[string]interface{}) { t.Fatal("invalid input reached RPC") })
	for _, value := range []string{"", "abc", strings.Repeat("1", 33), strings.Repeat("z", 44), "0" + address} {
		if _, err := c.GetBalance(context.Background(), value); !errors.Is(err, ErrInvalidInput) {
			t.Errorf("address %q: %v", value, err)
		}
	}
	if _, err := c.GetTransaction(context.Background(), "bad-signature"); !errors.Is(err, ErrInvalidInput) {
		t.Fatal(err)
	}
	for _, limit := range []int{0, 101, -1} {
		if _, err := c.GetSignatures(context.Background(), address, limit); !errors.Is(err, ErrInvalidInput) {
			t.Fatal(err)
		}
	}
}
func TestClient_envelope_rejects_invalid_rpc_responses(t *testing.T) {
	replies := []string{`{`, `{"jsonrpc":"2.0","id":2,"result":{}}`, `{"jsonrpc":"1.0","id":1,"result":{}}`, `{"jsonrpc":"2.0","id":1}`, `{"jsonrpc":"2.0","id":1,"result":null}`, `{"jsonrpc":"2.0","id":1,"result":{"context":{"slot":1},"value":1.5}}`, `{"jsonrpc":"2.0","id":1,"result":{"value":0}}`, `{"jsonrpc":"2.0","id":1,"result":{"context":{"slot":1},"value":18446744073709551616}}`, `{"jsonrpc":"2.0","id":1,"result":{"context":{"slot":1},"value":0},"error":{"code":-1,"message":"contradictory"}}`, strings.Repeat(" ", 2*1024*1024+1)}
	for _, reply := range replies {
		c := testClient(t, reply, nil)
		if _, err := c.GetBalance(context.Background(), address); !errors.Is(err, ErrInvalidResponse) {
			t.Errorf("expected malformed response rejection, got %v", err)
		}
	}
}
func TestClient_rpc_error_and_transport_failures_are_distinct(t *testing.T) {
	c := testClient(t, `{"jsonrpc":"2.0","id":1,"error":{"code":-32005,"message":"node unhealthy"}}`, nil)
	_, err := c.GetBalance(context.Background(), address)
	var rpcErr *RPCError
	if !errors.As(err, &rpcErr) || rpcErr.Code != -32005 {
		t.Fatal(err)
	}
	for _, status := range []int{429, 503} {
		c, _ = NewClient("https://api.devnet.solana.com", &http.Client{Transport: transportFunc(func(*http.Request) (*http.Response, error) {
			return &http.Response{StatusCode: status, Body: io.NopCloser(strings.NewReader("provider details"))}, nil
		})})
		_, err = c.GetBalance(context.Background(), address)
		expected := ErrUpstream
		if status == 429 {
			expected = ErrRateLimited
		}
		if !errors.Is(err, expected) {
			t.Fatal(err)
		}
	}
	c, _ = NewClient("https://api.devnet.solana.com", &http.Client{Transport: transportFunc(func(*http.Request) (*http.Response, error) { return nil, context.DeadlineExceeded })})
	if _, err = c.GetBalance(context.Background(), address); !errors.Is(err, context.DeadlineExceeded) {
		t.Fatal(err)
	}
}
func TestClient_signatures_support_empty_history_and_failed_transactions(t *testing.T) {
	c := testClient(t, `{"jsonrpc":"2.0","id":1,"result":[{"signature":"`+signature+`","slot":123,"err":{"InstructionError":[0,"Custom"]},"memo":null,"blockTime":null,"confirmationStatus":"confirmed"}]}`, func(body map[string]interface{}) {
		if body["method"] != "getSignaturesForAddress" {
			t.Fatal(body)
		}
		config := body["params"].([]interface{})[1].(map[string]interface{})
		if config["limit"] != float64(10) || config["commitment"] != "confirmed" {
			t.Fatal(config)
		}
	})
	rows, err := c.GetSignatures(context.Background(), address, 10)
	if err != nil || len(rows) != 1 || rows[0].Slot != "123" || rows[0].BlockTime != nil {
		t.Fatalf("%#v %v", rows, err)
	}
	c = testClient(t, `{"jsonrpc":"2.0","id":1,"result":[]}`, nil)
	rows, err = c.GetSignatures(context.Background(), address, 10)
	if err != nil || rows == nil || len(rows) != 0 {
		t.Fatalf("%#v %v", rows, err)
	}
	c = testClient(t, `{"jsonrpc":"2.0","id":1,"result":null}`, nil)
	if _, err = c.GetSignatures(context.Background(), address, 10); !errors.Is(err, ErrInvalidResponse) {
		t.Fatal(err)
	}
}
func TestClient_transaction_requests_jsonParsed_v1_and_preserves_raw_json(t *testing.T) {
	reply := `{"jsonrpc":"2.0","id":1,"result":{"slot":9007199254740993,"blockTime":null,"version":1,"meta":{"fee":5000,"err":null},"transaction":{"signatures":["` + signature + `"],"message":{"accountKeys":[],"transactionConfig":{"computeUnitLimit":30000}}}}}`
	c := testClient(t, reply, func(body map[string]interface{}) {
		if body["method"] != "getTransaction" {
			t.Fatal(body)
		}
		config := body["params"].([]interface{})[1].(map[string]interface{})
		if config["maxSupportedTransactionVersion"] != float64(1) || config["encoding"] != "jsonParsed" || config["commitment"] != "confirmed" {
			t.Fatal(config)
		}
	})
	tx, err := c.GetTransaction(context.Background(), signature)
	if err != nil {
		t.Fatal(err)
	}
	if tx.Status != "confirmed" || tx.Slot != "9007199254740993" || tx.FeeLamports == nil || *tx.FeeLamports != "5000" || !strings.Contains(tx.RawJSON, "9007199254740993") {
		t.Fatalf("%#v", tx)
	}
}
func TestClient_transaction_handles_null_failed_and_unknown_meta(t *testing.T) {
	c := testClient(t, `{"jsonrpc":"2.0","id":1,"result":null}`, nil)
	if _, err := c.GetTransaction(context.Background(), signature); !errors.Is(err, ErrNotFound) {
		t.Fatal(err)
	}
	for _, tt := range []struct{ meta, status string }{{`{"fee":5000,"err":{"InstructionError":[0,"Custom"]}}`, "failed"}, {`null`, "unknown"}} {
		c = testClient(t, `{"jsonrpc":"2.0","id":1,"result":{"slot":1,"blockTime":null,"version":"legacy","meta":`+tt.meta+`,"transaction":{"signatures":["`+signature+`"],"message":{}}}}`, nil)
		tx, err := c.GetTransaction(context.Background(), signature)
		if err != nil || tx.Status != tt.status {
			t.Fatalf("%#v %v", tx, err)
		}
	}
	c = testClient(t, `{"jsonrpc":"2.0","id":1,"result":{"slot":1,"meta":{"fee":5000},"transaction":{"signatures":["other"],"message":{}}}}`, nil)
	if _, err := c.GetTransaction(context.Background(), signature); !errors.Is(err, ErrInvalidResponse) {
		t.Fatal(err)
	}
}
func TestClient_endpoint_requires_http_url(t *testing.T) {
	for _, url := range []string{"file:///tmp/rpc", "not-a-url", "https://"} {
		if _, err := NewClient(url, nil); err == nil {
			t.Error(url)
		}
	}
}

func TestClient_metadata_rejects_invalid_errors_and_timestamps(t *testing.T) {
 for _,meta:=range []string{`{"fee":5000,"err":false}`,`{"fee":5000,"err":5}`} {
  c:=testClient(t,`{"jsonrpc":"2.0","id":1,"result":{"slot":1,"version":0,"meta":`+meta+`,"transaction":{"signatures":["`+signature+`"],"message":{}}}}`,nil)
  if _,err:=c.GetTransaction(context.Background(),signature);!errors.Is(err,ErrInvalidResponse){t.Fatalf("invalid meta accepted: %v",err)}
 }
 c:=testClient(t,`{"jsonrpc":"2.0","id":1,"result":[{"signature":"`+signature+`","slot":1,"err":null,"memo":null,"blockTime":9223372036854775807,"confirmationStatus":"confirmed"}]}`,nil)
 if _,err:=c.GetSignatures(context.Background(),address,1);!errors.Is(err,ErrInvalidResponse){t.Fatal("unsafe timestamp accepted")}
}
