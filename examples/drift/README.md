# Drift example

`catalog.yml` intentionally contradicts its structured `live` status. Run:

```bash
truthsync --path examples/drift --fail-on error
```

TruthSync reports the evidence line and exits with status 1.
