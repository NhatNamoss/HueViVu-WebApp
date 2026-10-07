# Token optimization setup

Installed on 2026-10-06:

- Codex skill: `C:/Users/LENOVO/.codex/skills/codex-token-optimizer` from `HelloWorld668/codex-token-optimizer`.
- RTK (Rust Token Killer): v0.50.0, installed using `winget install --id rtk-ai.rtk --exact`.
- Verified executable: `C:/Users/LENOVO/AppData/Local/Microsoft/WinGet/Packages/rtk-ai.rtk_Microsoft.Winget.Source_8wekyb3d8bbwe/rtk.exe`.

Use `rtk` from a fresh terminal, or invoke the executable above if PATH has not refreshed. The skill will be discoverable in a subsequent Codex turn; restart the app if necessary.

Useful explicit commands:

```powershell
rtk --version
rtk git status
rtk git diff
rtk err npm run test:types
rtk gain
```

No global automatic hook was installed. Explicit invocation avoids changing unrelated projects and global agent instructions. No Headroom proxy, Caveman, or Ponytail was installed in this setup.

Use compression for repetitive status/log output. Retrieve raw source or logs before an exact edit or a conclusion dependent on a missing detail. Required instructions must always be read completely.

RTK measures its own command-output compression. First verification: one git-status command estimated 25 input tokens versus 12 output tokens, saving 13 (52%). This is a tiny smoke check, not a project benchmark or a forecast of Plus five-hour savings.

For a useful comparison, record task type, model/effort/speed, allowance before/after without crossing a reset, completion quality, retries, and RTK gain delta. Evaluate several comparable tasks; keep the configuration only if total work and quality improve.
