// Package solana provides a small, read-only JSON-RPC adapter with no SDK dependency.
package solana

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

const DevnetURL = "https://api.devnet.solana.com"
const maxResponseBytes = 2 * 1024 * 1024
const Commitment = "confirmed"

var (
	ErrInvalidInput    = errors.New("invalid Solana address, signature or limit")
	ErrNotFound        = errors.New("transaction not found at requested commitment")
	ErrUpstream        = errors.New("RPC unavailable")
	ErrRateLimited     = errors.New("RPC rate limited")
	ErrInvalidResponse = errors.New("invalid RPC response")
)

type RPCError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

func (e *RPCError) Error() string { return fmt.Sprintf("Solana RPC error %d", e.Code) }

type Balance struct {
	Address  string `json:"address"`
	Lamports string `json:"lamports"`
	SOL      string `json:"sol"`
	Slot     string `json:"slot"`
}
type Signature struct {
	Signature          string          `json:"signature"`
	Slot               string          `json:"slot"`
	Err                json.RawMessage `json:"err"`
	Memo               *string         `json:"memo"`
	BlockTime          *int64          `json:"blockTime"`
	ConfirmationStatus *string         `json:"confirmationStatus"`
}
type Transaction struct {
	Signature   string          `json:"signature"`
	Slot        string          `json:"slot"`
	BlockTime   *int64          `json:"blockTime"`
	Status      string          `json:"status"`
	FeeLamports *string         `json:"feeLamports"`
	Version     json.RawMessage `json:"version"`
	// RawJSON is a string so downstream JSON parsers cannot round u64 values.
	RawJSON string `json:"rawJSON"`
}

type Client struct {
	endpoint string
	http     *http.Client
}

func NewClient(endpoint string, client *http.Client) (*Client, error) {
	parsed, err := url.Parse(endpoint)
	if err != nil || parsed.Hostname() == "" || (parsed.Scheme != "https" && parsed.Scheme != "http") || parsed.Fragment != "" {
		return nil, errors.New("RPC endpoint must be an absolute HTTP(S) URL")
	}
	if client == nil {
		client = &http.Client{Timeout: 10 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	}
	return &Client{endpoint: endpoint, http: client}, nil
}

func (c *Client) call(ctx context.Context, method string, params []interface{}, result interface{}) error {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	body, err := json.Marshal(struct {
		JSONRPC string        `json:"jsonrpc"`
		ID      int           `json:"id"`
		Method  string        `json:"method"`
		Params  []interface{} `json:"params"`
	}{"2.0", 1, method, params})
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.endpoint, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusTooManyRequests {
		return ErrRateLimited
	}
	if resp.StatusCode != http.StatusOK {
		return ErrUpstream
	}
	payload, err := io.ReadAll(io.LimitReader(resp.Body, maxResponseBytes+1))
	if err != nil {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		return ErrInvalidResponse
	}
	if len(payload) > maxResponseBytes {
		return ErrInvalidResponse
	}
	var envelope struct {
		JSONRPC string          `json:"jsonrpc"`
		ID      json.RawMessage `json:"id"`
		Result  json.RawMessage `json:"result"`
		Error   *RPCError       `json:"error"`
	}
	if json.Unmarshal(payload, &envelope) != nil || envelope.JSONRPC != "2.0" || !bytes.Equal(bytes.TrimSpace(envelope.ID), []byte("1")) {
		return ErrInvalidResponse
	}
	if envelope.Error != nil {
		if len(envelope.Result) != 0 {
			return ErrInvalidResponse
		}
		return envelope.Error
	}
	if len(envelope.Result) == 0 || json.Unmarshal(envelope.Result, result) != nil {
		return ErrInvalidResponse
	}
	return nil
}

func validBase58(value string, byteLength int) bool {
	if value == "" || len(value) > 88 {
		return false
	}
	const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
	number := new(big.Int)
	radix := big.NewInt(58)
	for i := 0; i < len(value); i++ {
		digit := strings.IndexByte(alphabet, value[i])
		if digit < 0 {
			return false
		}
		number.Mul(number, radix)
		number.Add(number, big.NewInt(int64(digit)))
	}
	zeroes := len(value) - len(strings.TrimLeft(value, "1"))
	return len(number.Bytes())+zeroes == byteLength
}

// RPC error fields may be an object, a string, or null; other JSON types are invalid.
func validExecutionError(raw json.RawMessage) bool {
	value := bytes.TrimSpace(raw)
	return bytes.Equal(value, []byte("null")) || (len(value) > 0 && (value[0] == '{' || value[0] == '"'))
}
func validBlockTime(value *int64) bool {
	return value == nil || (*value >= 0 && *value <= 8640000000000)
}
func formatSOL(lamports uint64) string {
	return strings.TrimRight(strings.TrimRight(fmt.Sprintf("%d.%09d", lamports/1000000000, lamports%1000000000), "0"), ".")
}
func (c *Client) GetBalance(ctx context.Context, address string) (*Balance, error) {
	if !validBase58(address, 32) {
		return nil, ErrInvalidInput
	}
	var result struct {
		Context *struct {
			Slot *uint64 `json:"slot"`
		} `json:"context"`
		Value *uint64 `json:"value"`
	}
	if err := c.call(ctx, "getBalance", []interface{}{address, map[string]interface{}{"commitment": Commitment}}, &result); err != nil {
		return nil, err
	}
	if result.Value == nil || result.Context == nil || result.Context.Slot == nil {
		return nil, ErrInvalidResponse
	}
	return &Balance{Address: address, Lamports: strconv.FormatUint(*result.Value, 10), SOL: formatSOL(*result.Value), Slot: strconv.FormatUint(*result.Context.Slot, 10)}, nil
}
func (c *Client) GetSignatures(ctx context.Context, address string, limit int) ([]Signature, error) {
	if !validBase58(address, 32) || limit < 1 || limit > 100 {
		return nil, ErrInvalidInput
	}
	var result []struct {
		Signature          string          `json:"signature"`
		Slot               *uint64         `json:"slot"`
		Err                json.RawMessage `json:"err"`
		Memo               *string         `json:"memo"`
		BlockTime          *int64          `json:"blockTime"`
		ConfirmationStatus *string         `json:"confirmationStatus"`
	}
	if err := c.call(ctx, "getSignaturesForAddress", []interface{}{address, map[string]interface{}{"commitment": Commitment, "limit": limit}}, &result); err != nil {
		return nil, err
	}
	if result == nil {
		return nil, ErrInvalidResponse
	}
	rows := make([]Signature, 0, len(result))
	if len(result) > limit {
		return nil, ErrInvalidResponse
	}
	for _, item := range result {
		if !validBase58(item.Signature, 64) || item.Slot == nil || !validExecutionError(item.Err) || !validBlockTime(item.BlockTime) {
			return nil, ErrInvalidResponse
		}
		if item.ConfirmationStatus != nil && *item.ConfirmationStatus != "confirmed" && *item.ConfirmationStatus != "finalized" {
			return nil, ErrInvalidResponse
		}
		rows = append(rows, Signature{Signature: item.Signature, Slot: strconv.FormatUint(*item.Slot, 10), Err: item.Err, Memo: item.Memo, BlockTime: item.BlockTime, ConfirmationStatus: item.ConfirmationStatus})
	}
	return rows, nil
}
func (c *Client) GetTransaction(ctx context.Context, signature string) (*Transaction, error) {
	if !validBase58(signature, 64) {
		return nil, ErrInvalidInput
	}
	var raw json.RawMessage
	if err := c.call(ctx, "getTransaction", []interface{}{signature, map[string]interface{}{"commitment": Commitment, "encoding": "jsonParsed", "maxSupportedTransactionVersion": 1}}, &raw); err != nil {
		return nil, err
	}
	if bytes.Equal(bytes.TrimSpace(raw), []byte("null")) {
		return nil, ErrNotFound
	}
	var result struct {
		Slot      *uint64         `json:"slot"`
		BlockTime *int64          `json:"blockTime"`
		Version   json.RawMessage `json:"version"`
		Meta      *struct {
			Fee *uint64         `json:"fee"`
			Err json.RawMessage `json:"err"`
		} `json:"meta"`
		Transaction *struct {
			Signatures []string        `json:"signatures"`
			Message    json.RawMessage `json:"message"`
		} `json:"transaction"`
	}
	if json.Unmarshal(raw, &result) != nil || result.Slot == nil || !validBlockTime(result.BlockTime) || result.Transaction == nil || len(result.Transaction.Signatures) == 0 || result.Transaction.Signatures[0] != signature || len(result.Transaction.Message) == 0 || bytes.TrimSpace(result.Transaction.Message)[0] != '{' {
		return nil, ErrInvalidResponse
	}
	version := bytes.TrimSpace(result.Version)
	if len(version) == 0 {
		version = json.RawMessage(`"legacy"`)
	}
	if !bytes.Equal(version, []byte(`"legacy"`)) && !bytes.Equal(version, []byte("0")) && !bytes.Equal(version, []byte("1")) {
		return nil, ErrInvalidResponse
	}
	tx := &Transaction{Signature: signature, Slot: strconv.FormatUint(*result.Slot, 10), BlockTime: result.BlockTime, Status: "unknown", Version: version, RawJSON: string(raw)}
	if result.Meta != nil {
		if result.Meta.Fee == nil || !validExecutionError(result.Meta.Err) {
			return nil, ErrInvalidResponse
		}
		fee := strconv.FormatUint(*result.Meta.Fee, 10)
		tx.FeeLamports = &fee
		tx.Status = "failed"
		if bytes.Equal(bytes.TrimSpace(result.Meta.Err), []byte("null")) {
			tx.Status = "confirmed"
		}
	}
	return tx, nil
}
