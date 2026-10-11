package config

import "testing"

func TestConfig_endpoint_matches_environment(t *testing.T) {
	for _, tc := range []struct{ env, cluster, url string }{
		{"", "localnet", "http://127.0.0.1:8899"},
		{"local", "localnet", "http://127.0.0.1:8899"},
		{"online", "testnet", "https://api.testnet.solana.com"},
	} {
		t.Run(tc.env, func(t *testing.T) {
			c, err := Parse(nil, func(key string) string {
				if key == "APP_ENV" {
					return tc.env
				}
				return ""
			})
			if err != nil || c.Cluster != tc.cluster || c.RPCURL != tc.url {
				t.Fatalf("got %+v, %v", c, err)
			}
		})
	}
}
func TestConfig_explicit_overrides_environment(t *testing.T) {
	env := map[string]string{"APP_ENV": "online", "SOLANA_CLUSTER": "devnet", "SOLANA_RPC_URL": "https://env.example.test"}
	c, err := Parse([]string{"-env", "local", "-cluster", "testnet", "-rpc-url", "https://flag.example.test"}, func(k string) string { return env[k] })
	if err != nil || c.Environment != "local" || c.Cluster != "testnet" || c.RPCURL != "https://flag.example.test" {
		t.Fatalf("got %+v, %v", c, err)
	}
	c, err = Parse(nil, func(k string) string { return env[k] })
	if err != nil || c.Cluster != "devnet" || c.RPCURL != env["SOLANA_RPC_URL"] {
		t.Fatalf("got %+v, %v", c, err)
	}
	c, err = Parse([]string{"-cluster", "devnet"}, func(string) string { return "" })
	if err != nil || c.RPCURL != "https://api.devnet.solana.com" {
		t.Fatalf("got %+v, %v", c, err)
	}
}
func TestConfig_rejects_invalid_settings(t *testing.T) {
	for _, args := range [][]string{{"-env", "production"}, {"-cluster", "mainnet"}, {"-rpc-url", "file:///tmp/rpc"}, {"-rpc-url", "https://"}, {"-unknown"}} {
		if _, err := Parse(args, func(string) string { return "" }); err == nil {
			t.Fatalf("accepted %v", args)
		}
	}
}
