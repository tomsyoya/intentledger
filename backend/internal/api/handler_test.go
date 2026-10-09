package api

import (
 "context"
 "encoding/json"
 "io"
 "net/http"
 "net/http/httptest"
 "strings"
 "testing"
 "intentledger/backend/internal/solana"
)
type transportFunc func(*http.Request)(*http.Response,error)
func(f transportFunc) RoundTrip(r *http.Request)(*http.Response,error){return f(r)}
func handlerFor(t *testing.T, reply string, status int, failure error, calls *int) http.Handler{
 t.Helper();client,err:=solana.NewClient("https://api.devnet.solana.com",&http.Client{Transport:transportFunc(func(*http.Request)(*http.Response,error){*calls++;if failure!=nil{return nil,failure};return &http.Response{StatusCode:status,Body:io.NopCloser(strings.NewReader(reply))},nil})});if err!=nil{t.Fatal(err)}
 return NewHandler(client, Config{Cluster:"devnet",AllowedOrigins:[]string{"http://localhost:5173"}})
}
func request(h http.Handler,method,path,origin string)*httptest.ResponseRecorder{r:=httptest.NewRequest(method,path,nil);if origin!=""{r.Header.Set("Origin",origin)};w:=httptest.NewRecorder();h.ServeHTTP(w,r);return w}
func TestAPI_balance_returns_data_envelope_and_exact_amount(t *testing.T){
 calls:=0;h:=handlerFor(t,`{"jsonrpc":"2.0","id":1,"result":{"context":{"slot":123},"value":1000000001}}`,200,nil,&calls)
 w:=request(h,"GET","/api/v1/solana/balance?address=11111111111111111111111111111111","http://localhost:5173");if w.Code!=200 || calls!=1 || w.Header().Get("Access-Control-Allow-Origin")!="http://localhost:5173"{t.Fatalf("%d %s",w.Code,w.Body.String())}
 var result struct{Cluster string `json:"cluster"`;Data struct{Lamports string `json:"lamports"`;SOL string `json:"sol"`} `json:"data"`};if err:=json.Unmarshal(w.Body.Bytes(),&result);err!=nil{t.Fatal(err)}
 if result.Cluster!="devnet" || result.Data.Lamports!="1000000001" || result.Data.SOL!="1.000000001"{t.Fatal(w.Body.String())}
}
func TestAPI_validation_and_methods_never_reach_rpc(t *testing.T){
 calls:=0;h:=handlerFor(t,"",200,nil,&calls);cases:=[]struct{method,path string;status int}{{"GET","/api/v1/solana/balance",400},{"GET","/api/v1/solana/signatures?address=bad",400},{"GET","/api/v1/solana/signatures?address=11111111111111111111111111111111&limit=1000",400},{"GET","/api/v1/solana/signatures?address=11111111111111111111111111111111&limit=no",400},{"GET","/api/v1/solana/transactions/bad",400},{"POST","/api/v1/solana/balance",405},{"GET","/api/v1/solana/sendTransaction",404}}
 for _,tt:=range cases{w:=request(h,tt.method,tt.path,"");if w.Code!=tt.status{t.Errorf("%s: %d %s",tt.path,w.Code,w.Body.String())}};if calls!=0{t.Fatal("invalid requests reached RPC")}
}
func TestAPI_upstream_failures_are_structured_and_sanitized(t *testing.T){
 for _,tt:=range []struct{reply string;upstream int;failure error;want int;code string}{{`{"jsonrpc":"2.0","id":1,"error":{"code":-1,"message":"secret provider details"}}`,200,nil,502,"RPC_UNAVAILABLE"},{"",429,nil,503,"RPC_RATE_LIMITED"},{"",200,context.DeadlineExceeded,504,"RPC_TIMEOUT"},{"not-json",200,nil,502,"RPC_INVALID_RESPONSE"},{`{"jsonrpc":"2.0","id":1,"result":null}`,200,nil,404,"TRANSACTION_NOT_FOUND"}}{
  calls:=0;h:=handlerFor(t,tt.reply,tt.upstream,tt.failure,&calls);path:="/api/v1/solana/balance?address=11111111111111111111111111111111";if tt.want==404{path="/api/v1/solana/transactions/"+strings.Repeat("1",64)}
  w:=request(h,"GET",path,"");if w.Code!=tt.want || !strings.Contains(w.Body.String(),tt.code) || strings.Contains(w.Body.String(),"secret"){t.Fatalf("%d %s",w.Code,w.Body.String())}
 }
}
func TestAPI_cors_and_health_are_local_without_rpc(t *testing.T){
 calls:=0;h:=handlerFor(t,"",200,nil,&calls);w:=request(h,"GET","/api/v1/health","");if w.Code!=200 || !strings.Contains(w.Body.String(),`"status":"ok"`){t.Fatal(w.Body.String())}
 w=request(h,"OPTIONS","/api/v1/solana/balance","http://localhost:5173");if w.Code!=204 || w.Header().Get("Access-Control-Allow-Methods")!="GET, OPTIONS"{t.Fatal(w.Code,w.Header())}
 w=request(h,"GET","/api/v1/health","https://untrusted.example");if w.Code!=403 || w.Header().Get("Access-Control-Allow-Origin")!=""{t.Fatal(w.Code,w.Header())};if calls!=0{t.Fatal("CORS/health should not call RPC")}
}
func TestAPI_signatures_and_transaction_routes(t *testing.T){
 calls:=0;h:=handlerFor(t,`{"jsonrpc":"2.0","id":1,"result":[]}`,200,nil,&calls);w:=request(h,"GET","/api/v1/solana/signatures?address=11111111111111111111111111111111","");if w.Code!=200 || !strings.Contains(w.Body.String(),`"data":[]`){t.Fatal(w.Code,w.Body.String())}
 sig:=strings.Repeat("1",64);h=handlerFor(t,`{"jsonrpc":"2.0","id":1,"result":{"slot":1,"version":"legacy","meta":{"fee":5000,"err":null},"transaction":{"signatures":["`+sig+`"],"message":{}}}}`,200,nil,&calls)
 w=request(h,"GET","/api/v1/solana/transactions/"+sig,"");if w.Code!=200 || !strings.Contains(w.Body.String(),`"status":"confirmed"`){t.Fatal(w.Code,w.Body.String())}
}
