package config

import "testing"

func TestValidateProvider_SSOSkipsAudienceAndHTTPSEnforcement(t *testing.T) {
	t.Parallel()
	p := &OAuthProviderConfig{
		Name:        "company-sso",
		IssuerURL:   "http://iam.example.internal", // HTTP identifier, not fetched from
		SsoCheckURL: "http://iam.example.internal/esc-sso/api/v1/loginLog/checkAccessToken",
		// Audience intentionally empty — not required for SSO providers.
	}
	if err := p.validateProvider(0, false); err != nil {
		t.Fatalf("expected SSO provider to pass without audience and with HTTP issuer, got: %v", err)
	}
}

func TestValidateProvider_SSOInvalidCheckURL(t *testing.T) {
	t.Parallel()
	p := &OAuthProviderConfig{
		Name:        "company-sso",
		IssuerURL:   "http://iam.example.internal",
		SsoCheckURL: "not-a-url",
	}
	if err := p.validateProvider(0, false); err == nil {
		t.Fatal("expected error for invalid ssoCheckUrl, got nil")
	}
}

func TestValidateProvider_StandardProviderStillRequiresAudienceAndHTTPS(t *testing.T) {
	t.Parallel()
	// No ssoCheckUrl: audience still required.
	p := &OAuthProviderConfig{
		Name:      "casdoor",
		IssuerURL: "https://mcplogin.dongpeng.net",
	}
	if err := p.validateProvider(0, false); err == nil {
		t.Fatal("expected error for missing audience on standard provider, got nil")
	}

	// No ssoCheckUrl: HTTP issuer still rejected.
	p2 := &OAuthProviderConfig{
		Name:      "casdoor",
		IssuerURL: "http://iam.example.internal",
		Audience:  "client-id",
	}
	if err := p2.validateProvider(0, false); err == nil {
		t.Fatal("expected error for HTTP issuer on standard provider, got nil")
	}
}
