// Package api exposes fixed, read-only Solana routes; it is not a generic RPC proxy.
package api

import (
	"context"
	"encoding/json"
	"errors"
	"intentledger/backend/internal/solana"
	"net"
	"net/http"
	"strconv"
	"strings"
)

type Config struct {
	Cluster        string
	AllowedOrigins []string
}
type handler struct {
	client *solana.Client
	config Config
}

func NewHandler(client *solana.Client, config Config) http.Handler {
	return &handler{client: client, config: config}
}
func writeJSON(w http.ResponseWriter, status int, value interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}
func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, map[string]interface{}{"error": map[string]string{"code": code, "message": message}})
}
func (h *handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Add("Vary", "Origin")
	origin := r.Header.Get("Origin")
	if origin != "" {
		allowed := false
		for _, candidate := range h.config.AllowedOrigins {
			if origin == candidate {
				allowed = true
				break
			}
		}
		if !allowed {
			writeError(w, 403, "ORIGIN_NOT_ALLOWED", "This browser origin is not allowed by the Go API.")
			return
		}
		w.Header().Set("Access-Control-Allow-Origin", origin)
	}
	if r.Method == http.MethodOptions {
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type")
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", "GET, OPTIONS")
		writeError(w, 405, "METHOD_NOT_ALLOWED", "Only read-only GET requests are supported.")
		return
	}
	var data interface{}
	var err error
	switch {
	case r.URL.Path == "/api/v1/health":
		data = map[string]string{"status": "ok"}
	case r.URL.Path == "/api/v1/solana/balance":
		data, err = h.client.GetBalance(r.Context(), r.URL.Query().Get("address"))
	case r.URL.Path == "/api/v1/solana/signatures":
		limit := 10
		if value, exists := r.URL.Query()["limit"]; exists {
			if len(value) != 1 || value[0] == "" {
				err = solana.ErrInvalidInput
			} else {
				limit, err = strconv.Atoi(value[0])
				if err != nil {
					err = solana.ErrInvalidInput
				}
			}
		}
		if err == nil {
			data, err = h.client.GetSignatures(r.Context(), r.URL.Query().Get("address"), limit)
		}
	case strings.HasPrefix(r.URL.Path, "/api/v1/solana/transactions/"):
		data, err = h.client.GetTransaction(r.Context(), strings.TrimPrefix(r.URL.Path, "/api/v1/solana/transactions/"))
	default:
		writeError(w, 404, "NOT_FOUND", "API route not found.")
		return
	}
	if err != nil {
		respondRPCError(w, err)
		return
	}
	writeJSON(w, 200, map[string]interface{}{"data": data, "cluster": h.config.Cluster, "commitment": solana.Commitment})
}
func respondRPCError(w http.ResponseWriter, err error) {
	var timeout net.Error
	switch {
	case errors.Is(err, solana.ErrInvalidInput):
		writeError(w, 400, "INVALID_INPUT", "Provide a valid base58 Solana address or signature and a limit between 1 and 100.")
	case errors.Is(err, solana.ErrNotFound):
		writeError(w, 404, "TRANSACTION_NOT_FOUND", "Transaction not found on this cluster at confirmed commitment. It may be pending or outside the node's retained history.")
	case errors.Is(err, solana.ErrRateLimited):
		w.Header().Set("Retry-After", "5")
		writeError(w, 503, "RPC_RATE_LIMITED", "Solana RPC is rate limited. Wait a few seconds and try again.")
	case errors.Is(err, context.DeadlineExceeded) || errors.Is(err, context.Canceled) || (errors.As(err, &timeout) && timeout.Timeout()):
		writeError(w, 504, "RPC_TIMEOUT", "Solana RPC timed out. Please try again.")
	case errors.Is(err, solana.ErrInvalidResponse):
		writeError(w, 502, "RPC_INVALID_RESPONSE", "Solana RPC returned an invalid response.")
	default:
		writeError(w, 502, "RPC_UNAVAILABLE", "Solana RPC is unavailable. Please try again later.")
	}
}
