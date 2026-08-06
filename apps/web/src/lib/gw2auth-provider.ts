import { createRemoteJWKSet, jwtVerify } from "jose";
import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers";

/**
 * GW2Auth OAuth2 provider (ADR-007, amended: GW2Auth instead of Discord).
 *
 * GW2Auth (https://gw2auth.com) is a plain OAuth2 authorization server for
 * the Guild Wars 2 community (not OIDC — there is no userinfo endpoint).
 * Endpoints below come from its published metadata:
 * https://gw2auth.com/.well-known/oauth-authorization-server
 *
 * All identity claims are embedded directly in the access token, which is
 * a signed JWT (see the GW2Auth Developer Guide,
 * https://github.com/gw2auth/oauth2-server/wiki/GW2Auth-Developer-Guide).
 * We verify and decode that JWT ourselves instead of calling a separate
 * userinfo endpoint.
 *
 * Registration is self-service at https://gw2auth.com/account/client — see
 * the README for the exact redirect URI to configure (127.0.0.1, not
 * localhost, per GW2Auth's requirement).
 */

const ISSUER = "https://gw2auth.com";
const AUTHORIZATION_ENDPOINT = "https://gw2auth.com/oauth2/authorize";
const TOKEN_ENDPOINT = "https://gw2auth.com/oauth2/token";
const JWKS_URI = "https://gw2auth.com/oauth2/jwks";

// API v1 scopes: stable user id, primary GW2 account display name and its
// verification status at GW2Auth. No `gw2:*` API-permission scopes are
// requested — we don't call the live GW2 API, only need identity.
const SCOPE = "id gw2acc:name gw2acc:display_name gw2acc:verified";

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;
function getJwks() {
  jwks ??= createRemoteJWKSet(new URL(JWKS_URI));
  return jwks;
}

interface Gw2AuthAccount {
  id: string;
  name: string;
  display_name: string | null;
  verified: boolean;
  token?: string;
  error?: string;
}

export interface Gw2AuthProfile {
  sub: string;
  gw2_accounts: Gw2AuthAccount[];
  scope: string[];
  aud: string;
  iss: string;
  exp: number;
}

export function GW2Auth(config: OAuthUserConfig<Gw2AuthProfile>): OAuthConfig<Gw2AuthProfile> {
  return {
    id: "gw2auth",
    name: "GW2Auth",
    type: "oauth",
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    authorization: {
      url: AUTHORIZATION_ENDPOINT,
      params: { scope: SCOPE },
    },
    token: TOKEN_ENDPOINT,
    checks: ["pkce", "state"],
    userinfo: {
      // GW2Auth has no real userinfo endpoint (see module docs); `url` is
      // a placeholder only to satisfy Auth.js's config validation, which
      // requires *some* url even when `request` fully overrides the
      // fetch behavior below.
      url: JWKS_URI,
      async request({ tokens }: { tokens: { access_token?: string } }) {
        if (!tokens.access_token) {
          throw new Error("GW2Auth token response is missing access_token");
        }
        const { payload } = await jwtVerify(tokens.access_token, getJwks(), {
          issuer: ISSUER,
        });
        return payload as unknown as Gw2AuthProfile;
      },
    },
    profile(profile) {
      const primaryAccount = profile.gw2_accounts.at(0);
      return {
        id: profile.sub,
        name: primaryAccount?.display_name || primaryAccount?.name || profile.sub,
        email: null,
        image: null,
        gw2AccountVerified: primaryAccount?.verified ?? false,
      };
    },
  };
}
