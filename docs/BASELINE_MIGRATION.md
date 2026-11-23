# Baseline Migration Record

- Source: Lovable project `f562626c-3746-4e70-9a8b-285346413ffc`
- Verified source commit: `a52eb0c379acc75f61ff40f15cdcd3c8c34bf432`
- GitHub baseline commit: `307a6ac4b90c3bc2c786f529d7166105266c32c4`
- Development authority: GitHub
- Lovable role: preview and validation only
- Lovable `.env` was intentionally excluded.
- Known critical baseline defect: BCP/DRP data uses browser-wide localStorage key `bcp-prototype-db-v2`; remediation is isolated to `fix/workspace-data-isolation`.
