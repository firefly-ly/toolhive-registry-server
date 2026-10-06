package auth

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestSSOValidator_Success(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			t.Errorf("expected GET, got %s", r.Method)
		}
		if got := r.Header.Get("accesstoken"); got != "AT-test-token" {
			t.Errorf("expected accesstoken header AT-test-token, got %q", got)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"errorCode":"0","errorMsg":"OK","version":"RSA1.0","timestamp":0,"data":"sysadmin"}`))
	}))
	defer srv.Close()

	v := newSSOValidator(srv.URL, "http://sso.example")
	claims, err := v.ValidateToken(context.Background(), "AT-test-token")
	if err != nil {
		t.Fatalf("expected success, got error: %v", err)
	}
	if claims["sub"] != "sysadmin" {
		t.Errorf("expected sub=sysadmin, got %v", claims["sub"])
	}
	if claims["iss"] != "http://sso.example" {
		t.Errorf("expected iss=http://sso.example, got %v", claims["iss"])
	}
}

func TestSSOValidator_TokenRejected(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"errorCode":"110","errorMsg":"access token invalid","version":"RSA1.0","timestamp":0}`))
	}))
	defer srv.Close()

	v := newSSOValidator(srv.URL, "http://sso.example")
	if _, err := v.ValidateToken(context.Background(), "AT-bad"); err == nil {
		t.Fatal("expected error for rejected token, got nil")
	}
}

func TestSSOValidator_EmptySubjectInSuccessResponse(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"errorCode":"0","errorMsg":"OK","data":""}`))
	}))
	defer srv.Close()

	v := newSSOValidator(srv.URL, "http://sso.example")
	if _, err := v.ValidateToken(context.Background(), "AT-x"); err == nil {
		t.Fatal("expected error for success response without subject, got nil")
	}
}

func TestSSOValidator_Non200Status(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
	}))
	defer srv.Close()

	v := newSSOValidator(srv.URL, "http://sso.example")
	if _, err := v.ValidateToken(context.Background(), "AT-x"); err == nil {
		t.Fatal("expected error for non-200 response, got nil")
	}
}

func TestSSOValidator_MalformedJSON(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`not-json`))
	}))
	defer srv.Close()

	v := newSSOValidator(srv.URL, "http://sso.example")
	if _, err := v.ValidateToken(context.Background(), "AT-x"); err == nil {
		t.Fatal("expected error for malformed JSON, got nil")
	}
}

func TestSSOValidator_UnreachableEndpoint(t *testing.T) {
	t.Parallel()
	// Close a server immediately so its port is guaranteed unbound.
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	url := srv.URL
	srv.Close()

	v := newSSOValidator(url, "http://sso.example")
	if _, err := v.ValidateToken(context.Background(), "AT-x"); err == nil {
		t.Fatal("expected error for unreachable endpoint, got nil")
	}
}

func TestSSOValidator_EmptyToken(t *testing.T) {
	t.Parallel()
	v := newSSOValidator("http://sso.example/check", "http://sso.example")
	if _, err := v.ValidateToken(context.Background(), ""); err == nil {
		t.Fatal("expected error for empty token, got nil")
	}
}
