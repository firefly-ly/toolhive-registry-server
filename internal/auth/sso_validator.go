package auth

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// ssoValidator validates opaque access tokens against the company SSO's
// non-standard checkAccessToken endpoint:
//
//	GET <checkURL>           (token passed in the "accesstoken" request header)
//	success: {"errorCode":"0", "errorMsg":"OK", ..., "data":"<uid>"}
//	failure: {"errorCode":"110", "errorMsg":"access token invalid", ...}
//
// This differs from RFC 7662 token introspection (POST + form-encoded
// "token" parameter + {"active":bool} response), so the stock introspection
// flow cannot be used for this provider.
//
// Validation is a live remote call per request: revocation takes effect
// immediately (the endpoint exists precisely for unified-logout scenarios),
// at the cost of one HTTP round-trip to the SSO per authenticated request.
// No caching of results is done on purpose — caching would defer revocation.
type ssoValidator struct {
	// checkURL is the full URL of the checkAccessToken endpoint.
	checkURL string
	// issuer is recorded into the claims (iss) so downstream identity/authz
	// code can tell which provider produced them.
	issuer string
	client *http.Client
}

func newSSOValidator(checkURL, issuer string) *ssoValidator {
	return &ssoValidator{
		checkURL: checkURL,
		issuer:   issuer,
		client:   &http.Client{Timeout: 5 * time.Second},
	}
}

// ssoCheckResponse models the company SSO checkAccessToken response envelope.
type ssoCheckResponse struct {
	ErrorCode string `json:"errorCode"`
	ErrorMsg  string `json:"errorMsg"`
	Data      string `json:"data"`
}

func (v *ssoValidator) ValidateToken(ctx context.Context, token string) (jwt.MapClaims, error) {
	if token == "" {
		return nil, fmt.Errorf("sso: empty token")
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, v.checkURL, nil)
	if err != nil {
		return nil, fmt.Errorf("sso: build request: %w", err)
	}
	req.Header.Set("accesstoken", token)

	resp, err := v.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("sso: check request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("sso: check endpoint returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, 64<<10))
	if err != nil {
		return nil, fmt.Errorf("sso: read response: %w", err)
	}

	var parsed ssoCheckResponse
	if err := json.Unmarshal(body, &parsed); err != nil {
		return nil, fmt.Errorf("sso: parse response: %w", err)
	}

	// errorCode "0" = valid; anything else (e.g. "110" invalid token) = reject.
	if parsed.ErrorCode != "0" {
		return nil, fmt.Errorf("sso: token rejected (errorCode=%s errorMsg=%s)", parsed.ErrorCode, parsed.ErrorMsg)
	}
	if parsed.Data == "" {
		return nil, fmt.Errorf("sso: token accepted but response carries no subject (data field empty)")
	}

	return jwt.MapClaims{
		"iss":                v.issuer,
		"sub":                parsed.Data,
		"preferred_username": parsed.Data,
	}, nil
}
