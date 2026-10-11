package config

import (
	"errors"
	"flag"
	"io"
	"net/url"
)

type Config struct {
	Environment    string
	Cluster        string
	RPCURL         string
	Listen         string
	AllowedOrigins string
}

// Parse resolves flags > environment variables > environment-specific defaults.
func Parse(args []string, getenv func(string) string) (Config, error) {
	fallback := func(key, value string) string {
		if v := getenv(key); v != "" {
			return v
		}
		return value
	}
	c := Config{}
	fs := flag.NewFlagSet("intentledger-api", flag.ContinueOnError)
	fs.SetOutput(io.Discard)
	fs.StringVar(&c.Environment, "env", fallback("APP_ENV", "local"), "Deployment environment: local or online (APP_ENV)")
	fs.StringVar(&c.Cluster, "cluster", getenv("SOLANA_CLUSTER"), "Network override: localnet, devnet or testnet (SOLANA_CLUSTER)")
	fs.StringVar(&c.RPCURL, "rpc-url", getenv("SOLANA_RPC_URL"), "RPC URL override (SOLANA_RPC_URL)")
	fs.StringVar(&c.Listen, "listen", fallback("HTTP_LISTEN", "127.0.0.1:8080"), "HTTP listen address (HTTP_LISTEN)")
	fs.StringVar(&c.AllowedOrigins, "allowed-origins", fallback("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"), "Comma-separated exact browser origins (ALLOWED_ORIGINS)")
	if err := fs.Parse(args); err != nil {
		return c, err
	}
	if fs.NArg() != 0 {
		return c, errors.New("unexpected positional arguments")
	}
	if c.Environment != "local" && c.Environment != "online" {
		return c, errors.New("env must be local or online")
	}
	if c.Cluster == "" {
		c.Cluster = "localnet"
		if c.Environment == "online" {
			c.Cluster = "testnet"
		}
	}
	endpoints := map[string]string{"localnet": "http://127.0.0.1:8899", "devnet": "https://api.devnet.solana.com", "testnet": "https://api.testnet.solana.com"}
	endpoint, ok := endpoints[c.Cluster]
	if !ok {
		return c, errors.New("cluster must be localnet, devnet or testnet")
	}
	if c.RPCURL == "" {
		c.RPCURL = endpoint
	}
	u, err := url.Parse(c.RPCURL)
	if err != nil || u.Hostname() == "" || (u.Scheme != "http" && u.Scheme != "https") || u.User != nil || u.Fragment != "" {
		return c, errors.New("rpc-url must be an absolute HTTP(S) URL without credentials or fragment")
	}
	return c, nil
}
