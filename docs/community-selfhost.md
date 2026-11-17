# Embedded community (Rocket.Chat) — self-host runbook

Status: **parked — revisit January.** Full runbook written; deliberately not
built. Whether an embedded community benefits users at all — and if so, self-host
vs. managed — is deferred to the January ND Riot future-direction conversation,
to avoid a significant discovery/ops investment before the benefit is proven.
Kept as-is so that conversation starts from a real plan, not a blank page. The
original plan: embedded creator community, gated to the current roster; server
stands up by hand (this doc), ND Riot integration built after against the live
box.

Last reviewed: 2026-11-17.

---

## The principle

**ND Riot owns the identity gate; Rocket.Chat owns the conversation.**

Nobody registers on the chat server directly. The only way in is through an ND
Riot endpoint that checks the signed-in person against the ownership map and a
Studio-controlled allow-list. Flip someone on in Studio, they're in; flip them
off, they're out. The chat server never has its own front door.

This is the same gate pattern as `ADMIN_EMAILS` — a trusted check that lives in
ND Riot, not a second account system to keep in sync.

**Two hosts, don't confuse them:** `chat.ndriot.com` is the Rocket.Chat server
(this runbook). `ndriot.com/community` is the ND Riot page that embeds it. Google
sign-in only ever happens on the main ND Riot domain — **never** on `chat.*`, and
`chat.ndriot.com` is never added to Google's authorized redirect URIs.

## Scope (beta)

- **Who:** today's creators, plus anyone allowed via Studio/admin action. Readers
  are **not** in scope yet (that waits on the reader-identity question).
- **What:** open, server-visible channels — deliberately moderatable, so the
  community can self-police and the admin can step in. **No end-to-end-encrypted
  DMs** as the private layer; E2EE is unmoderatable and fights the public model.
- **How long:** beta until the LLC + legal steps (January). Re-evaluate self-host
  vs. managed then — a managed host trades monthly ops for dollars once there's
  an entity to hold the contract.

---

## Prerequisites

- A small VPS (see sizing).
- A subdomain: `chat.ndriot.com`.
- Docker + Docker Compose on the box.
- DNS access (currently HostGator). **Only a new A record is added — MX, `mail`,
  SPF, and DKIM are never touched.** Email depends on those.

## Sizing

Beta roster is well under 50 concurrent, so this is small. The official floor is
1 vCPU / 2 GB / 40 GB, but 2 GB is tight in practice.

- **Target: 2 vCPU · 4 GB RAM · 40–80 GB SSD.**
- **Hetzner CX22** (2 vCPU / 4 GB / 40 GB, ~€5–6/mo) is the value pick; a
  DigitalOcean/Linode 4 GB instance (~$24/mo) is the more hand-held option.

Current stack line: Node 22 / **MongoDB 8.0** / Rocket.Chat 8.x. MongoDB **must
run as a replica set even single-node** — Rocket.Chat tails its oplog; a
one-member `rs0` is fine.

---

## Step 1 — Provision the box

1. Create the VPS (Ubuntu LTS).
2. Non-root sudo user; SSH key auth; disable password login.
3. Firewall: allow **22, 80, 443** only. **Do not expose 3000 (Rocket.Chat) or
   27017 (Mongo)** — they're reached only inside Docker / via the reverse proxy.
4. Install Docker Engine + the Compose plugin.

## Step 2 — DNS

At HostGator, add **one** record:

```
A   chat   <VPS public IP>
```

That's it. Leave every mail-related record alone. The record moves cleanly when
DNS later goes to Cloudflare.

## Step 3 — Rocket.Chat + MongoDB (Docker Compose)

Don't hand-roll the compose. Start from the official
[`RocketChat/rocketchat-compose`](https://github.com/RocketChat/Docker.Official.Image)
set, and **pin the current image tag** (not `:latest`). The shape:

```yaml
services:
  rocketchat:
    image: rocketchat/rocket.chat:<PINNED_TAG>   # confirm current stable tag
    restart: unless-stopped
    environment:
      - ROOT_URL=https://chat.ndriot.com
      - PORT=3000
      - MONGO_URL=mongodb://mongo:27017/rocketchat?replicaSet=rs0
      - MONGO_OPLOG_URL=mongodb://mongo:27017/local?replicaSet=rs0
    depends_on:
      - mongo
    ports:
      - "127.0.0.1:3000:3000"   # bound to loopback; Caddy proxies in

  mongo:
    image: mongo:8.0
    restart: unless-stopped
    command: mongod --replSet rs0 --oplogSize 128
    volumes:
      - ./data/db:/data/db

  mongo-init-replica:
    image: mongo:8.0
    depends_on:
      - mongo
    command: >
      bash -c "until mongosh --host mongo --eval 'rs.initiate({_id:\"rs0\",members:[{_id:0,host:\"mongo:27017\"}]})'; do sleep 2; done"
```

Note: `ports` binds Rocket.Chat to **loopback only** — the outside world reaches
it through Caddy, never directly.

## Step 4 — Caddy (reverse proxy + automatic TLS)

Caddy gets Let's Encrypt certs automatically. `Caddyfile`:

```
chat.ndriot.com {
    reverse_proxy 127.0.0.1:3000
}
```

Run Caddy on the host (or as a container with 80/443 published). First request
provisions the cert.

## Step 5 — First-boot admin setup

Open `https://chat.ndriot.com` and:

1. Create the **admin** account (this is yours; it is not an ND Riot login).
2. **Admin → Accounts:** turn **Registration Form = Disabled**. This closes the
   front door — the gate endpoint becomes the only way in.
3. **Admin → Accounts → Iframe:** enable iframe integration; set **API URL** to
   the ND Riot endpoint (Step: ND Riot side), method **POST**, and an **Iframe
   URL** loading page. See the
   [iframe SSO docs](https://docs.rocket.chat/docs/iframe-integration).
4. Create the beta channels (open, not private/encrypted).
5. Generate an **admin personal access token** — the ND Riot endpoint uses it to
   find-or-create users. Store it as an ND Riot env var, never in the repo.

### Confirm two things here, before writing gate code

- **iframe SSO edition:** it reads as a standard Admin → Accounts setting with no
  enterprise gate, and historically it's Community-tier — but confirm it's
  enabled on your version (the way Mattermost's SSO turned out to be paywalled).
- **Community edition terms:** recent Rocket.Chat has workspace registration and
  some premium-feature limits. Almost certainly fine at this roster size; read
  the current terms so there's no surprise.

---

## The ND Riot side (built after the box is live)

This is the part that lives in this codebase — scoped, not yet built:

- **`/api/community/token`** — validates the NextAuth session → checks the
  ownership map (`src/sanity/ownership-client.ts`) + a Studio allow-list → if
  allowed, calls the Rocket.Chat admin API to find-or-create the user and return
  a login token; otherwise returns **401**.
- **`/community`** — a sign-in-gated route embedding the Rocket.Chat iframe.
- **Allow-list** — a field/role on the creator doc (or an admin list), read by
  the token endpoint. Same shape as `ADMIN_EMAILS`.
- **Env (Vercel + `.env.local`):** the Rocket.Chat base URL and admin token.
  Env-var changes need a manual Vercel redeploy.

Because the admin-API calls need the live server + token, this half is built and
verified against the running box — not shipped blind.

---

## Ongoing ops (the honest cost of self-host)

- **Backups:** scheduled `mongodump` to **off-box** storage. Test a restore once.
- **Updates:** Rocket.Chat moves fast; Mongo major-version bumps need care. Pin
  tags; upgrade deliberately.
- **Security:** keep the VPS patched; firewall stays tight (22/80/443 only).
- **Moderation:** you're the admin — set roles, a mute/report path, and who holds
  the keys. Open channels mean you *can* moderate; decide who does.
- **Monitoring:** basic uptime check on `chat.ndriot.com`.

Pre-LLC, all of the above sits on you personally. That's the reason the January
re-evaluation exists.
