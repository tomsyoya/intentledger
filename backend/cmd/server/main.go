package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"intentledger/backend/internal/api"
	"intentledger/backend/internal/solana"
	"log"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"
)

func main() {
	if err := run(); err != nil {
		log.Fatal(err)
	}
}
func run() error {
	listen := flag.String("listen", "127.0.0.1:8080", "HTTP listen address")
	rpcURL := flag.String("rpc-url", solana.DevnetURL, "Solana devnet or localnet JSON-RPC endpoint")
	cluster := flag.String("cluster", "devnet", "Network label: devnet or localnet")
	origins := flag.String("allowed-origins", "http://localhost:5173,http://127.0.0.1:5173", "Comma-separated exact browser origins")
	flag.Parse()
	if *cluster != "devnet" && *cluster != "localnet" {
		return errors.New("cluster must be devnet or localnet")
	}
	allowed := []string{}
	for _, candidate := range strings.Split(*origins, ",") {
		candidate = strings.TrimSpace(candidate)
		if candidate == "" {
			continue
		}
		origin, err := url.Parse(candidate)
		if err != nil || origin.Hostname() == "" || (origin.Scheme != "https" && origin.Scheme != "http") || origin.User != nil || origin.RawQuery != "" || origin.Fragment != "" || origin.Path != "" {
			return errors.New("allowed-origins must contain exact HTTP(S) origins without paths")
		}
		allowed = append(allowed, candidate)
	}
	client, err := solana.NewClient(*rpcURL, nil)
	if err != nil {
		return err
	}
	server := &http.Server{Addr: *listen, Handler: api.NewHandler(client, api.Config{Cluster: *cluster, AllowedOrigins: allowed}), ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 10 * time.Second, WriteTimeout: 15 * time.Second, IdleTimeout: 60 * time.Second, MaxHeaderBytes: 16384}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	serverErrors := make(chan error, 1)
	go func() { serverErrors <- server.ListenAndServe() }()
	log.Printf("IntentLedger read-only API: http://%s (cluster: %s)", *listen, *cluster)
	select {
	case err := <-serverErrors:
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return fmt.Errorf("HTTP server: %w", err)
	case <-ctx.Done():
		shutdown, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		return server.Shutdown(shutdown)
	}
}
